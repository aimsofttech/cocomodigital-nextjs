const MarketingHousePerformance = require('../../models/MarketingHousePerformance');
const MarketingHouseItem = require('../../models/MarketingHouseItem');
const MarketingHouseCategory = require('../../models/MarketingHouseCategory');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(MarketingHousePerformance, {
  imageFields: ['performance_image'],
  // Uploaded video is an S3 asset (build URL on read, clean from S3 on replace/
  // delete). `performance_video_url` is a plain external link.
  videoFields: ['performance_upload_video_url'],
  searchFields: ['performance_title', 'title'],
  defaultSort: { displayOrder: 1 },
  parentField: 'marketingHouseItemId',
  // Resolve the related item/category into readable names (record → item →
  // category): the item lookup surfaces the item's category id via `extract`,
  // which the category lookup then resolves to a name. Applied to list + show.
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
