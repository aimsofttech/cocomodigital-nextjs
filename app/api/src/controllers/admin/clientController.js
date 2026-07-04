const Client = require('../../models/Client');
const createCrudController = require('./crudFactory');

// Slug generation is handled by crudFactory's applySlug (derives a unique
// `slug` from `title` when none is supplied).
module.exports = createCrudController(Client, {
  imageFields: ['image'],
  searchFields: ['title'],
  defaultSort: { displayOrder: 1 },
});
