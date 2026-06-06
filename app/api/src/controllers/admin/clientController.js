const Client = require('../../models/Client');
const createCrudController = require('./crudFactory');
const { generateSlug } = require('../../utils/helpers');

const base = createCrudController(Client, {
  imageFields: ['client_img'],
  searchFields: ['client_title'],
  defaultSort: { display_order: 1 },
});

const storeWithSlug = async (req, res) => {
  if (!req.body.client_slug && req.body.client_title) {
    req.body.client_slug = generateSlug(req.body.client_title);
  }
  return base.store(req, res);
};

module.exports = { ...base, store: storeWithSlug };
