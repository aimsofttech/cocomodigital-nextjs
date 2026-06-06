const CreativeHouseApproach = require('../../models/CreativeHouseApproach');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(CreativeHouseApproach, {
  imageFields: ['approach_thumbnail'],
  searchFields: ['approach_title'],
  defaultSort: { display_order: 1 },
  parentField: 'creative_house_item_id',
});
