const mongoose = require('mongoose');
const GroupServiceCategory = require('../../models/GroupServiceCategory');
const GroupServiceItem = require('../../models/GroupServiceItem');
const GroupTopBanner = require('../../models/GroupTopBanner');
const ServiceCategory = require('../../models/ServiceCategory');
const ServiceItem = require('../../models/ServiceItem');
const createCrudController = require('./crudFactory');

const base = createCrudController(GroupServiceCategory, {
  searchFields: ['group_service_category_name'],
  defaultSort: { display_order: 1 },
  // Resolve the linked Department (explore_our_service_category) and Category
  // (explore_our_service_item) display names for the list/detail responses.
  lookups: [
    {
      localField: 'explore_our_service_category_id',
      model: ServiceCategory,
      nameField: 'service_category_name',
      as: 'department_name',
    },
    {
      localField: 'explore_our_service_item_id',
      model: ServiceItem,
      nameField: 'service_title',
      as: 'category_name',
    },
  ],
});

// Both string and ObjectId variants of an id, for matching Mixed FK fields that
// may store either representation.
const idVariants = (val) => {
  if (val === null || val === undefined || val === '') return [];
  const s = String(val);
  const out = [s];
  if (mongoose.Types.ObjectId.isValid(s)) out.push(new mongoose.Types.ObjectId(s));
  return out;
};

// Count related records grouped by a foreign-key field, returning a Map keyed by
// the stringified fk value. One aggregation regardless of how many categories.
const countByField = async (Model, field, values) => {
  const map = new Map();
  const all = values.flatMap(idVariants);
  if (!all.length) return map;
  try {
    const rows = await Model.aggregate([
      { $match: { [field]: { $in: all } } },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    ]);
    rows.forEach((r) => map.set(String(r._id), r.count));
  } catch (err) {
    return map; // best-effort: empty map on failure
  }
  return map;
};

// Attach a `navigation` array ([{ segment, label, count }]) to each category:
//  - Group Service Items: group_service_item linked by group_service_category_id
//  - Service Category Banner: group_top_banner linked by explore_our_service_item_id
const attachNavigation = async (cats) => {
  if (!cats.length) return cats;

  const itemCounts = await countByField(
    GroupServiceItem,
    'group_service_category_id',
    cats.map((c) => c._id)
  );
  const bannerCounts = await countByField(
    GroupTopBanner,
    'explore_our_service_item_id',
    cats.map((c) => c.explore_our_service_item_id)
  );

  return cats.map((c) => ({
    ...c,
    navigation: [
      {
        segment: 'items',
        label: 'Group Service Items',
        count: itemCounts.get(String(c._id)) || 0,
      },
      {
        segment: 'banner',
        label: 'Service Category Banner',
        count: bannerCounts.get(String(c.explore_our_service_item_id)) || 0,
      },
    ],
  }));
};

// Wrap the factory index so each listed category carries its navigation counts.
// On any failure the original listing is returned unchanged.
const index = async (req, res) => {
  const sendJson = res.json.bind(res);
  res.json = (payload) => {
    if (payload && payload.status === 'success' && Array.isArray(payload.data) && payload.data.length) {
      attachNavigation(payload.data)
        .then((data) => sendJson({ ...payload, data }))
        .catch(() => sendJson(payload));
      return res;
    }
    return sendJson(payload);
  };
  return base.index(req, res);
};

module.exports = { ...base, index };
