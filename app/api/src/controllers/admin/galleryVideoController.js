const GalleryVideo = require('../../models/GalleryVideo');
const createCrudController = require('./crudFactory');
const { getYoutubeVideoId, uploadYoutubeThumbnailToS3 } = require('../../utils/s3Upload');

const base = createCrudController(GalleryVideo, { imageFields: ['thumbnail'], searchFields: ['title'], defaultSort: { displayOrder: 1 } });

const storeWithYoutube = async (req, res) => {
  if (req.body.url) {
    const ytId = getYoutubeVideoId(req.body.url);
    if (ytId) {
      req.body.youtubeId = ytId;
      if (!req.file) {
        const k = await uploadYoutubeThumbnailToS3(`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`, `${ytId}_${Date.now()}`, 'gallery_videos');
        if (k) req.body.thumbnail = k;
      }
    }
  }
  return base.store(req, res);
};

module.exports = { ...base, store: storeWithYoutube };
