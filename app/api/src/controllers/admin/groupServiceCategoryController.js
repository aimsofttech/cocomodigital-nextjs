const mongoose = require('mongoose');
const GroupServiceCategory = require('../../models/GroupServiceCategory');
const GroupServiceItem = require('../../models/GroupServiceItem');
const ServiceCategory = require('../../models/ServiceCategory');
const ServiceItem = require('../../models/ServiceItem');
const createCrudController = require('./crudFactory');

const base = createCrudController(GroupServiceCategory, {
  searchFields: ['name'],
  defaultSort: { displayOrder: 1 },
  // Resolve the linked Department (explore_our_service_category) and Category
  // (explore_our_service_item) display names for the list/detail responses.
  lookups: [
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
      as: 'categoryName',
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
//  - Group Service Items: group_service_item linked by groupServiceCategoryId
const attachNavigation = async (cats) => {
  if (!cats.length) return cats;

  const itemCounts = await countByField(
    GroupServiceItem,
    'groupServiceCategoryId',
    cats.map((c) => c._id)
  );

  return cats.map((c) => ({
    ...c,
    navigation: [
      {
        segment: 'items',
        label: 'Group Service Items',
        count: itemCounts.get(String(c._id)) || 0,
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
