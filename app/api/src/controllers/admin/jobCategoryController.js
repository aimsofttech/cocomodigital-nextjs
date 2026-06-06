const JobCategory = require('../../models/JobCategory');
const createCrudController = require('./crudFactory');
const { generateSlug } = require('../../utils/helpers');

const base = createCrudController(JobCategory, { searchFields: ['name'], defaultSort: { display_order: 1 } });

const storeWithSlug = async (req, res) => {
  if (!req.body.slug && req.body.name) req.body.slug = generateSlug(req.body.name);
  return base.store(req, res);
};

module.exports = { ...base, store: storeWithSlug };
