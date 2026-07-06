'use strict';

/**
 * One-time migration: rename all Creative House document keys to camelCase,
 * mirroring the Marketing Campaigns key format (rename-marketing-keys.js).
 *
 * Run:   node scripts/rename-creative-keys.js     (from app/api)
 *
 * Idempotent: $rename is a no-op for documents without the old key, and the
 * timestamp pass skips documents that already carry Date-typed values.
 *
 * Special cases:
 *  - creative_house_item: `slug` and `creative_house_slug` both existed; the
 *    legacy `creative_house_slug` wins where both are present (it is the value
 *    the public site routes by). The old unique index on it is dropped.
 *  - creative_house_final_ouptut (collection name typo is historical): the
 *    legacy `output_*` and newer `final_output_*` families both map to the
 *    same new keys; the rename runs in two passes so `final_output_*` wins.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const COMMON = { display_order: 'displayOrder', user_id: 'userId' };
const FK = {
  creative_house_item_id: 'creativeHouseItemId',
  creative_house_category_id: 'creativeHouseCategoryId',
};

// [collection, [renameStage1, renameStage2, ...]]
const PLANS = [
  ['creative_house_category', [{
    ...COMMON,
    creative_house_category_slug: 'slug',
    creative_house_category_name: 'name',
    creative_house_icon: 'icon',
  }]],
  ['creative_house_item', [{
    ...COMMON, ...FK,
    creative_house_title: 'title',
    creative_house_video_title: 'videoTitle',
    creative_house_thumbnail: 'thumbnail',
    creative_house_upload_video_url: 'uploadVideoUrl',
    creative_house_video_url: 'videoUrl',
    creative_house_youtube_id: 'youtubeId',
    creative_house_description: 'description',
    creative_house_description2: 'description2',
    creative_house_year: 'year',
    creative_house_display_at_home: 'displayAtHome',
    author_template_id: 'authorTemplateId',
    book_call_template_id: 'bookCallTemplateId',
    requirement_title: 'requirementTitle',
    requirement_description: 'requirementDescription',
    // legacy slug wins over any mirrored bare `slug` ($rename overwrites)
    creative_house_slug: 'slug',
  }]],
  ['creative_house_approach', [{
    ...COMMON, ...FK,
    approach_heading: 'heading',
    approach_title: 'title',
    approach_description: 'description',
    approach_image: 'image',
    approach_thumbnail: 'thumbnail',
    approach_upload_video_url: 'uploadVideoUrl',
    approach_video_url: 'videoUrl',
    approach_youtube_id: 'youtubeId',
  }]],
  ['creative_house_final_ouptut', [
    { // stage 1: oldest key family
      output_title: 'title',
      output_image: 'image',
      output_video_url: 'videoUrl',
      output_youtube_id: 'youtubeId',
    },
    { // stage 2: newer family wins where both exist
      ...COMMON, ...FK,
      final_output_title: 'title',
      final_output_thumbnail: 'thumbnail',
      final_output_upload_video_url: 'uploadVideoUrl',
      final_output_video_url: 'videoUrl',
      final_output_youtube_id: 'youtubeId',
    },
  ]],
  ['creative_house_project', [{
    ...COMMON, ...FK,
    project_title: 'title',
    project_image: 'image',
    project_video_url: 'videoUrl',
    project_description: 'description',
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

  // Drop the legacy unique index on the item slug before renaming into `slug`.
  try {
    await db.collection('creative_house_item').dropIndex('creative_house_slug_1');
    console.log('dropped index creative_house_slug_1');
  } catch (e) {
    console.log('index creative_house_slug_1 not present (ok)');
  }

  // Backfill: legacy items often carry only videoTitle (no title) — mirror the
  // pair both ways so the required `title` is always present.
  {
    const items = mongoose.connection.db.collection('creative_house_item');
    const a = await items.updateMany(
      { $and: [{ $or: [{ title: null }, { title: '' }, { title: { $exists: false } }] }, { videoTitle: { $nin: [null, ''] } }] },
      [{ $set: { title: '$videoTitle' } }],
    );
    const b = await items.updateMany(
      { $and: [{ $or: [{ videoTitle: null }, { videoTitle: '' }, { videoTitle: { $exists: false } }] }, { title: { $nin: [null, ''] } }] },
      [{ $set: { videoTitle: '$title' } }],
    );
    console.log(`title mirror: title<=videoTitle ${a.modifiedCount}, videoTitle<=title ${b.modifiedCount}`);
  }

  for (const [name, stages] of PLANS) {
    const col = db.collection(name);
    for (const [i, renames] of stages.entries()) {
      const res = await col.updateMany({}, { $rename: renames });
      console.log(`${name} stage ${i + 1}: matched ${res.matchedCount}, modified ${res.modifiedCount}`);
    }

    // Backfill mongoose-standard timestamps from legacy created_at/updated_at.
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
