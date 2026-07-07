const mongoose = require('mongoose');
const BlogSubCategory = require('../../models/BlogSubCategory');
const BlogCategory = require('../../models/BlogCategory');
const BlogItem = require('../../models/BlogItem');
const createCrudController = require('./crudFactory');
const { generateSlug } = require('../../utils/helpers');

const base = createCrudController(BlogSubCategory, {
  searchFields: ['name'],
  defaultSort: { displayOrder: 1 },
  parentField: 'blogCategoryId',
  // Resolve the parent category's name for the list/detail responses.
  lookups: [
    {
      localField: 'blogCategoryId',
      model: BlogCategory,
      nameField: 'name',
      as: 'blogCategoryName',
    },
  ],
});

// Derive the slug if none was sent.
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

// Attach the count of blog posts linked to each sub-category (so the admin list
// can show a "Blog Posts" column that drills into the posts page). One grouped
// aggregation per page; link ids may be strings or ObjectIds, so group by the
// string form and look up by string.
const attachPostCounts = async (subs) => {
  if (!subs.length) return subs;
  const idVariants = [];
  subs.forEach((s) => {
    const str = String(s._id);
    idVariants.push(str);
    if (mongoose.Types.ObjectId.isValid(str)) idVariants.push(new mongoose.Types.ObjectId(str));
  });
  let countMap = new Map();
  try {
    const rows = await BlogItem.aggregate([
      { $match: { blogSubCategoryId: { $in: idVariants } } },
      { $group: { _id: '$blogSubCategoryId', count: { $sum: 1 } } },
    ]);
    rows.forEach((r) => countMap.set(String(r._id), r.count));
  } catch (err) {
    countMap = new Map();
  }
  return subs.map((s) => ({ ...s, blog_items_count: countMap.get(String(s._id)) || 0 }));
};

// Wrap the factory index so each sub-category carries its `blog_items_count`.
const indexWithPostCounts = async (req, res) => {
  const sendJson = res.json.bind(res);
  res.json = (payload) => {
    if (payload && payload.status === 'success' && Array.isArray(payload.data) && payload.data.length) {
      attachPostCounts(payload.data)
        .then((data) => sendJson({ ...payload, data }))
        .catch(() => sendJson(payload));
      return res;
    }
    return sendJson(payload);
  };
  return base.index(req, res);
};

module.exports = { ...base, index: indexWithPostCounts, store: storeWithSlug, update: updateWithSlug };
