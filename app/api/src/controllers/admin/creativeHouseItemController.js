const CreativeHouseItem = require('../../models/CreativeHouseItem');
const createCrudController = require('./crudFactory');
const { generateSlug } = require('../../utils/helpers');
const { getYoutubeVideoId, uploadYoutubeThumbnailToS3, parseCsvOrExcel } = require('../../utils/s3Upload');

const base = createCrudController(CreativeHouseItem, {
  imageFields: ['creative_house_thumbnail'],
  videoFields: ['creative_house_upload_video_url'],
  searchFields: ['creative_house_title', 'creative_house_video_title', 'creative_house_slug'],
  defaultSort: { display_order: 1 },
  parentField: 'creative_house_category_id',
});

// The schema requires `creative_house_title`, while the list table + public web
// read `creative_house_video_title`. Keep the pair in sync both ways so either
// name the client sends resolves to the same value (mirrors the marketing item
// controller pattern).
const mirrorTitle = (body) => {
  const a = body.creative_house_title;
  const b = body.creative_house_video_title;
  if (a !== undefined && a !== '' && (b === undefined || b === '')) body.creative_house_video_title = a;
  else if (b !== undefined && b !== '' && (a === undefined || a === '')) body.creative_house_title = b;
};

const storeWithSlugAndYoutube = async (req, res) => {
  mirrorTitle(req.body);
  if (!req.body.creative_house_slug && req.body.creative_house_title) {
    req.body.creative_house_slug = generateSlug(req.body.creative_house_title);
  }
  if (req.body.creative_house_video_url) {
    const ytId = getYoutubeVideoId(req.body.creative_house_video_url);
    if (ytId) {
      req.body.creative_house_youtube_id = ytId;
      // Only auto-fetch a YouTube thumbnail when the admin didn't supply one
      // (either as a multipart file or as an already-uploaded S3 key/url).
      if (!req.file && !req.body.creative_house_thumbnail) {
        const thumbKey = await uploadYoutubeThumbnailToS3(
          `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
          `${ytId}_${Date.now()}`,
          'creative_thumbnails'
        );
        if (thumbKey) req.body.creative_house_thumbnail = thumbKey;
      }
    }
  }
  return base.store(req, res);
};

const updateWithMirror = async (req, res) => {
  mirrorTitle(req.body);
  return base.update(req, res);
};

const bulkUpload = async (req, res) => {
  if (!req.file) return res.status(400).json({ status: 'error', message: 'No file uploaded' });
  const { parseCsvOrExcel: parse } = require('../../utils/helpers');
  try {
    const rows = await parse(req.file);
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
          'creative_thumbnails'
        );
      }
      const item = await CreativeHouseItem.create({
        creative_house_category_id: req.body.creative_house_category_id,
        creative_house_video_url: videoUrl,
        creative_house_youtube_id: ytId || '',
        creative_house_thumbnail: thumbnailKey,
        creative_house_title: ytId || videoUrl,
        creative_house_slug: generateSlug(ytId || videoUrl),
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

module.exports = { ...base, store: storeWithSlugAndYoutube, update: updateWithMirror, bulkUpload };
