const BlogCategory = require('../../models/BlogCategory');
const BlogSubCategory = require('../../models/BlogSubCategory');
const BlogItem = require('../../models/BlogItem');
const { buildS3Url } = require('../../utils/s3Upload');

const buildUrl = (key) => (key ? buildS3Url(key) : '');

const blog = async (req, res) => {
  const categories = await BlogCategory.find({ status: 1 }).sort({ display_order: 1 });
  res.json({ status: 'success', data: { categories } });
};

const blogCategory = async (req, res) => {
  const categories = await BlogCategory.find({ status: 1 }).sort({ display_order: 1 });
  res.json({ status: 'success', data: categories });
};

const getBlogItemBySlug = async (req, res) => {
  const { slug } = req.query;
  const filter = { status: 1, ...(slug ? { blog_slug: slug } : {}) };
  const items = await BlogItem.find(filter).sort({ createdAt: -1 })
    .populate('blog_category_id', 'blog_category_name slug')
    .populate('blog_sub_category_id', 'sub_category_name')
    .populate('author_template_id', 'author_name author_image');
  res.json({ status: 'success', data: items.map((i) => ({ ...i.toObject(), blog_thumbnail: buildUrl(i.blog_thumbnail) })) });
};

const getBlogItemDetailById = async (req, res) => {
  const item = await BlogItem.findById(req.params.id).populate('blog_category_id').populate('author_template_id');
  if (!item) return res.status(404).json({ status: 'error', message: 'Not found' });
  res.json({ status: 'success', data: { ...item.toObject(), blog_thumbnail: buildUrl(item.blog_thumbnail) } });
};

const getBlogDetail = async (req, res) => {
  const { blog_item_slug } = req.params;
  const item = await BlogItem.findOne({ blog_slug: blog_item_slug, status: 1 })
    .populate('blog_category_id', 'blog_category_name slug')
    .populate('blog_sub_category_id', 'sub_category_name')
    .populate('author_template_id', 'author_name author_image author_designation');
  if (!item) return res.status(404).json({ status: 'error', message: 'Not found' });

  const related = await BlogItem.find({ blog_category_id: item.blog_category_id, _id: { $ne: item._id }, status: 1 })
    .sort({ createdAt: -1 }).limit(3).select('blog_title blog_slug blog_thumbnail createdAt');

  res.json({
    status: 'success',
    data: {
      blog: { ...item.toObject(), blog_thumbnail: buildUrl(item.blog_thumbnail) },
      related_blogs: related.map((r) => ({ ...r.toObject(), blog_thumbnail: buildUrl(r.blog_thumbnail) })),
    },
  });
};

module.exports = { blog, blogCategory, getBlogItemBySlug, getBlogItemDetailById, getBlogDetail };
