const mongoose = require('mongoose');
const MarketingHouseItem = require('../../models/MarketingHouseItem');
const createCrudController = require('./crudFactory');
const { generateSlug } = require('../../utils/helpers');
const { uploadYoutubeThumbnailToS3, getYoutubeVideoId } = require('../../utils/s3Upload');
const { parseCsvOrExcel } = require('../../utils/helpers');

// Navigation targets reachable from a marketing item. Each entry maps a
// front-end route segment + label to the collection whose records belong to the
// item (all linked via `marketing_house_item_id`). The "Navigate To" column on
// the items table is driven by this config plus the live counts computed below,
// so options stay in sync with the actual sub-module collections rather than a
// hard-coded front-end list.
const NAV_TARGETS = [
  { segment: 'statics',                 label: 'Highlights',       model: require('../../models/MarketingHouseStatics') },
  { segment: 'images',                  label: 'Poster Media',     model: require('../../models/MarketingHouseImage') },
  { segment: 'idea-strategy',           label: 'Ideas Strategy',   model: require('../../models/MarketingHouseIdeaStrategyPlanning') },
  { segment: 'pre-launch',              label: 'Prelaunch',        model: require('../../models/MarketingHousePreLaunchActivity') },
  { segment: 'performance',             label: 'Performance',      model: require('../../models/MarketingHousePerformance') },
  { segment: 'other-activity-category', label: 'Other Act. Cat.',  model: require('../../models/MarketingHouseOtherActivityCategory') },
  { segment: 'other-activity-item',     label: 'Other Act. Items', model: require('../../models/MarketingHouseOtherActivityItem') },
  { segment: 'content-category',        label: 'Content Category', model: require('../../models/MarketingHouseContentCreatedCategory') },
  { segment: 'content-item',            label: 'Content Items',    model: require('../../models/MarketingHouseContentCreatedItem') },
  { segment: 'community-program',       label: 'Continuity Cat.',  model: require('../../models/MarketingHouseCommunityProgramCategory') },
  { segment: 'community-program-item',  label: 'Continuity Items', model: require('../../models/MarketingHouseCommunityProgramCategoryItem') },
  { segment: 'faq',                     label: 'FAQ',              model: require('../../models/Faq') },
];

// Compute the record count per navigation target for every item on the page and
// attach a `navigation` array ([{ segment, label, count }]) to each item.
// `marketing_house_item_id` is a Mixed field that may hold either a string or an
// ObjectId, so we match both variants. Counts are gathered with a single grouped
// aggregation per target collection (12 queries per page, independent of the
// number of items) to keep listing performance flat. A target that fails to
// count yields `count: null`, letting the UI fall back gracefully.
const attachNavigationCounts = async (items) => {
  if (!items.length) return items;

  const idStrings = items.map((it) => String(it._id));
  const idVariants = [];
  idStrings.forEach((s) => {
    idVariants.push(s);
    if (mongoose.Types.ObjectId.isValid(s)) idVariants.push(new mongoose.Types.ObjectId(s));
  });

  const countMaps = await Promise.all(
    NAV_TARGETS.map(async (t) => {
      try {
        const rows = await t.model.aggregate([
          { $match: { marketing_house_item_id: { $in: idVariants } } },
          { $group: { _id: '$marketing_house_item_id', count: { $sum: 1 } } },
        ]);
        const map = new Map();
        rows.forEach((r) => map.set(String(r._id), r.count));
        return map;
      } catch (err) {
        return null; // counts for this target unavailable — UI falls back
      }
    })
  );

  return items.map((it) => {
    const idStr = String(it._id);
    return {
      ...it,
      navigation: NAV_TARGETS.map((t, i) => ({
        segment: t.segment,
        label: t.label,
        count: countMaps[i] ? countMaps[i].get(idStr) || 0 : null,
      })),
    };
  });
};

const base = createCrudController(MarketingHouseItem, {
  imageFields: ['poster_image'],
  searchFields: ['title', 'marketing_house_slug'],
  defaultSort: { display_order: 1 },
  parentField: 'marketing_house_category_id',
});

// Wrap the factory index so the paginated/filtered/searched result is augmented
// with navigation counts without duplicating its query logic. If augmentation
// fails for any reason, the original listing is returned unchanged.
const indexWithNavCounts = async (req, res) => {
  const sendJson = res.json.bind(res);
  res.json = (payload) => {
    if (payload && payload.status === 'success' && Array.isArray(payload.data) && payload.data.length) {
      attachNavigationCounts(payload.data)
        .then((data) => sendJson({ ...payload, data }))
        .catch(() => sendJson(payload));
      return res;
    }
    return sendJson(payload);
  };
  return base.index(req, res);
};

// The items listing/search and the legacy migrated data use the bare field
// names (`title`, `poster_image`, `marketing_video`, `description`), while the
// schema declares the `marketing_house_*` equivalents — and `marketing_house_title`
// is required. Mirror each pair both ways so validation passes and either name
// resolves to the same value regardless of which the client sends.
const FIELD_MIRRORS = [
  ['title', 'marketing_house_title'],
  ['poster_image', 'marketing_house_thumbnail'],
  ['marketing_video', 'marketing_house_video_url'],
  ['description', 'marketing_house_description'],
];
const mirrorItemFields = (body) => {
  for (const [a, b] of FIELD_MIRRORS) {
    const aSet = body[a] !== undefined && body[a] !== '';
    const bSet = body[b] !== undefined && body[b] !== '';
    if (aSet && !bSet) body[b] = body[a];
    else if (bSet && !aSet) body[a] = body[b];
  }
};

const storeWithSlugAndYoutube = async (req, res) => {
  if (!req.body.marketing_house_slug && req.body.title) {
    req.body.marketing_house_slug = generateSlug(req.body.title);
  }
  if (req.body.marketing_video) {
    const ytId = getYoutubeVideoId(req.body.marketing_video);
    if (ytId) {
      req.body.marketing_video_type = ytId;
      if (!req.file) {
        const thumbKey = await uploadYoutubeThumbnailToS3(
          `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
          `${ytId}_${Date.now()}`,
          'marketing_thumbnails'
        );
        if (thumbKey) req.body.poster_image = thumbKey;
      }
    }
  }
  mirrorItemFields(req.body);
  return base.store(req, res);
};

// Keep the bare/marketing_house_* field pairs in sync on edits too.
const updateWithMirror = async (req, res) => {
  mirrorItemFields(req.body);
  return base.update(req, res);
};

const bulkUpload = async (req, res) => {
  if (!req.file) return res.status(400).json({ status: 'error', message: 'No file uploaded' });
  try {
    const rows = await parseCsvOrExcel(req.file);
    const results = [];
    for (const row of rows) {
      const videoUrl = row[0];
      if (!videoUrl) continue;
      const ytId = getYoutubeVideoId(videoUrl);
      const display_order = row[1] ? parseInt(row[1]) : 0;
      const status = row[2] ? parseInt(row[2]) : 1;
      const item = await MarketingHouseItem.create({
        marketing_house_category_id: req.body.marketing_house_category_id,
        marketing_video: videoUrl,
        marketing_house_youtube_id: ytId || '',
        title: ytId || videoUrl,
        marketing_house_slug: generateSlug(ytId || videoUrl),
        display_order,
        status,
        user_id: req.user._id,
      });
      results.push(item);
    }
    res.status(201).json({ status: 'success', message: `${results.length} items uploaded`, data: results });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
};

module.exports = { ...base, index: indexWithNavCounts, store: storeWithSlugAndYoutube, update: updateWithMirror, bulkUpload };
