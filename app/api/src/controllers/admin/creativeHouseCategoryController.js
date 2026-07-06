const CreativeHouseCategory = require('../../models/CreativeHouseCategory');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(CreativeHouseCategory, { imageFields: ['icon'],
  searchFields: ['name'],
  slugField: 'slug',
  defaultSort: { displayOrder: 1 },
});
