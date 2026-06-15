const mongoose = require('mongoose');
const GroupSingleServicePortfolioCategory = require('../../models/GroupSingleServicePortfolioCategory');
const GroupSingleServicePortfolioItem = require('../../models/GroupSingleServicePortfolioItem');
const createCrudController = require('./crudFactory');

const base = createCrudController(GroupSingleServicePortfolioCategory, {
  searchFields: ['portfolio_category_name'],
  defaultSort: { display_order: 1 },
  parentField: 'group_service_item_id',
});

// Attach a `navigation` array with the count of Portfolio Items in each category
// (linked by portfolio_category_id). Drives the "Portfolio Items" navigate button.
const attachNavigation = async (cats) => {
  if (!cats.length) return cats;
  const idVariants = [];
  cats.forEach((c) => {
    const s = String(c._id);
    idVariants.push(s);
    if (mongoose.Types.ObjectId.isValid(s)) idVariants.push(new mongoose.Types.ObjectId(s));
  });
  const map = new Map();
  try {
    const rows = await GroupSingleServicePortfolioItem.aggregate([
      { $match: { portfolio_category_id: { $in: idVariants } } },
      { $group: { _id: '$portfolio_category_id', count: { $sum: 1 } } },
    ]);
    rows.forEach((r) => map.set(String(r._id), r.count));
  } catch (err) {
    // best-effort
  }
  return cats.map((c) => ({
    ...c,
    navigation: [
      { segment: 'portfolio-item', label: 'Portfolio Items', count: map.get(String(c._id)) || 0 },
    ],
  }));
};

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
