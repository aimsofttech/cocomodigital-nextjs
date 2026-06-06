const MarketingHouseItem = require('../../models/MarketingHouseItem');
const createCrudController = require('./crudFactory');
const { generateSlug } = require('../../utils/helpers');
const { uploadYoutubeThumbnailToS3, getYoutubeVideoId } = require('../../utils/s3Upload');
const { parseCsvOrExcel } = require('../../utils/helpers');

const base = createCrudController(MarketingHouseItem, {
  imageFields: ['poster_image'],
  searchFields: ['title', 'marketing_house_slug'],
  defaultSort: { display_order: 1 },
  parentField: 'marketing_house_category_id',
});

const storeWithSlugAndYoutube = async (req, res) => {
  if (!req.body.marketing_house_slug && req.body.title) {
    req.body.marketing_house_slug = generateSlug(req.body.title);
  }
  if (req.body.marketing_video) {
    const ytId = getYoutubeVideoId(req.body.marketing_video);
    if (ytId) {
      req.body.marketing_video_type = ytId;
      if (!req.file) {
        const thumbKey = await uploadYoutubeThumbnailToS3(
          `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
          `${ytId}_${Date.now()}`,
          'marketing_thumbnails'
        );
        if (thumbKey) req.body.poster_image = thumbKey;
      }
    }
  }
  return base.store(req, res);
};

const bulkUpload = async (req, res) => {
  if (!req.file) return res.status(400).json({ status: 'error', message: 'No file uploaded' });
  try {
    const rows = await parseCsvOrExcel(req.file);
    const results = [];
    for (const row of rows) {
      const videoUrl = row[0];
      if (!videoUrl) continue;
      const ytId = getYoutubeVideoId(videoUrl);
      const display_order = row[1] ? parseInt(row[1]) : 0;
      const status = row[2] ? parseInt(row[2]) : 1;
      const item = await MarketingHouseItem.create({
        marketing_house_category_id: req.body.marketing_house_category_id,
        marketing_video: videoUrl,
        marketing_house_youtube_id: ytId || '',
        title: ytId || videoUrl,
        marketing_house_slug: generateSlug(ytId || videoUrl),
        display_order,
        status,
        user_id: req.user._id,
      });
      results.push(item);
    }
    res.status(201).json({ status: 'success', message: `${results.length} items uploaded`, data: results });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
};

module.exports = { ...base, store: storeWithSlugAndYoutube, bulkUpload };
