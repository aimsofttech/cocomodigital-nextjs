const BlogItem = require('../../models/BlogItem');
const createCrudController = require('./crudFactory');
const { generateSlug } = require('../../utils/helpers');

const base = createCrudController(BlogItem, {
  imageFields: ['main_image'],
  searchFields: ['blog_title', 'blog_item_slug'],
  defaultSort: { createdAt: -1 },
  parentField: 'blog_category_id',
});

const storeWithSlug = async (req, res) => {
  if (!req.body.blog_item_slug && req.body.blog_title) req.body.blog_item_slug = generateSlug(req.body.blog_title);
  
  return base.store(req, res);
};

const updateWithSlug = async (req, res) => {
  if (!req.body.blog_item_slug && req.body.blog_title) req.body.blog_item_slug = generateSlug(req.body.blog_title);
  return base.update(req, res);
};

module.exports = { ...base, store: storeWithSlug, update: updateWithSlug };
