const MarketingHouseContentCreatedItemCarousel = require('../../models/MarketingHouseContentCreatedItemCarousel');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(MarketingHouseContentCreatedItemCarousel, {
  imageFields: ['image'],
  searchFields: [],
  defaultSort: { displayOrder: 1 },
  parentField: 'marketingHouseItemId',
});
