const MarketingHouseContentCreatedCategory = require('../../models/MarketingHouseContentCreatedCategory');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(MarketingHouseContentCreatedCategory, {
  searchFields: ['category_name'],
  defaultSort: { display_order: 1 },
  parentField: 'marketing_house_item_id',
});
