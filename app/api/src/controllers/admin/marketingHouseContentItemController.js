const MarketingHouseContentCreatedItem = require('../../models/MarketingHouseContentCreatedItem');
const MarketingHouseItem = require('../../models/MarketingHouseItem');
const MarketingHouseCategory = require('../../models/MarketingHouseCategory');
const MarketingHouseContentCreatedCategory = require('../../models/MarketingHouseContentCreatedCategory');
const createCrudController = require('./crudFactory');
const { getYoutubeVideoId, uploadYoutubeThumbnailToS3 } = require('../../utils/s3Upload');
const { parseCsvOrExcel } = require('../../utils/helpers');

const base = createCrudController(MarketingHouseContentCreatedItem, {
  imageFields: ['image', 'item_image'],
  // Uploaded video is an S3 asset (build URL on read, clean from S3 on replace/
  // delete). `url` is a plain external video link.
  videoFields: ['upload_video_url'],
  searchFields: ['item_title', 'title'],
  defaultSort: { display_order: 1 },
  parentField: 'marketing_house_item_id',
  // Resolve related names (record → item → category) plus the linked content
  // category. The item lookup surfaces the item's category id via `extract`,
  // which the category lookup then resolves to a name. Applied to list + show.
  lookups: [
    {
      localField: 'marketing_house_item_id',
      model: MarketingHouseItem,
      nameField: ['title', 'marketing_house_title'],
      as: 'marketing_house_item_name',
      extract: { marketing_house_category_id: 'marketing_house_category_id' },
    },
    {
      localField: 'marketing_house_category_id',
      model: MarketingHouseCategory,
      nameField: ['category_name', 'name'],
      as: 'marketing_house_category_name',
    },
    {
      // The linked content category is stored as `marketing_house_content_created_category_id`.
      localField: 'marketing_house_content_created_category_id',
      model: MarketingHouseContentCreatedCategory,
      nameField: ['category_name', 'name'],
      as: 'content_created_category_name',
    },
  ],
});

const storeWithYoutube = async (req, res) => {
  // The content item's video URL is stored in `url`; auto-derive a thumbnail into
  // `image` only when no image was supplied.
  if (req.body.url) {
    const ytId = getYoutubeVideoId(req.body.url);
    if (ytId) {
      req.body.item_youtube_id = ytId;
      if (!req.file && !req.body.image) {
        const thumbKey = await uploadYoutubeThumbnailToS3(
          `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
          `${ytId}_${Date.now()}`,
          'content_thumbnails'
        );
        if (thumbKey) req.body.image = thumbKey;
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
      let thumbnailKey = null;
      if (ytId) {
        thumbnailKey = await uploadYoutubeThumbnailToS3(
          `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
          `${ytId}_${Date.now()}`,
          'content_thumbnails'
        );
      }
      const item = await MarketingHouseContentCreatedItem.create({
        marketing_house_item_id: req.body.marketing_house_item_id,
        url: videoUrl,
        item_youtube_id: ytId || '',
        image: thumbnailKey,
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

module.exports = { ...base, store: storeWithYoutube, bulkUpload };
