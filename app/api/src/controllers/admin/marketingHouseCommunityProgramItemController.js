const MarketingHouseCommunityProgramCategoryItem = require('../../models/MarketingHouseCommunityProgramCategoryItem');
const MarketingHouseItem = require('../../models/MarketingHouseItem');
const MarketingHouseCategory = require('../../models/MarketingHouseCategory');
const MarketingHouseCommunityProgramCategory = require('../../models/MarketingHouseCommunityProgramCategory');
const createCrudController = require('./crudFactory');
const { getYoutubeVideoId, uploadYoutubeThumbnailToS3 } = require('../../utils/s3Upload');
const { parseCsvOrExcel } = require('../../utils/helpers');

const base = createCrudController(MarketingHouseCommunityProgramCategoryItem, {
  imageFields: ['image', 'videoThumbnail'],
  // Uploaded video file is an S3 asset (build URL on read, clean on replace/delete).
  // `videoUrl` is a plain external link.
  videoFields: ['videoFile'],
  searchFields: ['description', 'item_title', 'title'],
  defaultSort: { displayOrder: 1 },
  parentField: 'marketingHouseItemId',
  // Resolve related names (record → item → category) plus the linked continuity
  // (community program) category. The item lookup surfaces the item's category id
  // via `extract`, which the category lookup then resolves to a name. Applied to
  // list + show.
  lookups: [
    {
      localField: 'marketingHouseItemId',
      model: MarketingHouseItem,
      nameField: ['title', 'title'],
      as: 'itemName',
      extract: { marketingHouseCategoryId: 'marketingHouseCategoryId' },
    },
    {
      localField: 'marketingHouseCategoryId',
      model: MarketingHouseCategory,
      nameField: ['name', 'name'],
      as: 'categoryName',
    },
    {
      localField: 'communityProgramCategoryId',
      model: MarketingHouseCommunityProgramCategory,
      // The category's name is stored as `name`.
      nameField: ['name', 'name', 'name'],
      as: 'name',
    },
  ],
});

const storeWithYoutube = async (req, res) => {
  if (req.body.videoUrl) {
    const ytId = getYoutubeVideoId(req.body.videoUrl);
    if (ytId) {
      req.body._youtube_unused = ytId;
      if (!req.file) {
        const thumbKey = await uploadYoutubeThumbnailToS3(
          `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
          `${ytId}_${Date.now()}`,
          'community_thumbnails'
        );
        if (thumbKey) req.body.videoThumbnail = thumbKey;
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
      const displayOrder = row[1] ? parseInt(row[1]) : 0;
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
        marketingHouseItemId: req.body.marketingHouseItemId,
        communityProgramCategoryId: req.body.communityProgramCategoryId,
        videoUrl: videoUrl,
        _youtube_unused: ytId || '',
        videoThumbnail: thumbnailKey,
        displayOrder,
        status,
        userId: req.user._id,
      });
      results.push(item);
    }
    res.status(201).json({ status: 'success', message: `${results.length} items uploaded`, data: results });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
};

module.exports = { ...base, store: storeWithYoutube, bulkUpload };
