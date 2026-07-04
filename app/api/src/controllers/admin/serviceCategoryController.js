const ServiceCategory = require('../../models/ServiceCategory');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(ServiceCategory, {
  imageFields: ['icon'],
  searchFields: ['name'],
  defaultSort: { displayOrder: 1 },
});
