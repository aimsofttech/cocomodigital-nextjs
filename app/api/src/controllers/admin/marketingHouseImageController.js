const MarketingHouseImage = require('../../models/MarketingHouseImage');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(MarketingHouseImage, {
  imageFields: ['image'],
  searchFields: ['image_title'],
  defaultSort: { display_order: 1 },
  parentField: 'marketing_house_item_id',
});
