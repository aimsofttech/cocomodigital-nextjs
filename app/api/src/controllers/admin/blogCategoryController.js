const mongoose = require('mongoose');
const BlogCategory = require('../../models/BlogCategory');
const BlogSubCategory = require('../../models/BlogSubCategory');
const createCrudController = require('./crudFactory');
const { generateSlug } = require('../../utils/helpers');

const base = createCrudController(BlogCategory, { searchFields: ['name'], defaultSort: { displayOrder: 1 } });

// Derive a slug from the name if none was sent. (The legacy
// category_name/category_slug mirror pair was folded into name/slug by
// scripts/rename-blog-keys.js, so no mirroring is needed anymore.)
const deriveSlug = (body) => {
  if (!body.slug && body.name) body.slug = generateSlug(body.name);
};

const storeWithSlug = async (req, res) => {
  deriveSlug(req.body);
  return base.store(req, res);
};

const updateWithSlug = async (req, res) => {
  deriveSlug(req.body);
  return base.update(req, res);
};

// Attach the count of sub-categories linked to each category (so the admin list
// can show a "Sub Categories" column that drills into the sub-category page).
// One grouped aggregation per page; link ids may be strings or ObjectIds, so
// group by the string form and look up by string.
const attachSubCounts = async (cats) => {
  if (!cats.length) return cats;
  const idVariants = [];
  cats.forEach((c) => {
    const s = String(c._id);
    idVariants.push(s);
    if (mongoose.Types.ObjectId.isValid(s)) idVariants.push(new mongoose.Types.ObjectId(s));
  });
  let countMap = new Map();
  try {
    const rows = await BlogSubCategory.aggregate([
      { $match: { blogCategoryId: { $in: idVariants } } },
      { $group: { _id: '$blogCategoryId', count: { $sum: 1 } } },
    ]);
    rows.forEach((r) => countMap.set(String(r._id), r.count));
  } catch (err) {
    countMap = new Map();
  }
  return cats.map((c) => ({ ...c, sub_categories_count: countMap.get(String(c._id)) || 0 }));
};

// Wrap the factory index so each category carries its `sub_categories_count`.
const indexWithSubCounts = async (req, res) => {
  const sendJson = res.json.bind(res);
  res.json = (payload) => {
    if (payload && payload.status === 'success' && Array.isArray(payload.data) && payload.data.length) {
      attachSubCounts(payload.data)
        .then((data) => sendJson({ ...payload, data }))
        .catch(() => sendJson(payload));
      return res;
    }
    return sendJson(payload);
  };
  return base.index(req, res);
};

module.exports = { ...base, index: indexWithSubCounts, store: storeWithSlug, update: updateWithSlug };
