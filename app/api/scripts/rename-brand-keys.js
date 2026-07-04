'use strict';

/**
 * One-time migration: rename Brand document keys to camelCase (dropping the
 * legacy `brand_` prefix) and backfill mongoose-standard createdAt/updatedAt
 * from the legacy Laravel created_at/updated_at fields. Mirrors the
 * rename-top-banner-keys + migrate-top-banner-timestamps scripts.
 *
 * Run:   node scripts/rename-brand-keys.js     (from app/api)
 *
 * Idempotent: $rename is a no-op for documents without the old key, and the
 * timestamp pass skips documents that already carry Date-typed values.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const RENAMES = {
  brand_name: 'name',
  brand_image: 'image',
  website_url: 'websiteUrl',
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
  const col = mongoose.connection.db.collection('brands');

  const renameRes = await col.updateMany({}, { $rename: RENAMES });
  console.log(`brands renames: matched ${renameRes.matchedCount}, modified ${renameRes.modifiedCount}`);

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
  console.log(`brands timestamps: ${docs.length} docs, ${migrated} migrated`);

  await mongoose.disconnect();
  console.log('Done.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
