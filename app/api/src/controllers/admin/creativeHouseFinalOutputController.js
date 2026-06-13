const CreativeHouseFinalOutput = require('../../models/CreativeHouseFinalOutput');
const CreativeHouseItem = require('../../models/CreativeHouseItem');
const createCrudController = require('./crudFactory');
const { getYoutubeVideoId, uploadYoutubeThumbnailToS3 } = require('../../utils/s3Upload');

const base = createCrudController(CreativeHouseFinalOutput, {
  imageFields: ['final_output_thumbnail'],
  videoFields: ['final_output_upload_video_url'],
  searchFields: ['final_output_title', 'output_title'],
  defaultSort: { display_order: 1 },
  parentField: 'creative_house_item_id',
  // Surface the parent item's title for the list view.
  lookups: [{
    localField: 'creative_house_item_id',
    model: CreativeHouseItem,
    nameField: ['creative_house_title', 'creative_house_video_title'],
    as: 'creative_house_item_name',
  }],
});

const storeWithYoutube = async (req, res) => {
  const videoUrl = req.body.final_output_video_url || req.body.output_video_url;
  if (videoUrl) {
    const ytId = getYoutubeVideoId(videoUrl);
    if (ytId) {
      req.body.output_youtube_id = ytId;
      if (!req.file && !req.body.final_output_thumbnail) {
        const thumbKey = await uploadYoutubeThumbnailToS3(
          `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
          `${ytId}_${Date.now()}`,
          'creative_outputs'
        );
        if (thumbKey) req.body.final_output_thumbnail = thumbKey;
      }
    }
  }
  return base.store(req, res);
};

module.exports = { ...base, store: storeWithYoutube };
