const GroupSingleServiceRecentWork = require('../../models/GroupSingleServiceRecentWork');
const createCrudController = require('./crudFactory');
const { getYoutubeVideoId, uploadYoutubeThumbnailToS3 } = require('../../utils/s3Upload');

const base = createCrudController(GroupSingleServiceRecentWork, { imageFields: ['videoThumbnail'], searchFields: ['title'], defaultSort: { displayOrder: 1 }, parentField: 'groupServiceItemId' });

const storeWithYoutube = async (req, res) => {
  if (req.body.videoUrl) {
    const ytId = getYoutubeVideoId(req.body.videoUrl);
    if (ytId) {
      req.body.youtubeId = ytId;
      if (!req.file) {
        const k = await uploadYoutubeThumbnailToS3(`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`, `${ytId}_${Date.now()}`, 'recent_work');
        if (k) req.body.image = k;
      }
    }
  }
  return base.store(req, res);
};

module.exports = { ...base, store: storeWithYoutube };
