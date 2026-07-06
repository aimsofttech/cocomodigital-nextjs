const MarketingHouseImage = require('../../models/MarketingHouseImage');
const MarketingHouseItem = require('../../models/MarketingHouseItem');
const MarketingHouseCategory = require('../../models/MarketingHouseCategory');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(MarketingHouseImage, {
  imageFields: ['image'],
  // Uploaded video is an S3 asset: build its URL on read and clean it from S3 on
  // replace/delete. The external `videoUrl` is a plain link.
  videoFields: ['uploadVideoUrl'],
  searchFields: ['image_title'],
  defaultSort: { displayOrder: 1 },
  parentField: 'marketingHouseItemId',
  // Images only store the item id, so the category is resolved through the item
  // (image → item → category). The first lookup surfaces the item's category id
  // via `extract`, which the second lookup then resolves to the category name.
  lookups: [
    {
      localField: 'marketingHouseItemId',
      model: MarketingHouseItem,
      nameField: ['title', 'title'],
      as: 'itemName',
      extract: { marketingHouseCategoryId: 'marketingHouseCategoryId' },
    },
    {
      localField: 'marketingHouseCategoryId',
      model: MarketingHouseCategory,
      nameField: ['name', 'name'],
      as: 'categoryName',
    },
  ],
});
