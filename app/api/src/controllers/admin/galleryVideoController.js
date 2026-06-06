const GalleryVideo = require('../../models/GalleryVideo');
const createCrudController = require('./crudFactory');
const { getYoutubeVideoId, uploadYoutubeThumbnailToS3 } = require('../../utils/s3Upload');

const base = createCrudController(GalleryVideo, { imageFields: [], searchFields: ['video_title'], defaultSort: { display_order: 1 } });

const storeWithYoutube = async (req, res) => {
  if (req.body.video_url) {
    const ytId = getYoutubeVideoId(req.body.video_url);
    if (ytId) {
      req.body.video_youtube_id = ytId;
      if (!req.file) {
        const k = await uploadYoutubeThumbnailToS3(`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`, `${ytId}_${Date.now()}`, 'gallery_videos');
        if (k) req.body.video_thumbnail = k;
      }
    }
  }
  return base.store(req, res);
};

module.exports = { ...base, store: storeWithYoutube };
