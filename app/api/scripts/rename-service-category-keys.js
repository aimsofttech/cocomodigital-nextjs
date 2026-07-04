'use strict';

/**
 * One-time migration: rename ServiceItem ("Service Category") document keys
 * to camelCase (dropping the legacy `service_` prefix), fold `service_slug`
 * into the standard `slug` field, drop the stale unique index on
 * service_slug, and backfill mongoose-standard createdAt/updatedAt from the
 * legacy Laravel created_at/updated_at fields. Mirrors
 * rename-service-department-keys.js.
 *
 * Run:   node scripts/rename-service-category-keys.js     (from app/api)
 *
 * Idempotent: $rename is a no-op for documents without the old key, the
 * index drop is skipped when absent, and the timestamp pass skips documents
 * that already carry Date-typed values.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const RENAMES = {
  service_title: 'title',
  service_slug: 'slug',
  service_image: 'image',
  service_video_url: 'videoUrl',
  button_text: 'buttonText',
  button_url: 'buttonUrl',
  service_category_id: 'serviceCategoryId',
  display_order: 'displayOrder',
  user_id: 'userId',
};

const toDate = (val) => {
  if (val instanceof Date) return val;
  if (val === null || val === undefined || val === '') return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
};

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const col = mongoose.connection.db.collection('explore_our_service_item');

  // The legacy schema had `service_slug` with a unique index; after the
  // rename every document "misses" that field, so the stale unique index
  // would reject inserts (duplicate null). Drop it.
  const indexes = await col.indexes();
  for (const idx of indexes) {
    if (idx.key && idx.key.service_slug !== undefined) {
      await col.dropIndex(idx.name);
      console.log(`dropped stale index ${idx.name}`);
    }
  }

  const renameRes = await col.updateMany({}, { $rename: RENAMES });
  console.log(`explore_our_service_item renames: matched ${renameRes.matchedCount}, modified ${renameRes.modifiedCount}`);

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
  console.log(`explore_our_service_item timestamps: ${docs.length} docs, ${migrated} migrated`);

  await mongoose.disconnect();
  console.log('Done.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
