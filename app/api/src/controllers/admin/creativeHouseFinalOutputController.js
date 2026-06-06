const CreativeHouseFinalOutput = require('../../models/CreativeHouseFinalOutput');
const createCrudController = require('./crudFactory');
const { getYoutubeVideoId, uploadYoutubeThumbnailToS3 } = require('../../utils/s3Upload');

const base = createCrudController(CreativeHouseFinalOutput, {
  imageFields: ['final_output_thumbnail'],
  defaultSort: { display_order: 1 },
  parentField: 'creative_house_item_id',
});

const storeWithYoutube = async (req, res) => {
  if (req.body.output_video_url) {
    const ytId = getYoutubeVideoId(req.body.output_video_url);
    if (ytId) {
      req.body.output_youtube_id = ytId;
      if (!req.file) {
        const thumbKey = await uploadYoutubeThumbnailToS3(
          `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
          `${ytId}_${Date.now()}`,
          'creative_outputs'
        );
        if (thumbKey) req.body.output_image = thumbKey;
      }
    }
  }
  return base.store(req, res);
};

module.exports = { ...base, store: storeWithYoutube };
