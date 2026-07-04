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

const base = createCrudController(GroupServiceItem, {
  imageFields: ['group_service_item_thumbnail'],
  searchFields: ['group_service_item_title'],
  defaultSort: { display_order: 1 },
  parentField: 'group_service_category_id',
  // Chained lookups: Item → Group Service Category, then use the category's
  // Department (explore_our_service_category_id) and Service Category
  // (explore_our_service_item_id) refs to resolve their display names.
  lookups: [
    {
      localField: 'group_service_category_id',
      model: GroupServiceCategory,
      nameField: 'group_service_category_name',
      as: 'group_category_name',
      extract: {
        explore_our_service_category_id: 'explore_our_service_category_id',
        explore_our_service_item_id: 'explore_our_service_item_id',
      },
    },
    {
      localField: 'explore_our_service_category_id',
      model: ServiceCategory,
      nameField: 'name',
      as: 'department_name',
    },
    {
      localField: 'explore_our_service_item_id',
      model: ServiceItem,
      nameField: 'service_title',
      as: 'service_category_name',
    },
  ],
});

// Item-sections reachable from a Group Service Item, each linked by
// `group_service_item_id`. Drives the "Navigate To" column (label + live count).
const NAV_TARGETS = [
  { segment: 'media', label: 'Service Media', model: GroupSingleServiceImage },
  { segment: 'recent-work', label: 'Service Recent Work', model: GroupSingleServiceRecentWork },
  { segment: 'portfolio-category', label: 'Service Portfolio Category', model: GroupSingleServicePortfolioCategory },
  { segment: 'portfolio-item', label: 'Portfolio Items', model: GroupSingleServicePortfolioItem },
  { segment: 'faq', label: 'FAQ', model: GroupServiceItemFaq },
];

// Attach a `navigation` array ([{ segment, label, count }]) to each item by
// counting its sub-records. `group_service_item_id` is Mixed (string or
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
          { $match: { group_service_item_id: { $in: idVariants } } },
          { $group: { _id: '$group_service_item_id', count: { $sum: 1 } } },
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

// Wrap the factory index so each item carries its section navigation counts.
const index = async (req, res) => {
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
  if (!req.body.group_service_slug && req.body.group_service_item_title) {
    req.body.group_service_slug = generateSlug(req.body.group_service_item_title);
  }
  return base.store(req, res);
};

const getServiceItems = async (req, res) => {
  const items = await GroupServiceItem.find({ group_service_category_id: req.params.categoryId, status: 1 })
    .sort({ display_order: 1 })
    .select('group_service_item_title group_service_slug');
  res.json({ status: 'success', data: items });
};

module.exports = { ...base, index, store: storeWithSlug, getServiceItems };
