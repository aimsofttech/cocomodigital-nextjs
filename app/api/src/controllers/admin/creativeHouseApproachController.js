const CreativeHouseApproach = require('../../models/CreativeHouseApproach');
const CreativeHouseItem = require('../../models/CreativeHouseItem');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(CreativeHouseApproach, {
  imageFields: ['thumbnail'],
  videoFields: ['uploadVideoUrl'],
  searchFields: ['heading', 'title'],
  defaultSort: { displayOrder: 1 },
  parentField: 'creativeHouseItemId',
  // Surface the parent item's title so the list can show which item each
  // approach belongs to.
  lookups: [{
    localField: 'creativeHouseItemId',
    model: CreativeHouseItem,
    nameField: ['title', 'videoTitle'],
    as: 'itemName',
  }],
});
