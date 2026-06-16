const mongoose = require('mongoose');
const BlogCategory = require('../../models/BlogCategory');
const BlogSubCategory = require('../../models/BlogSubCategory');
const createCrudController = require('./crudFactory');
const { generateSlug } = require('../../utils/helpers');

const base = createCrudController(BlogCategory, { searchFields: ['blog_category_name'], defaultSort: { display_order: 1 } });

// Keep the legacy `category_name`/`category_slug` in sync with the fields the
// admin form actually sends (`blog_category_name`/`slug`), so any code still
// reading the legacy names keeps working. Also derive a slug if none was sent.
const mirrorFields = (body) => {
  if (body.blog_category_name && !body.category_name) body.category_name = body.blog_category_name;
  if (!body.slug && body.blog_category_name) body.slug = generateSlug(body.blog_category_name);
  if (body.slug && !body.category_slug) body.category_slug = body.slug;
};

const storeWithSlug = async (req, res) => {
  mirrorFields(req.body);
  return base.store(req, res);
};

const updateWithSlug = async (req, res) => {
  mirrorFields(req.body);
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
      { $match: { blog_category_id: { $in: idVariants } } },
      { $group: { _id: '$blog_category_id', count: { $sum: 1 } } },
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
