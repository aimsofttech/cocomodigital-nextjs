const MarketingHouseIdeaStrategyPlanning = require('../../models/MarketingHouseIdeaStrategyPlanning');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(MarketingHouseIdeaStrategyPlanning, {
  imageFields: ['image'],
  searchFields: ['title'],
  defaultSort: { display_order: 1 },
  parentField: 'marketing_house_item_id',
});
