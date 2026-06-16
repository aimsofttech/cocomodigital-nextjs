const BlogCategory = require('../../models/BlogCategory');
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

module.exports = { ...base, store: storeWithSlug, update: updateWithSlug };
