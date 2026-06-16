const BlogItem = require('../../models/BlogItem');
const BlogCategory = require('../../models/BlogCategory');
const BlogSubCategory = require('../../models/BlogSubCategory');
const createCrudController = require('./crudFactory');
const { generateSlug } = require('../../utils/helpers');

const base = createCrudController(BlogItem, {
  imageFields: ['main_image'],
  searchFields: ['blog_title', 'blog_item_slug'],
  defaultSort: { createdAt: -1 },
  parentField: ['blog_category_id', 'blog_sub_category_id'],
  // Resolve the category / sub-category names for the list/detail responses.
  lookups: [
    {
      localField: 'blog_category_id',
      model: BlogCategory,
      nameField: 'blog_category_name',
      as: 'blog_category_name',
    },
    {
      localField: 'blog_sub_category_id',
      model: BlogSubCategory,
      nameField: 'blog_sub_category_name',
      as: 'blog_sub_category_name',
    },
  ],
  // The Blog Slug field was removed from the admin form, so derive a unique
  // `blog_slug` from the title here. This is the slug the public web app looks
  // posts up by (/blog/detail/:blog_slug and the blog listing links).
  slugField: 'blog_slug',
  slugSource: 'blog_title',
});

// `blog_item_slug` is a separate, non-unique slug kept for legacy readers.
const deriveItemSlug = (body) => {
  if (!body.blog_item_slug && body.blog_title) body.blog_item_slug = generateSlug(body.blog_title);
};

const storeWithSlug = async (req, res) => {
  deriveItemSlug(req.body);
  return base.store(req, res);
};

const updateWithSlug = async (req, res) => {
  deriveItemSlug(req.body);
  return base.update(req, res);
};

module.exports = { ...base, store: storeWithSlug, update: updateWithSlug };
