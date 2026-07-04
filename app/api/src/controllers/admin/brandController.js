const Brand = require('../../models/Brand');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(Brand, {
  imageFields: ['image'],
  searchFields: ['name'],
  defaultSort: { displayOrder: 1 },
});
