'use strict';

/**
 * One-time migration: rename all Group Services document keys to camelCase,
 * mirroring the Marketing / Creative House key format.
 *
 * Run:   node scripts/rename-group-service-keys.js     (from app/api)
 *
 * Idempotent: $rename is a no-op for documents without the old key, and the
 * timestamp pass skips documents that already carry Date-typed values.
 *
 * Notes:
 *  - group_service_item: the data key `group_service_slug` (and the schema key
 *    `group_service_item_slug`) both map to `slug`; the data key wins where
 *    both exist. The old unique index is dropped if present.
 *  - group_single_service_portfolio_item: the schema `portfolio_item_*` family
 *    and the data `portfolio_video_*` family both map to the new keys; the
 *    data family wins (second pass).
 *  - GroupTopBanner was already camelCase — not touched.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const COMMON = { display_order: 'displayOrder', user_id: 'userId' };
const FK = {
  group_service_category_id: 'groupServiceCategoryId',
  group_service_item_id: 'groupServiceItemId',
};

const PLANS = [
  ['group_services_category', [{
    ...COMMON,
    service_category_id: 'serviceCategoryId',
    service_item_id: 'serviceItemId',
    explore_our_service_category_id: 'exploreOurServiceCategoryId',
    explore_our_service_item_id: 'exploreOurServiceItemId',
    group_service_category_name: 'name',
    display_direction: 'displayDirection',
  }]],
  ['group_service_item', [{
    ...COMMON,
    group_service_category_id: 'groupServiceCategoryId',
    group_service_item_title: 'title',
    group_service_item_thumbnail: 'thumbnail',
    group_service_item_description: 'description',
    group_service_item_description2: 'description2',
    group_service_item_running_item: 'runningItem',
    group_service_item_slug: 'slug',
  }, {
    group_service_slug: 'slug', // data key wins
  }]],
  ['group_service_category_item', [{ ...COMMON, ...FK }]],
  ['group_single_service_image', [{
    ...COMMON, ...FK,
    single_service_img: 'image',
    image_title: 'imageTitle',
    single_service_description: 'description',
    single_service_upload_video: 'uploadVideoUrl',
    single_service_video_url: 'videoUrl',
    single_service_video_type: 'videoType',
  }]],
  ['group_single_service_recent_work', [{
    ...COMMON, ...FK,
    recent_work_title: 'title',
    recent_work_image: 'image',
    recent_work_video: 'video',
    recent_work_video_thumbnail: 'videoThumbnail',
    recent_work_video_url: 'videoUrl',
    recent_work_youtube_id: 'youtubeId',
  }]],
  ['group_single_service_portfolio_category', [{
    ...COMMON, ...FK,
    portfolio_category_name: 'name',
  }]],
  ['group_single_service_portfolio_item', [{
    ...COMMON, ...FK,
    portfolio_category_id: 'portfolioCategoryId',
    portfolio_item_title: 'title',
    portfolio_item_image: 'image',
    portfolio_item_video_url: 'videoUrl',
    portfolio_item_youtube_id: 'youtubeId',
    portfolio_item_video_type: 'videoType',
  }, {
    portfolio_video_thumbnail: 'videoThumbnail',
    portfolio_video_url: 'videoUrl', // data family wins
  }]],
];

const toDate = (val) => {
  if (val instanceof Date) return val;
  if (val === null || val === undefined || val === '') return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
};

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  try {
    await db.collection('group_service_item').dropIndex('group_service_item_slug_1');
    console.log('dropped index group_service_item_slug_1');
  } catch (e) {
    console.log('index group_service_item_slug_1 not present (ok)');
  }

  for (const [name, stages] of PLANS) {
    const col = db.collection(name);
    for (const [i, renames] of stages.entries()) {
      const res = await col.updateMany({}, { $rename: renames });
      console.log(`${name} stage ${i + 1}: matched ${res.matchedCount}, modified ${res.modifiedCount}`);
    }

    const docs = await col.find({}).toArray();
    let migrated = 0;
    for (const doc of docs) {
      const createdAt = toDate(doc.createdAt) ?? toDate(doc.created_at) ?? new Date();
      const updatedAt = toDate(doc.updatedAt) ?? toDate(doc.updated_at) ?? createdAt;
      const needsSet = !(doc.createdAt instanceof Date) || !(doc.updatedAt instanceof Date);
      const needsUnset = 'created_at' in doc || 'updated_at' in doc;
      if (!needsSet && !needsUnset) continue;
      await col.updateOne(
        { _id: doc._id },
        {
          ...(needsSet ? { $set: { createdAt, updatedAt } } : {}),
          ...(needsUnset ? { $unset: { created_at: '', updated_at: '' } } : {}),
        },
      );
      migrated += 1;
    }
    console.log(`${name} timestamps: ${docs.length} docs, ${migrated} migrated`);
  }

  await mongoose.disconnect();
  console.log('Done.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
