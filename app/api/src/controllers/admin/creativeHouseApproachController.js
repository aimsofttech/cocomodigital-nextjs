const CreativeHouseApproach = require('../../models/CreativeHouseApproach');
const CreativeHouseItem = require('../../models/CreativeHouseItem');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(CreativeHouseApproach, {
  imageFields: ['approach_thumbnail'],
  videoFields: ['approach_upload_video_url'],
  searchFields: ['approach_heading', 'approach_title'],
  defaultSort: { display_order: 1 },
  parentField: 'creative_house_item_id',
  // Surface the parent item's title so the list can show which item each
  // approach belongs to.
  lookups: [{
    localField: 'creative_house_item_id',
    model: CreativeHouseItem,
    nameField: ['creative_house_title', 'creative_house_video_title'],
    as: 'creative_house_item_name',
  }],
});
