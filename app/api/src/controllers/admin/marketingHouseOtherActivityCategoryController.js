const MarketingHouseOtherActivityCategory = require('../../models/MarketingHouseOtherActivityCategory');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(MarketingHouseOtherActivityCategory, {
  searchFields: ['category_name'],
  defaultSort: { display_order: 1 },
  parentField: 'marketing_house_item_id',
});
