const mongoose = require('mongoose');
const BlogSubCategory = require('../../models/BlogSubCategory');
const BlogCategory = require('../../models/BlogCategory');
const BlogItem = require('../../models/BlogItem');
const createCrudController = require('./crudFactory');
const { generateSlug } = require('../../utils/helpers');

const base = createCrudController(BlogSubCategory, {
  searchFields: ['blog_sub_category_name'],
  defaultSort: { display_order: 1 },
  parentField: 'blog_category_id',
  // Resolve the parent category's name for the list/detail responses.
  lookups: [
    {
      localField: 'blog_category_id',
      model: BlogCategory,
      nameField: 'blog_category_name',
      as: 'blog_category_name',
    },
  ],
});

// Derive the slug if none was sent and keep the legacy sub_category_name/_slug
// fields in sync with the fields the admin form actually sends, so old readers
// keep working and the model's (now-optional) legacy fields stay populated.
const mirrorFields = (body) => {
  if (!body.blog_sub_category_slug && body.blog_sub_category_name) body.blog_sub_category_slug = generateSlug(body.blog_sub_category_name);
  if (body.blog_sub_category_name && !body.sub_category_name) body.sub_category_name = body.blog_sub_category_name;
  if (body.blog_sub_category_slug && !body.sub_category_slug) body.sub_category_slug = body.blog_sub_category_slug;
};

const storeWithSlug = async (req, res) => {
  mirrorFields(req.body);
  return base.store(req, res);
};

const updateWithSlug = async (req, res) => {
  mirrorFields(req.body);
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
      { $match: { blog_sub_category_id: { $in: idVariants } } },
      { $group: { _id: '$blog_sub_category_id', count: { $sum: 1 } } },
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
