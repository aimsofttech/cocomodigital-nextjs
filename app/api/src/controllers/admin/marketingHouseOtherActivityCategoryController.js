const mongoose = require('mongoose');
const MarketingHouseOtherActivityCategory = require('../../models/MarketingHouseOtherActivityCategory');
const MarketingHouseItem = require('../../models/MarketingHouseItem');
const MarketingHouseCategory = require('../../models/MarketingHouseCategory');
const MarketingHouseOtherActivityItem = require('../../models/MarketingHouseOtherActivityItem');
const createCrudController = require('./crudFactory');

const base = createCrudController(MarketingHouseOtherActivityCategory, {
  searchFields: ['category_name'],
  defaultSort: { display_order: 1 },
  parentField: 'marketing_house_item_id',
  // Resolve the related marketing item/category into readable names (record →
  // item → category). The item lookup surfaces the item's category id via
  // `extract`, which the category lookup then resolves to a name. The resolved
  // names use `marketing_house_*` keys so they don't clash with this record's
  // own `category_name` field. Applied to list + show.
  lookups: [
    {
      localField: 'marketing_house_item_id',
      model: MarketingHouseItem,
      nameField: ['title', 'marketing_house_title'],
      as: 'marketing_house_item_name',
      extract: { marketing_house_category_id: 'marketing_house_category_id' },
    },
    {
      localField: 'marketing_house_category_id',
      model: MarketingHouseCategory,
      nameField: ['category_name', 'name'],
      as: 'marketing_house_category_name',
    },
  ],
});

// Attach the count of activity items linked to each category (so the admin list
// can show an "items" column that drills into the items page). One grouped
// aggregation per page keeps it flat regardless of category count. Link ids may
// be strings or ObjectIds, so group by the string form and look up by string.
const attachItemCounts = async (cats) => {
  if (!cats.length) return cats;
  const idVariants = [];
  cats.forEach((c) => {
    const s = String(c._id);
    idVariants.push(s);
    if (mongoose.Types.ObjectId.isValid(s)) idVariants.push(new mongoose.Types.ObjectId(s));
  });
  let countMap = new Map();
  try {
    const rows = await MarketingHouseOtherActivityItem.aggregate([
      { $match: { marketing_house_other_activity_category_id: { $in: idVariants } } },
      { $group: { _id: '$marketing_house_other_activity_category_id', count: { $sum: 1 } } },
    ]);
    rows.forEach((r) => countMap.set(String(r._id), r.count));
  } catch (err) {
    countMap = new Map(); // counts unavailable — UI falls back to 0
  }
  return cats.map((c) => ({ ...c, items_count: countMap.get(String(c._id)) || 0 }));
};

// Wrap the factory index so each category carries its `items_count`. If the
// augmentation fails for any reason, the original listing is returned unchanged.
const indexWithItemCounts = async (req, res) => {
  const sendJson = res.json.bind(res);
  res.json = (payload) => {
    if (payload && payload.status === 'success' && Array.isArray(payload.data) && payload.data.length) {
      attachItemCounts(payload.data)
        .then((data) => sendJson({ ...payload, data }))
        .catch(() => sendJson(payload));
      return res;
    }
    return sendJson(payload);
  };
  return base.index(req, res);
};

module.exports = { ...base, index: indexWithItemCounts };
