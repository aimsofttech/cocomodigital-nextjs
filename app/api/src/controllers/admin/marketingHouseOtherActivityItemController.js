const MarketingHouseOtherActivityItem = require('../../models/MarketingHouseOtherActivityItem');
const MarketingHouseItem = require('../../models/MarketingHouseItem');
const MarketingHouseCategory = require('../../models/MarketingHouseCategory');
const MarketingHouseOtherActivityCategory = require('../../models/MarketingHouseOtherActivityCategory');
const createCrudController = require('./crudFactory');
const { getYoutubeVideoId } = require('../../utils/s3Upload');

const base = createCrudController(MarketingHouseOtherActivityItem, {
  imageFields: ['item_image'],
  searchFields: ['item_title', 'title'],
  defaultSort: { display_order: 1 },
  parentField: 'marketing_house_item_id',
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
      localField: 'other_activity_category_id',
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
