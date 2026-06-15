const GroupSingleServicePortfolioItem = require('../../models/GroupSingleServicePortfolioItem');
const GroupSingleServicePortfolioCategory = require('../../models/GroupSingleServicePortfolioCategory');
const createCrudController = require('./crudFactory');
const { getYoutubeVideoId, uploadYoutubeThumbnailToS3 } = require('../../utils/s3Upload');

const base = createCrudController(GroupSingleServicePortfolioItem, {
  imageFields: ['portfolio_video_thumbnail'],
  searchFields: ['portfolio_item_title'],
  defaultSort: { display_order: 1 },
  // Scoped by either group_service_item_id (from the Group Service Items link) or
  // portfolio_category_id (from the Portfolio Category link).
  parentField: ['group_service_item_id', 'portfolio_category_id'],
  // Resolve the parent Portfolio Category name for the list/detail responses.
  lookups: [
    {
      localField: 'portfolio_category_id',
      model: GroupSingleServicePortfolioCategory,
      nameField: 'portfolio_category_name',
      as: 'portfolio_category_name',
    },
  ],
});

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
