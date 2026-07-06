const mongoose = require('mongoose');
const CreativeHouseItem = require('../../models/CreativeHouseItem');
const CreativeHouseApproach = require('../../models/CreativeHouseApproach');
const CreativeHouseFinalOutput = require('../../models/CreativeHouseFinalOutput');
const createCrudController = require('./crudFactory');
const { cascadeDelete } = require('./cascadeDelete');
const { generateSlug } = require('../../utils/helpers');
const { getYoutubeVideoId, uploadYoutubeThumbnailToS3, parseCsvOrExcel } = require('../../utils/s3Upload');

const base = createCrudController(CreativeHouseItem, {
  imageFields: ['thumbnail'],
  videoFields: ['uploadVideoUrl'],
  searchFields: ['title', 'videoTitle', 'slug'],
  defaultSort: { displayOrder: 1 },
  parentField: 'creativeHouseCategoryId',
});

// Item-sections reachable from a creative item — each linked via
// `creativeHouseItemId`. Drives the "Navigate To" column on the items table
// (label + live record count per item).
const NAV_TARGETS = [
  { segment: 'approach',     label: 'Creative Approach',      model: CreativeHouseApproach },
  { segment: 'final-output', label: 'Creative Project Media', model: CreativeHouseFinalOutput },
];

// Attach a `navigation` array ([{ segment, label, count }]) to each item by
// counting its sub-records. `creativeHouseItemId` is a Mixed field that may
// hold a string or an ObjectId, so we match both variants. One grouped
// aggregation per target keeps this flat regardless of the number of items.
const attachNavigationCounts = async (items) => {
  if (!items.length) return items;

  const idVariants = [];
  items.forEach((it) => {
    const s = String(it._id);
    idVariants.push(s);
    if (mongoose.Types.ObjectId.isValid(s)) idVariants.push(new mongoose.Types.ObjectId(s));
  });

  const countMaps = await Promise.all(
    NAV_TARGETS.map(async (t) => {
      try {
        const rows = await t.model.aggregate([
          { $match: { creativeHouseItemId: { $in: idVariants } } },
          { $group: { _id: '$creativeHouseItemId', count: { $sum: 1 } } },
        ]);
        const map = new Map();
        rows.forEach((r) => map.set(String(r._id), r.count));
        return map;
      } catch (err) {
        return null;
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

// Wrap the factory index so each listed item is augmented with its navigation
// counts. If augmentation fails the original listing is returned unchanged.
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

// The schema requires `title`, while the list table + public web
// read `videoTitle`. Keep the pair in sync both ways so either
// name the client sends resolves to the same value (mirrors the marketing item
// controller pattern).
const mirrorTitle = (body) => {
  const a = body.title;
  const b = body.videoTitle;
  if (a !== undefined && a !== '' && (b === undefined || b === '')) body.videoTitle = a;
  else if (b !== undefined && b !== '' && (a === undefined || a === '')) body.title = b;
};

const storeWithSlugAndYoutube = async (req, res) => {
  mirrorTitle(req.body);
  if (!req.body.slug && req.body.title) {
    req.body.slug = generateSlug(req.body.title);
  }
  if (req.body.videoUrl) {
    const ytId = getYoutubeVideoId(req.body.videoUrl);
    if (ytId) {
      req.body.youtubeId = ytId;
      // Only auto-fetch a YouTube thumbnail when the admin didn't supply one
      // (either as a multipart file or as an already-uploaded S3 key/url).
      if (!req.file && !req.body.thumbnail) {
        const thumbKey = await uploadYoutubeThumbnailToS3(
          `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
          `${ytId}_${Date.now()}`,
          'creative_thumbnails'
        );
        if (thumbKey) req.body.thumbnail = thumbKey;
      }
    }
  }
  return base.store(req, res);
};

const updateWithMirror = async (req, res) => {
  mirrorTitle(req.body);
  return base.update(req, res);
};

const bulkUpload = async (req, res) => {
  if (!req.file) return res.status(400).json({ status: 'error', message: 'No file uploaded' });
  const { parseCsvOrExcel: parse } = require('../../utils/helpers');
  try {
    const rows = await parse(req.file);
    const results = [];
    for (const row of rows) {
      const videoUrl = row[0];
      if (!videoUrl) continue;
      const ytId = getYoutubeVideoId(videoUrl);
      const displayOrder = row[1] ? parseInt(row[1]) : 0;
      const status = row[2] ? parseInt(row[2]) : 1;
      let thumbnailKey = null;
      if (ytId) {
        thumbnailKey = await uploadYoutubeThumbnailToS3(
          `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
          `${ytId}_${Date.now()}`,
          'creative_thumbnails'
        );
      }
      const item = await CreativeHouseItem.create({
        creativeHouseCategoryId: req.body.creativeHouseCategoryId,
        videoUrl: videoUrl,
        youtubeId: ytId || '',
        thumbnail: thumbnailKey,
        title: ytId || videoUrl,
        slug: generateSlug(ytId || videoUrl),
        displayOrder,
        status,
        userId: req.user._id,
      });
      results.push(item);
    }
    res.status(201).json({ status: 'success', message: `${results.length} items uploaded`, data: results });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
};

// Section collections linked to an item via `creativeHouseItemId`.
const SECTION_CASCADE = [
  { model: CreativeHouseApproach,    fk: 'creativeHouseItemId', media: ['image', 'thumbnail', 'uploadVideoUrl'] },
  { model: CreativeHouseFinalOutput, fk: 'creativeHouseItemId', media: ['image', 'thumbnail', 'uploadVideoUrl'] },
];

// Deleting an item removes its approaches and project media too.
const destroyWithCascade = async (req, res) => {
  await cascadeDelete(req.params.id, SECTION_CASCADE);
  return base.destroy(req, res);
};

module.exports = { ...base, index: indexWithNavCounts, store: storeWithSlugAndYoutube, update: updateWithMirror, bulkUpload, destroy: destroyWithCascade, SECTION_CASCADE };
