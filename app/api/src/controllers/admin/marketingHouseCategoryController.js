const MarketingHouseCategory = require('../../models/MarketingHouseCategory');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(MarketingHouseCategory, { imageFields: ['icon'],
  searchFields: ['name'],
  defaultSort: { displayOrder: 1 },
});
