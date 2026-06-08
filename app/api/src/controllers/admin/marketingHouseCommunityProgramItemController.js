const MarketingHouseCommunityProgramCategoryItem = require('../../models/MarketingHouseCommunityProgramCategoryItem');
const MarketingHouseItem = require('../../models/MarketingHouseItem');
const MarketingHouseCategory = require('../../models/MarketingHouseCategory');
const MarketingHouseCommunityProgramCategory = require('../../models/MarketingHouseCommunityProgramCategory');
const createCrudController = require('./crudFactory');
const { getYoutubeVideoId, uploadYoutubeThumbnailToS3 } = require('../../utils/s3Upload');
const { parseCsvOrExcel } = require('../../utils/helpers');

const base = createCrudController(MarketingHouseCommunityProgramCategoryItem, {
  imageFields: ['item_image', 'community_program_item_video_thumbnail'],
  // Uploaded video file is an S3 asset (build URL on read, clean on replace/delete).
  // `community_program_item_video_url` is a plain external link.
  videoFields: ['community_program_item_video_file'],
  searchFields: ['community_program_item_description', 'item_title', 'title'],
  defaultSort: { display_order: 1 },
  parentField: 'marketing_house_item_id',
  // Resolve related names (record → item → category) plus the linked continuity
  // (community program) category. The item lookup surfaces the item's category id
  // via `extract`, which the category lookup then resolves to a name. Applied to
  // list + show.
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
      localField: 'community_program_category_id',
      model: MarketingHouseCommunityProgramCategory,
      // The category's name is stored as `community_program_category_name`.
      nameField: ['community_program_category_name', 'category_name', 'name'],
      as: 'community_program_category_name',
    },
  ],
});

const storeWithYoutube = async (req, res) => {
  if (req.body.community_program_item_video_url) {
    const ytId = getYoutubeVideoId(req.body.community_program_item_video_url);
    if (ytId) {
      req.body._youtube_unused = ytId;
      if (!req.file) {
        const thumbKey = await uploadYoutubeThumbnailToS3(
          `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
          `${ytId}_${Date.now()}`,
          'community_thumbnails'
        );
        if (thumbKey) req.body.community_program_item_video_thumbnail = thumbKey;
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
          'community_thumbnails'
        );
      }
      const item = await MarketingHouseCommunityProgramCategoryItem.create({
        marketing_house_item_id: req.body.marketing_house_item_id,
        community_program_category_id: req.body.community_program_category_id,
        community_program_item_video_url: videoUrl,
        _youtube_unused: ytId || '',
        community_program_item_video_thumbnail: thumbnailKey,
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
