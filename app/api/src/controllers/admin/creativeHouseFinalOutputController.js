const CreativeHouseFinalOutput = require('../../models/CreativeHouseFinalOutput');
const CreativeHouseItem = require('../../models/CreativeHouseItem');
const createCrudController = require('./crudFactory');
const { getYoutubeVideoId, uploadYoutubeThumbnailToS3 } = require('../../utils/s3Upload');

const base = createCrudController(CreativeHouseFinalOutput, {
  imageFields: ['thumbnail'],
  videoFields: ['uploadVideoUrl'],
  searchFields: ['title'],
  defaultSort: { displayOrder: 1 },
  parentField: 'creativeHouseItemId',
  // Surface the parent item's title for the list view.
  lookups: [{
    localField: 'creativeHouseItemId',
    model: CreativeHouseItem,
    nameField: ['title', 'videoTitle'],
    as: 'itemName',
  }],
});

const storeWithYoutube = async (req, res) => {
  const videoUrl = req.body.videoUrl;
  if (videoUrl) {
    const ytId = getYoutubeVideoId(videoUrl);
    if (ytId) {
      req.body.youtubeId = ytId;
      if (!req.file && !req.body.thumbnail) {
        const thumbKey = await uploadYoutubeThumbnailToS3(
          `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
          `${ytId}_${Date.now()}`,
          'creative_outputs'
        );
        if (thumbKey) req.body.thumbnail = thumbKey;
      }
    }
  }
  return base.store(req, res);
};

module.exports = { ...base, store: storeWithYoutube };
