const GroupSingleServiceRecentWork = require('../../models/GroupSingleServiceRecentWork');
const createCrudController = require('./crudFactory');
const { getYoutubeVideoId, uploadYoutubeThumbnailToS3 } = require('../../utils/s3Upload');

const base = createCrudController(GroupSingleServiceRecentWork, { imageFields: ['recent_work_video_thumbnail'], searchFields: ['recent_work_title'], defaultSort: { display_order: 1 }, parentField: 'group_service_item_id' });

const storeWithYoutube = async (req, res) => {
  if (req.body.recent_work_video_url) {
    const ytId = getYoutubeVideoId(req.body.recent_work_video_url);
    if (ytId) {
      req.body.recent_work_youtube_id = ytId;
      if (!req.file) {
        const k = await uploadYoutubeThumbnailToS3(`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`, `${ytId}_${Date.now()}`, 'recent_work');
        if (k) req.body.recent_work_image = k;
      }
    }
  }
  return base.store(req, res);
};

module.exports = { ...base, store: storeWithYoutube };
