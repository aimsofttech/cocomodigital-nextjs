'use strict';

/**
 * One-time migration: rename Blog module document keys to camelCase —
 * blog_categories, blog_sub_categories, blog_items. Also moves the unique
 * slug index from blog_slug to slug.
 *
 * Run:   node scripts/rename-blog-keys.js     (from app/api)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { rename, fillRename, fixTimestamps, moveUniqueIndex } = require('./_renameHelpers');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const categories = db.collection('blog_categories');
  // Oldest import keys first (fill-only), then the canonical admin key wins.
  await fillRename(categories, 'category_name', 'name');
  await fillRename(categories, 'category_slug', 'slug');
  await rename(categories, {
    blog_category_name: 'name',
    display_order: 'displayOrder',
    user_id: 'userId',
  });
  await fixTimestamps(categories);

  const subs = db.collection('blog_sub_categories');
  await fillRename(subs, 'sub_category_name', 'name');
  await fillRename(subs, 'sub_category_slug', 'slug');
  await rename(subs, {
    blog_category_id: 'blogCategoryId',
    blog_sub_category_name: 'name',
    blog_sub_category_slug: 'slug', // admin-managed slug wins
    display_order: 'displayOrder',
    user_id: 'userId',
  });
  await fixTimestamps(subs);

  const items = db.collection('blog_items');
  await rename(items, {
    blog_category_id: 'blogCategoryId',
    blog_sub_category_id: 'blogSubCategoryId',
    author_template_id: 'authorTemplateId',
    blog_title: 'title',
    blog_description: 'description',
    blog_content: 'content',
    blog_meta_title: 'metaTitle',
    blog_meta_description: 'metaDescription',
    blog_meta_keyword: 'metaKeyword',
    blog_tags: 'tags',
    read_time: 'readTime',
    published_at: 'publishedAt',
    display_order: 'displayOrder',
    user_id: 'userId',
  });
  // Cover image: main_image is the real data key; blog_thumbnail wins if a
  // (newer) row somehow carries both.
  await fillRename(items, 'main_image', 'thumbnail');
  await rename(items, { blog_thumbnail: 'thumbnail' }, { blog_thumbnail: { $exists: true } });
  // Slug: the non-unique legacy blog_item_slug only fills gaps; the unique
  // blog_slug is authoritative and overwrites.
  await fillRename(items, 'blog_item_slug', 'slug');
  await rename(items, { blog_slug: 'slug' });
  await fixTimestamps(items);
  try { await items.dropIndex('blog_slug_1'); console.log('  blog_items: dropped index blog_slug_1'); } catch (e) { console.log(`  blog_items: blog_slug_1 not present (${e.codeName || e.message})`); }
  // Replace the pre-existing NON-unique slug_1 index with a unique one.
  await moveUniqueIndex(items, 'slug_1', 'slug');

  await mongoose.disconnect();
  console.log('rename-blog-keys: done');
})().catch((err) => { console.error(err); process.exit(1); });
