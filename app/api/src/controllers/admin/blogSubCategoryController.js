const BlogSubCategory = require('../../models/BlogSubCategory');
const createCrudController = require('./crudFactory');
const { generateSlug } = require('../../utils/helpers');

const base = createCrudController(BlogSubCategory, { searchFields: ['blog_sub_category_name'], defaultSort: { display_order: 1 }, parentField: 'blog_category_id' });

const storeWithSlug = async (req, res) => {
  if (!req.body.blog_sub_category_slug && req.body.blog_sub_category_name) req.body.blog_sub_category_slug = generateSlug(req.body.blog_sub_category_name);
  return base.store(req, res);
};

module.exports = { ...base, store: storeWithSlug };
