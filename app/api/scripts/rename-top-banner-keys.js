'use strict';

/**
 * One-time migration: rename TopBanner + GroupTopBanner document keys to
 * camelCase (and drop the legacy `banner_` / `group_banner_` prefixes).
 *
 * Run:   node scripts/rename-top-banner-keys.js     (from app/api)
 *
 * Idempotent: $rename is a no-op for documents that no longer carry the
 * old key, so re-running is safe.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const TOP_BANNER_RENAMES = {
  sub_heading: 'subHeading',
  banner_button_text: 'buttonText',
  banner_button_url: 'buttonUrl',
  banner_video_thumbnail: 'videoThumbnail',
  banner_video_url: 'videoUrl',
  book_call_template_id: 'bookCallTemplateId',
  display_order: 'displayOrder',
  user_id: 'userId',
};

const GROUP_TOP_BANNER_RENAMES = {
  group_banner_heading: 'heading',
  group_banner_subheading: 'subHeading',
  group_banner_button_text: 'buttonText',
  group_banner_button_url: 'buttonUrl',
  group_banner_img: 'image',
  group_banner_video: 'video',
  group_banner_video_type: 'videoType',
  explore_our_service_category_id: 'exploreOurServiceCategoryId',
  explore_our_service_item_id: 'exploreOurServiceItemId',
  service_category_id: 'serviceCategoryId',
  service_item_id: 'serviceItemId',
  display_order: 'displayOrder',
  user_id: 'userId',
};

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  for (const [collection, renames] of [
    ['top_banner', TOP_BANNER_RENAMES],
    ['group_top_banner', GROUP_TOP_BANNER_RENAMES],
  ]) {
    const res = await db.collection(collection).updateMany({}, { $rename: renames });
    console.log(`${collection}: matched ${res.matchedCount}, modified ${res.modifiedCount}`);
  }

  await mongoose.disconnect();
  console.log('Done.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
