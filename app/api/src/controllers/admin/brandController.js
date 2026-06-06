const Brand = require('../../models/Brand');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(Brand, {
  imageFields: ['brand_image'],
  searchFields: ['brand_name'],
  defaultSort: { display_order: 1 },
});
