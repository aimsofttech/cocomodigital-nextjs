const MarketingHouseContentCreatedItemCarousel = require('../../models/MarketingHouseContentCreatedItemCarousel');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(MarketingHouseContentCreatedItemCarousel, {
  imageFields: ['image'],
  searchFields: [],
  defaultSort: { display_order: 1 },
  parentField: 'marketing_house_item_id',
});
