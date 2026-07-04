'use strict';

/**
 * One-time migration: replace the legacy Laravel `created_at` / `updated_at`
 * keys on TopBanner + GroupTopBanner documents with mongoose's standard
 * `createdAt` / `updatedAt` (proper Date values). Both schemas already run
 * with `timestamps: true`, so mongoose maintains these fields from here on;
 * this script only backfills documents imported directly into MongoDB.
 *
 * Run:   node scripts/migrate-top-banner-timestamps.js     (from app/api)
 *
 * Idempotent: documents that already carry Date-typed createdAt/updatedAt
 * and no legacy keys are left untouched.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const toDate = (val) => {
  if (val instanceof Date) return val;
  if (val === null || val === undefined || val === '') return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
};

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  for (const collection of ['top_banner', 'group_top_banner']) {
    const col = db.collection(collection);
    const docs = await col.find({}).toArray();
    let modified = 0;

    for (const doc of docs) {
      const createdAt =
        toDate(doc.createdAt) ?? toDate(doc.created_at) ?? new Date();
      const updatedAt =
        toDate(doc.updatedAt) ?? toDate(doc.updated_at) ?? createdAt;

      const needsSet =
        !(doc.createdAt instanceof Date) || !(doc.updatedAt instanceof Date);
      const needsUnset =
        'created_at' in doc || 'updated_at' in doc;
      if (!needsSet && !needsUnset) continue;

      await col.updateOne(
        { _id: doc._id },
        {
          ...(needsSet ? { $set: { createdAt, updatedAt } } : {}),
          ...(needsUnset ? { $unset: { created_at: '', updated_at: '' } } : {}),
        },
      );
      modified += 1;
    }

    console.log(`${collection}: ${docs.length} docs, ${modified} migrated`);
  }

  await mongoose.disconnect();
  console.log('Done.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
