'use strict';

/**
 * One-time migration: rename HomePageSection ("Media Portfolio → Section
 * Categories") document keys to camelCase and backfill mongoose-standard
 * createdAt/updatedAt from the legacy Laravel created_at/updated_at fields.
 * Mirrors rename-brand-keys.js.
 *
 * Run:   node scripts/rename-home-page-section-keys.js     (from app/api)
 *
 * Idempotent: $rename is a no-op for documents without the old key, and the
 * timestamp pass skips documents that already carry Date-typed values.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const RENAMES = {
  category_name: 'name',
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
  const col = mongoose.connection.db.collection('home_page_sections');

  const renameRes = await col.updateMany({}, { $rename: RENAMES });
  console.log(`home_page_sections renames: matched ${renameRes.matchedCount}, modified ${renameRes.modifiedCount}`);

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
  console.log(`home_page_sections timestamps: ${docs.length} docs, ${migrated} migrated`);

  await mongoose.disconnect();
  console.log('Done.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
