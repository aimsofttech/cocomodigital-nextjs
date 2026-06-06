const MarketingHousePreLaunchActivity = require('../../models/MarketingHousePreLaunchActivity');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(MarketingHousePreLaunchActivity, {
  imageFields: ['image'],
  searchFields: ['title'],
  defaultSort: { display_order: 1 },
  parentField: 'marketing_house_item_id',
});
