const MarketingHouseOtherActivityItem = require('../../models/MarketingHouseOtherActivityItem');
const createCrudController = require('./crudFactory');
const { getYoutubeVideoId } = require('../../utils/s3Upload');

const base = createCrudController(MarketingHouseOtherActivityItem, {
  imageFields: ['image1'],
  searchFields: ['title'],
  defaultSort: { display_order: 1 },
  parentField: 'marketing_house_item_id',
});

const storeWithYoutube = async (req, res) => {
  if (req.body.video1) {
    req.body._youtube_id_unused = getYoutubeVideoId(req.body.video1) || '';
  }
  return base.store(req, res);
};

module.exports = { ...base, store: storeWithYoutube };
