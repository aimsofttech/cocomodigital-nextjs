const Page = require('../../models/Page');
const createCrudController = require('./crudFactory');
const { generateSlug } = require('../../utils/helpers');

const base = createCrudController(Page, { searchFields: ['page_title'], defaultSort: { createdAt: -1 } });

const storeWithSlug = async (req, res) => {
  if (!req.body.page_slug && req.body.page_title) req.body.page_slug = generateSlug(req.body.page_title);
  return base.store(req, res);
};

module.exports = { ...base, store: storeWithSlug };
