const MarketingHouseCategory = require('../../models/MarketingHouseCategory');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(MarketingHouseCategory, { imageFields: ['marketing_house_icon'],
  searchFields: ['category_name'],
  defaultSort: { display_order: 1 },
});
