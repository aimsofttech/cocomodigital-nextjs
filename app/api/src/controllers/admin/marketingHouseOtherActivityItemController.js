const MarketingHouseOtherActivityItem = require('../../models/MarketingHouseOtherActivityItem');
const MarketingHouseItem = require('../../models/MarketingHouseItem');
const MarketingHouseCategory = require('../../models/MarketingHouseCategory');
const MarketingHouseOtherActivityCategory = require('../../models/MarketingHouseOtherActivityCategory');
const createCrudController = require('./crudFactory');
const { getYoutubeVideoId } = require('../../utils/s3Upload');

const base = createCrudController(MarketingHouseOtherActivityItem, {
  // Up to 4 uploaded images: build S3 URLs on read; reconcile/delete from S3 on
  // replace/delete. (`item_image` kept for any legacy single-image records.)
  imageFields: ['item_image', 'image1', 'image2', 'image3', 'image4'],
  searchFields: ['item_title', 'title'],
  defaultSort: { display_order: 1 },
  // Scope the listing by the marketing item and/or the linked activity category.
  // Either can be passed as a query param; the factory matches both string and
  // ObjectId id forms, so it works for legacy and admin-written records alike.
  parentField: ['marketing_house_item_id', 'marketing_house_other_activity_category_id'],
  // Resolve related names (record → item → category) plus the linked other-activity
  // category. The item lookup surfaces the item's category id via `extract`, which
  // the category lookup then resolves to a name. Applied to list + show.
  lookups: [
    {
      localField: 'marketing_house_item_id',
      model: MarketingHouseItem,
      nameField: ['title', 'marketing_house_title'],
      as: 'marketing_house_item_name',
      extract: { marketing_house_category_id: 'marketing_house_category_id' },
    },
    {
      localField: 'marketing_house_category_id',
      model: MarketingHouseCategory,
      nameField: ['category_name', 'name'],
      as: 'marketing_house_category_name',
    },
    {
      // The linked activity category is stored as `marketing_house_other_activity_category_id`.
      localField: 'marketing_house_other_activity_category_id',
      model: MarketingHouseOtherActivityCategory,
      nameField: ['category_name', 'name'],
      as: 'other_activity_category_name',
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
