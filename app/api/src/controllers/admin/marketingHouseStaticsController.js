const MarketingHouseStatics = require('../../models/MarketingHouseStatics');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(MarketingHouseStatics, {
  searchFields: ['name'],
  defaultSort: { display_order: 1 },
  parentField: 'marketing_house_item_id',
});
