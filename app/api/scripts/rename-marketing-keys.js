'use strict';

/**
 * One-time migration: rename ALL Marketing Campaigns module document keys to
 * camelCase (dropping redundant prefixes) and backfill mongoose-standard
 * createdAt/updatedAt. Covers items, images, statics, performance, idea
 * strategy, pre-launch, other activities, content-created, continuity
 * programs, projects and marketing FAQs.
 *
 * Run:   node scripts/rename-marketing-keys.js     (from app/api)
 *
 * Idempotent: $rename is a no-op for documents without the old key, merges
 * only fill blanks, and the timestamp pass skips migrated documents.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const COMMON = { display_order: 'displayOrder', user_id: 'userId' };
const FK = {
  marketing_house_item_id: 'marketingHouseItemId',
  marketing_house_category_id: 'marketingHouseCategoryId',
};

const PLANS = [
  ['marketing_house_items', {
    ...COMMON, ...FK,
    marketing_house_thumbnail: 'thumbnail',
    marketing_house_video_url: 'videoUrl',
    marketing_house_description2: 'description2',
    marketing_house_youtube_id: 'youtubeId',
    marketing_video_type: 'videoType',
    marketing_video: 'video',
    poster_image: 'posterImage',
    display_at_home: 'displayAtHome',
    release_date: 'releaseDate',
    stats_title: 'statsTitle',
    stats_description: 'statsDescription',
    performance_description: 'performanceDescription',
    ideas_strategy_planning_title: 'ideasStrategyPlanningTitle',
    ideas_strategy_planning_description: 'ideasStrategyPlanningDescription',
    ideas_strategy_planning_image: 'ideasStrategyPlanningImage',
    client_requirement_1: 'clientRequirement1',
    client_requirement_2: 'clientRequirement2',
    client_requirement_3: 'clientRequirement3',
    client_requirement_4: 'clientRequirement4',
    client_requirement_5: 'clientRequirement5',
    client_requirement_6: 'clientRequirement6',
    client_requirement_desc: 'clientRequirementDesc',
    client_requirement_text: 'clientRequirementText',
    author_template_id: 'authorTemplateId',
    book_call_template_id: 'bookCallTemplateId',
    our_advantage_template_id: 'ourAdvantageTemplateId',
  }],
  ['marketing_house_images', { ...COMMON, ...FK, marketing_item_video_url: 'videoUrl', marketing_item_upload_video_url: 'uploadVideoUrl' }],
  ['marketing_house_statics', { ...COMMON, ...FK, marketing_house_category_name: 'categoryName', marketing_house_item_name: 'itemName' }],
  ['marketing_house_performance', { ...COMMON, ...FK, sub_title: 'subTitle' }],
  ['marketing_house_idea_strategy_planning', { ...COMMON, ...FK }],
  ['marketing_house_pre_launch_activities', { ...COMMON, ...FK }],
  ['marketing_house_other_activity_category', { ...COMMON, ...FK, category_name: 'name' }],
  ['marketing_house_other_activity_item', { ...COMMON, ...FK, marketing_house_other_activity_category_id: 'marketingHouseOtherActivityCategoryId', other_activity_category_id: 'otherActivityCategoryId' }],
  ['marketing_house_content_created_categories', { ...COMMON, ...FK, category_name: 'name', navigate_to: 'navigateTo' }],
  ['marketing_house_content_created_items', { ...COMMON, ...FK, marketing_house_content_created_category_id: 'marketingHouseContentCreatedCategoryId' }],
  ['marketing_house_content_created_item_carousels', { ...COMMON, ...FK, marketing_house_content_created_category_id: 'marketingHouseContentCreatedCategoryId', carousel_order: 'carouselOrder' }],
  ['marketing_house_community_program', { ...COMMON, ...FK, community_program_category_description: 'description', category_image: 'image' }],
  ['marketing_house_community_program_item', {
    ...COMMON, ...FK,
    community_program_category_id: 'communityProgramCategoryId',
    community_program_item_description: 'description',
    community_program_item_video_url: 'videoUrl',
    community_program_item_video_file: 'videoFile',
    community_program_item_video_thumbnail: 'videoThumbnail',
  }],
  ['marketing_house_project', { ...COMMON, banner_title_template_id: 'bannerTitleTemplateId', book_call_template_id: 'bookCallTemplateId' }],
  ['faqs', { ...COMMON, marketing_house_item_id: 'marketingHouseItemId' }],
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

  // ── Items: merge the dual Laravel/admin key pairs first ─────────
  // `title` (import) vs `marketing_house_title` (admin-written), and
  // `slug` vs `marketing_house_slug`, `description` vs
  // `marketing_house_description`. Prefer the populated value.
  const items = db.collection('marketing_house_items');
  const itemDocs = await items.find({}).toArray();
  let merged = 0;
  for (const doc of itemDocs) {
    const set = {};
    const unset = {};
    if (!doc.title && doc.marketing_house_title) set.title = doc.marketing_house_title;
    if ('marketing_house_title' in doc) unset.marketing_house_title = '';
    if ((!doc.slug || !String(doc.slug).trim()) && doc.marketing_house_slug) set.slug = doc.marketing_house_slug;
    if ('marketing_house_slug' in doc) unset.marketing_house_slug = '';
    if (!doc.description && doc.marketing_house_description) set.description = doc.marketing_house_description;
    if ('marketing_house_description' in doc) unset.marketing_house_description = '';
    if (Object.keys(set).length || Object.keys(unset).length) {
      await items.updateOne({ _id: doc._id }, {
        ...(Object.keys(set).length ? { $set: set } : {}),
        ...(Object.keys(unset).length ? { $unset: unset } : {}),
      });
      merged += 1;
    }
  }
  console.log(`marketing_house_items title/slug/description merges: ${merged}`);

  // Community program categories: name lives in either category_name or
  // community_program_category_name — merge, prefer the specific one.
  const cp = db.collection('marketing_house_community_program');
  const cpDocs = await cp.find({}).toArray();
  for (const doc of cpDocs) {
    const name = doc.community_program_category_name ?? doc.category_name;
    await cp.updateOne({ _id: doc._id }, {
      ...(name !== undefined ? { $set: { name } } : {}),
      $unset: { community_program_category_name: '', category_name: '' },
    });
  }
  console.log(`marketing_house_community_program name merges: ${cpDocs.length}`);

  // ── Generic renames + timestamps for every collection ───────────
  for (const [collection, renames] of PLANS) {
    const col = db.collection(collection);
    const res = await col.updateMany({}, { $rename: renames });
    let migrated = 0;
    const docs = await col.find({}).toArray();
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
    console.log(`${collection}: renamed ${res.modifiedCount}, timestamps ${migrated}/${docs.length}`);
  }

  await mongoose.disconnect();
  console.log('Done.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
