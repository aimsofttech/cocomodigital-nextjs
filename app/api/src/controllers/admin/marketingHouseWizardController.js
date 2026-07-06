const MarketingHouseCategory = require('../../models/MarketingHouseCategory');
const MarketingHouseItem = require('../../models/MarketingHouseItem');
const MarketingHouseImage = require('../../models/MarketingHouseImage');
const MarketingHouseStatics = require('../../models/MarketingHouseStatics');
const MarketingHousePerformance = require('../../models/MarketingHousePerformance');
const MarketingHouseIdeaStrategyPlanning = require('../../models/MarketingHouseIdeaStrategyPlanning');
const { generateSlug } = require('../../utils/helpers');
const { getYoutubeVideoId, uploadYoutubeThumbnailToS3 } = require('../../utils/s3Upload');

// Wizard stores state server-side in the session equivalent using a temp store per user
// In Node.js we use a simple in-memory store per user session (identified by JWT user id)
const wizardStore = {};

const storeStep1 = async (req, res) => {
  const userId = req.user._id.toString();
  const { marketingHouseCategoryId, title, videoUrl, description } = req.body;

  const slug = generateSlug(title);
  const ytId = videoUrl ? getYoutubeVideoId(videoUrl) : null;
  let thumbnailKey = null;
  if (ytId && !req.file) {
    thumbnailKey = await uploadYoutubeThumbnailToS3(
      `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      `${ytId}_${Date.now()}`,
      'marketing_thumbnails'
    );
  }

  wizardStore[userId] = {
    step1: {
      marketingHouseCategoryId,
      title,
      slug: slug,
      videoUrl,
      youtubeId: ytId || '',
      thumbnail: req.file ? (req.file.key || req.file.path) : thumbnailKey,
      description,
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
  wizardStore[userId].step3 = req.body;
  res.json({ status: 'success', message: 'Step 3 saved' });
};

const storeStep4 = async (req, res) => {
  const userId = req.user._id.toString();
  if (!wizardStore[userId]) return res.status(400).json({ status: 'error', message: 'Start from step 1' });
  wizardStore[userId].step4 = req.body;
  res.json({ status: 'success', message: 'Step 4 saved' });
};

const storeStep5 = async (req, res) => {
  const userId = req.user._id.toString();
  if (!wizardStore[userId]) return res.status(400).json({ status: 'error', message: 'Start from step 1' });
  wizardStore[userId].step5 = req.body;
  res.json({ status: 'success', message: 'Step 5 saved' });
};

const storeStep6 = async (req, res) => {
  const userId = req.user._id.toString();
  if (!wizardStore[userId]) return res.status(400).json({ status: 'error', message: 'Start from step 1' });
  wizardStore[userId].step6 = req.body;
  res.json({ status: 'success', message: 'Step 6 saved' });
};

const storeStep7 = async (req, res) => {
  const userId = req.user._id.toString();
  if (!wizardStore[userId]) return res.status(400).json({ status: 'error', message: 'Start from step 1' });

  const data = wizardStore[userId];
  const item = await MarketingHouseItem.create({ ...data.step1, userId: req.user._id, status: 0 });

  // Create related records from other steps
  if (data.step2?.statics) {
    for (const s of data.step2.statics) {
      await MarketingHouseStatics.create({ ...s, marketingHouseItemId: item._id, userId: req.user._id });
    }
  }
  if (data.step3?.performance) {
    for (const p of data.step3.performance) {
      await MarketingHousePerformance.create({ ...p, marketingHouseItemId: item._id, userId: req.user._id });
    }
  }
  if (data.step5?.idea_strategy) {
    for (const idea of data.step5.idea_strategy) {
      await MarketingHouseIdeaStrategyPlanning.create({ ...idea, marketingHouseItemId: item._id, userId: req.user._id });
    }
  }

  delete wizardStore[userId];

  res.status(201).json({ status: 'success', message: 'Marketing house item created via wizard', data: item });
};

module.exports = { storeStep1, storeStep2, storeStep3, storeStep4, storeStep5, storeStep6, storeStep7 };
