const MarketingHouseOtherActivityItem = require('../../models/MarketingHouseOtherActivityItem');
const MarketingHouseItem = require('../../models/MarketingHouseItem');
const MarketingHouseCategory = require('../../models/MarketingHouseCategory');
const MarketingHouseOtherActivityCategory = require('../../models/MarketingHouseOtherActivityCategory');
const createCrudController = require('./crudFactory');
const { getYoutubeVideoId } = require('../../utils/s3Upload');

const base = createCrudController(MarketingHouseOtherActivityItem, {
  // Up to 4 uploaded images: build S3 URLs on read; reconcile/delete from S3 on
  // replace/delete. (`image` kept for any legacy single-image records.)
  imageFields: ['image', 'image1', 'image2', 'image3', 'image4'],
  searchFields: ['title'],
  defaultSort: { displayOrder: 1 },
  // Scope the listing by the marketing item and/or the linked activity category.
  // Either can be passed as a query param; the factory matches both string and
  // ObjectId id forms, so it works for legacy and admin-written records alike.
  parentField: ['marketingHouseItemId', 'marketingHouseOtherActivityCategoryId'],
  // Resolve related names (record → item → category) plus the linked other-activity
  // category. The item lookup surfaces the item's category id via `extract`, which
  // the category lookup then resolves to a name. Applied to list + show.
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
    {
      // The linked activity category is stored as `marketingHouseOtherActivityCategoryId`.
      localField: 'marketingHouseOtherActivityCategoryId',
      model: MarketingHouseOtherActivityCategory,
      nameField: ['name', 'name'],
      as: 'other_activity_name',
    },
  ],
});

const storeWithYoutube = async (req, res) => {
  if (req.body.video1) {
    req.body._youtube_id_unused = getYoutubeVideoId(req.body.video1) || '';
  }
  return base.store(req, res);
};

module.exports = { ...base, store: storeWithYoutube };
