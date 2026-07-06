const GroupSingleServicePortfolioItem = require('../../models/GroupSingleServicePortfolioItem');
const GroupSingleServicePortfolioCategory = require('../../models/GroupSingleServicePortfolioCategory');
const createCrudController = require('./crudFactory');
const { getYoutubeVideoId, uploadYoutubeThumbnailToS3 } = require('../../utils/s3Upload');

const base = createCrudController(GroupSingleServicePortfolioItem, {
  imageFields: ['videoThumbnail'],
  searchFields: ['title'],
  defaultSort: { displayOrder: 1 },
  // Scoped by either groupServiceItemId (from the Group Service Items link) or
  // portfolioCategoryId (from the Portfolio Category link).
  parentField: ['groupServiceItemId', 'portfolioCategoryId'],
  // Resolve the parent Portfolio Category name for the list/detail responses.
  lookups: [
    {
      localField: 'portfolioCategoryId',
      model: GroupSingleServicePortfolioCategory,
      nameField: 'name',
      as: 'categoryName',
    },
  ],
});

const storeWithYoutube = async (req, res) => {
  if (req.body.videoUrl) {
    const ytId = getYoutubeVideoId(req.body.videoUrl);
    if (ytId) {
      req.body.youtubeId = ytId;
      if (!req.file) {
        const k = await uploadYoutubeThumbnailToS3(`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`, `${ytId}_${Date.now()}`, 'portfolio');
        if (k) req.body.image = k;
      }
    }
  }
  return base.store(req, res);
};

module.exports = { ...base, store: storeWithYoutube };
