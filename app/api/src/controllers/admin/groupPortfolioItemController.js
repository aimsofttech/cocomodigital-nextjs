const GroupSingleServicePortfolioItem = require('../../models/GroupSingleServicePortfolioItem');
const createCrudController = require('./crudFactory');
const { getYoutubeVideoId, uploadYoutubeThumbnailToS3 } = require('../../utils/s3Upload');

const base = createCrudController(GroupSingleServicePortfolioItem, { imageFields: ['portfolio_video_thumbnail'], defaultSort: { display_order: 1 }, parentField: 'portfolio_category_id' });

const storeWithYoutube = async (req, res) => {
  if (req.body.portfolio_item_video_url) {
    const ytId = getYoutubeVideoId(req.body.portfolio_item_video_url);
    if (ytId) {
      req.body.portfolio_item_youtube_id = ytId;
      if (!req.file) {
        const k = await uploadYoutubeThumbnailToS3(`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`, `${ytId}_${Date.now()}`, 'portfolio');
        if (k) req.body.portfolio_item_image = k;
      }
    }
  }
  return base.store(req, res);
};

module.exports = { ...base, store: storeWithYoutube };
