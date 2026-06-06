const BlogCategory = require('../../models/BlogCategory');
const createCrudController = require('./crudFactory');
const { generateSlug } = require('../../utils/helpers');

const base = createCrudController(BlogCategory, { searchFields: ['blog_category_name'], defaultSort: { display_order: 1 } });

const storeWithSlug = async (req, res) => {
  if (!req.body.blog_category_name) req.body.blog_category_name = req.body.blog_category_name;
  return base.store(req, res);
};

module.exports = { ...base, store: storeWithSlug };
