'use strict';

/**
 * One-time backfill: generate a slug from `name` for every ServiceCategory
 * ("Service Department") document whose slug is empty. Uses the same
 * generateSlug helper as the admin CRUD (crudFactory applySlug), with -2/-3
 * suffixing on collisions, so backfilled slugs match what the API would
 * generate on save.
 *
 * Run:   node scripts/backfill-service-department-slugs.js     (from app/api)
 *
 * Idempotent: documents that already have a slug are left untouched.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { generateSlug } = require('../src/utils/helpers');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const col = mongoose.connection.db.collection('explore_our_service_category');

  const docs = await col.find({}).toArray();
  const taken = new Set(
    docs.map((d) => d.slug).filter((s) => typeof s === 'string' && s.trim() !== ''),
  );

  let updated = 0;
  for (const doc of docs) {
    if (typeof doc.slug === 'string' && doc.slug.trim() !== '') continue;
    const base = generateSlug(doc.name);
    if (!base) { console.warn(`skip ${doc._id}: no name to slugify`); continue; }

    let slug = base;
    let counter = 1;
    while (taken.has(slug)) { counter += 1; slug = `${base}-${counter}`; }
    taken.add(slug);

    await col.updateOne({ _id: doc._id }, { $set: { slug } });
    console.log(`${doc.name} -> ${slug}`);
    updated += 1;
  }

  console.log(`Done. ${updated}/${docs.length} documents backfilled.`);
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
