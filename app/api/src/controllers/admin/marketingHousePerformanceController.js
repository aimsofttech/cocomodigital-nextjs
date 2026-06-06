const MarketingHousePerformance = require('../../models/MarketingHousePerformance');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(MarketingHousePerformance, {
  imageFields: ['image'],
  searchFields: ['title'],
  defaultSort: { display_order: 1 },
  parentField: 'marketing_house_item_id',
});
