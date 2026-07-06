'use strict';

/**
 * One-time repair: Group Service items (and the category↔item join rows)
 * migrated from MySQL still hold the category link as the legacy NUMERIC id
 * (e.g. 11) instead of the category's ObjectId, so category-scoped filtering
 * and lookups never match them.
 *
 * The MySQL→Mongo migration preserved insertion order, so legacy id N is the
 * N-th category sorted by _id (verified by eye against real data: 11 →
 * "YouTube Creators Collaboration Services", 40 → "For Brands and Agencies").
 * Same positional technique the creative-house gallery resolver uses.
 *
 * Run:   node scripts/fix-group-service-legacy-category-fks.js   (from app/api)
 * Idempotent: numeric links are converted once; ObjectId links are untouched.
 */

require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const cats = await db.collection('group_services_category').find({}).sort({ _id: 1 }).toArray();
  const byLegacyId = new Map(cats.map((c, i) => [i + 1, c._id]));
  console.log(`categories: ${cats.length} (legacy ids 1..${cats.length})`);

  for (const col of ['group_service_item', 'group_service_category_item']) {
    const rows = await db.collection(col).find({ groupServiceCategoryId: { $type: 'number' } }).toArray();
    let fixed = 0, unmapped = 0;
    for (const row of rows) {
      const oid = byLegacyId.get(row.groupServiceCategoryId);
      if (!oid) { unmapped++; continue; }
      await db.collection(col).updateOne({ _id: row._id }, { $set: { groupServiceCategoryId: oid } });
      fixed++;
    }
    console.log(`${col}: ${rows.length} numeric links — fixed ${fixed}, unmapped ${unmapped}`);
  }

  await mongoose.disconnect();
  console.log('Done.');
})().catch((err) => { console.error(err); process.exit(1); });
