const BlogCategory = require('../../models/BlogCategory');
const BlogSubCategory = require('../../models/BlogSubCategory');
const BlogItem = require('../../models/BlogItem');
const { buildS3Url } = require('../../utils/s3Upload');

const buildUrl = (key) => (key ? buildS3Url(key) : '');

const blog = async (req, res) => {
  const categories = await BlogCategory.find({ status: 1 }).sort({ displayOrder: 1 });
  res.json({ status: 'success', data: { categories } });
};

const blogCategory = async (req, res) => {
  const categories = await BlogCategory.find({ status: 1 }).sort({ displayOrder: 1 });
  res.json({ status: 'success', data: categories });
};

const getBlogItemBySlug = async (req, res) => {
  const { slug } = req.query;
  const filter = { status: 1, ...(slug ? { slug } : {}) };
  const items = await BlogItem.find(filter).sort({ createdAt: -1 })
    .populate('blogCategoryId', 'name slug')
    .populate('blogSubCategoryId', 'name')
    .populate('authorTemplateId', 'name image');
  res.json({ status: 'success', data: items.map((i) => ({ ...i.toObject(), thumbnail: buildUrl(i.thumbnail) })) });
};

const getBlogItemDetailById = async (req, res) => {
  const item = await BlogItem.findById(req.params.id).populate('blogCategoryId').populate('authorTemplateId');
  if (!item) return res.status(404).json({ status: 'error', message: 'Not found' });
  res.json({ status: 'success', data: { ...item.toObject(), thumbnail: buildUrl(item.thumbnail) } });
};

const getBlogDetail = async (req, res) => {
  const { blog_item_slug } = req.params;
  const item = await BlogItem.findOne({ slug: blog_item_slug, status: 1 })
    .populate('blogCategoryId', 'name slug')
    .populate('blogSubCategoryId', 'name')
    .populate('authorTemplateId', 'name image designation');
  if (!item) return res.status(404).json({ status: 'error', message: 'Not found' });

  const related = await BlogItem.find({ blogCategoryId: item.blogCategoryId, _id: { $ne: item._id }, status: 1 })
    .sort({ createdAt: -1 }).limit(3).select('title slug thumbnail createdAt');

  res.json({
    status: 'success',
    data: {
      blog: { ...item.toObject(), thumbnail: buildUrl(item.thumbnail) },
      related_blogs: related.map((r) => ({ ...r.toObject(), thumbnail: buildUrl(r.thumbnail) })),
    },
  });
};

module.exports = { blog, blogCategory, getBlogItemBySlug, getBlogItemDetailById, getBlogDetail };
