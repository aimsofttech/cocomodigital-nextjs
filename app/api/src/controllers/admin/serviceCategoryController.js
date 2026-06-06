const ServiceCategory = require('../../models/ServiceCategory');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(ServiceCategory, { imageFields: ['service_icon'],
  searchFields: ['service_category_name'],
  defaultSort: { display_order: 1 },
});
