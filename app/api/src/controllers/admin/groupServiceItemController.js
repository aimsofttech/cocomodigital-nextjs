const mongoose = require('mongoose');
const GroupServiceItem = require('../../models/GroupServiceItem');
const GroupServiceCategory = require('../../models/GroupServiceCategory');
const ServiceCategory = require('../../models/ServiceCategory');
const ServiceItem = require('../../models/ServiceItem');
const GroupSingleServiceImage = require('../../models/GroupSingleServiceImage');
const GroupSingleServiceRecentWork = require('../../models/GroupSingleServiceRecentWork');
const GroupSingleServicePortfolioCategory = require('../../models/GroupSingleServicePortfolioCategory');
const GroupSingleServicePortfolioItem = require('../../models/GroupSingleServicePortfolioItem');
const GroupServiceItemFaq = require('../../models/GroupServiceItemFaq');
const createCrudController = require('./crudFactory');
const { generateSlug } = require('../../utils/helpers');
const { cascadeItemSections } = require('../../utils/groupServiceCascade');

const base = createCrudController(GroupServiceItem, {
  imageFields: ['thumbnail'],
  searchFields: ['title'],
  defaultSort: { displayOrder: 1 },
  parentField: 'groupServiceCategoryId',
  // Chained lookups: Item → Group Service Category, then use the category's
  // Department (exploreOurServiceCategoryId) and Service Category
  // (exploreOurServiceItemId) refs to resolve their display names.
  lookups: [
    {
      localField: 'groupServiceCategoryId',
      model: GroupServiceCategory,
      nameField: 'name',
      as: 'groupCategoryName',
      extract: {
        exploreOurServiceCategoryId: 'exploreOurServiceCategoryId',
        exploreOurServiceItemId: 'exploreOurServiceItemId',
      },
    },
    {
      localField: 'exploreOurServiceCategoryId',
      model: ServiceCategory,
      nameField: 'name',
      as: 'departmentName',
    },
    {
      localField: 'exploreOurServiceItemId',
      model: ServiceItem,
      nameField: 'title',
      as: 'serviceCategoryName',
    },
  ],
});

// Item-sections reachable from a Group Service Item, each linked by
// `groupServiceItemId`. Drives the "Navigate To" column (label + live count).
const NAV_TARGETS = [
  { segment: 'media', label: 'Service Media', model: GroupSingleServiceImage },
  { segment: 'recent-work', label: 'Service Recent Work', model: GroupSingleServiceRecentWork },
  { segment: 'portfolio-category', label: 'Service Portfolio Category', model: GroupSingleServicePortfolioCategory },
  { segment: 'portfolio-item', label: 'Portfolio Items', model: GroupSingleServicePortfolioItem },
  { segment: 'faq', label: 'FAQ', model: GroupServiceItemFaq },
];

// Attach a `navigation` array ([{ segment, label, count }]) to each item by
// counting its sub-records. `groupServiceItemId` is Mixed (string or
// ObjectId), so we match both variants. One grouped aggregation per target.
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
          { $match: { groupServiceItemId: { $in: idVariants } } },
          { $group: { _id: '$groupServiceItemId', count: { $sum: 1 } } },
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

// Derived filters: Department (exploreOurServiceCategoryId) and Service
// Category (exploreOurServiceItemId) live on the parent Group Service
// Category, not the item. Resolve the matching category ids and fold them
// into the groupServiceCategoryId scope (the factory accepts a comma list),
// intersecting with any category the caller already picked.
const applyDerivedCategoryFilters = async (req) => {
  const { exploreOurServiceCategoryId, exploreOurServiceItemId } = req.query;
  if (!exploreOurServiceCategoryId && !exploreOurServiceItemId) return;

  const variants = (id) => {
    const s = String(id);
    const out = [s];
    if (mongoose.Types.ObjectId.isValid(s)) out.push(new mongoose.Types.ObjectId(s));
    return out;
  };
  const catFilter = {};
  if (exploreOurServiceCategoryId) catFilter.exploreOurServiceCategoryId = { $in: variants(exploreOurServiceCategoryId) };
  if (exploreOurServiceItemId) catFilter.exploreOurServiceItemId = { $in: variants(exploreOurServiceItemId) };

  const cats = await GroupServiceCategory.find(catFilter).select('_id').lean();
  let ids = cats.map((c) => String(c._id));

  // Intersect with an explicitly selected Group Category, if any.
  const explicit = req.query.groupServiceCategoryId;
  if (explicit) ids = ids.filter((id) => String(explicit).split(',').includes(id));

  // No matching categories → force an empty result (impossible id).
  req.query.groupServiceCategoryId = ids.length ? ids.join(',') : '__none__';
};

// Wrap the factory index so each item carries its section navigation counts.
const index = async (req, res) => {
  await applyDerivedCategoryFilters(req);
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

const storeWithSlug = async (req, res) => {
  if (!req.body.slug && req.body.title) {
    req.body.slug = generateSlug(req.body.title);
  }
  return base.store(req, res);
};

const getServiceItems = async (req, res) => {
  const items = await GroupServiceItem.find({ groupServiceCategoryId: req.params.categoryId, status: 1 })
    .sort({ displayOrder: 1 })
    .select('title slug');
  res.json({ status: 'success', data: items });
};

// Deleting an item also deletes every section record added inside it
// (service media, recent work, portfolio categories + items, FAQs).
const destroy = async (req, res) => {
  await cascadeItemSections([req.params.id]);
  return base.destroy(req, res);
};

module.exports = { ...base, index, store: storeWithSlug, getServiceItems, destroy };
