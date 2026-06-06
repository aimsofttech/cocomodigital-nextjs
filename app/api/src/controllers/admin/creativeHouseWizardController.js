const CreativeHouseItem = require('../../models/CreativeHouseItem');
const CreativeHouseApproach = require('../../models/CreativeHouseApproach');
const CreativeHouseFinalOutput = require('../../models/CreativeHouseFinalOutput');
const { generateSlug } = require('../../utils/helpers');
const { getYoutubeVideoId, uploadYoutubeThumbnailToS3 } = require('../../utils/s3Upload');

const wizardStore = {};

const storeStep1 = async (req, res) => {
  const userId = req.user._id.toString();
  const { creative_house_category_id, creative_house_title, creative_house_video_url, creative_house_description } = req.body;

  const slug = generateSlug(creative_house_title);
  const ytId = creative_house_video_url ? getYoutubeVideoId(creative_house_video_url) : null;
  let thumbnailKey = null;
  if (ytId && !req.file) {
    thumbnailKey = await uploadYoutubeThumbnailToS3(
      `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      `${ytId}_${Date.now()}`,
      'creative_thumbnails'
    );
  }

  wizardStore[userId] = {
    step1: {
      creative_house_category_id,
      creative_house_title,
      creative_house_slug: slug,
      creative_house_video_url,
      creative_house_youtube_id: ytId || '',
      creative_house_thumbnail: req.file ? (req.file.key || req.file.path) : thumbnailKey,
      creative_house_description,
    },
  };

  res.json({ status: 'success', message: 'Step 1 saved', data: wizardStore[userId].step1 });
};

const storeStep2 = async (req, res) => {
  const userId = req.user._id.toString();
  if (!wizardStore[userId]) return res.status(400).json({ status: 'error', message: 'Start from step 1' });
  wizardStore[userId].step2 = req.body;
  res.json({ status: 'success', message: 'Step 2 saved' });
};

const storeStep3 = async (req, res) => {
  const userId = req.user._id.toString();
  if (!wizardStore[userId]) return res.status(400).json({ status: 'error', message: 'Start from step 1' });

  const data = wizardStore[userId];
  const item = await CreativeHouseItem.create({ ...data.step1, user_id: req.user._id, status: 0 });

  if (data.step2?.approaches) {
    for (const a of data.step2.approaches) {
      await CreativeHouseApproach.create({ ...a, creative_house_item_id: item._id, user_id: req.user._id });
    }
  }

  if (req.body?.final_outputs) {
    for (const fo of req.body.final_outputs) {
      const ytId = fo.output_video_url ? getYoutubeVideoId(fo.output_video_url) : null;
      await CreativeHouseFinalOutput.create({
        ...fo,
        output_youtube_id: ytId || '',
        creative_house_item_id: item._id,
        user_id: req.user._id,
      });
    }
  }

  delete wizardStore[userId];

  res.status(201).json({ status: 'success', message: 'Creative house item created via wizard', data: item });
};

module.exports = { storeStep1, storeStep2, storeStep3 };
