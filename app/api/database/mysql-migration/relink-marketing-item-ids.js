'use strict';
/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  RE-LINK marketing-house child collections to their Mongo item _id        ║
 * ║                                                                            ║
 * ║  PROBLEM                                                                    ║
 * ║  The live Mongo child collections (statics, images, idea-strategy, …)     ║
 * ║  still reference their parent item by the OLD MySQL integer id             ║
 * ║  (`marketing_house_item_id` = 22, 25, …). The items themselves were        ║
 * ║  migrated with fresh random ObjectIds and their integer id was dropped,    ║
 * ║  so there is no shared key and per-item counts/navigation resolve to 0.    ║
 * ║                                                                            ║
 * ║  RECOVERY KEY                                                               ║
 * ║  `marketing_house_slug` is preserved (unique) on the Mongo items AND       ║
 * ║  exists on the MySQL `marketing_house_items` rows. So:                      ║
 * ║      MySQL id ──(slug)──▶ Mongo item _id                                    ║
 * ║                                                                            ║
 * ║  WHAT THIS DOES                                                             ║
 * ║  For every child collection, rewrites the numeric `marketing_house_item_id`║
 * ║  to the matching item's ObjectId (stored as a STRING — exactly how the     ║
 * ║  admin forms write it). The original numeric value is preserved in         ║
 * ║  `legacy_marketing_house_item_id` so the change is fully reversible.        ║
 * ║                                                                            ║
 * ║  SAFE BY DEFAULT                                                            ║
 * ║   • Idempotent — already-converted docs are skipped.                        ║
 * ║   • Dry-run by default; pass --commit to actually write.                    ║
 * ║   • Per-collection report of matched / skipped / unmatched.                 ║
 * ║                                                                            ║
 * ║  USAGE                                                                      ║
 * ║     cd app/api/database/mysql-migration                                     ║
 * ║     npm install                 # installs mysql2 + mongoose                ║
 * ║     node relink-marketing-item-ids.js            # dry-run (no writes)      ║
 * ║     node relink-marketing-item-ids.js --commit   # apply changes           ║
 * ║                                                                            ║
 * ║  Requires the original MySQL DB (cocma_digital_db) to be reachable — see   ║
 * ║  ./config.js for connection settings.                                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const mysql = require('mysql2/promise');
const mongoose = require('mongoose');
const config = require('./config');

const COMMIT = process.argv.includes('--commit');

// Live Mongo collections that carry `marketing_house_item_id` pointing at a
// marketing item. (These are the app's actual collection names — note the
// snake_case, distinct from the migration's camelCase output names.)
const CHILD_COLLECTIONS = [
  'marketing_house_statics',
  'marketing_house_images',
  'marketing_house_idea_strategy_planning',
  'marketing_house_pre_launch_activities',
  'marketing_house_performance',
  'marketing_house_other_activity_category',
  'marketing_house_other_activity_item',
  'marketing_house_content_created_categories',
  'marketing_house_content_created_items',
  'marketing_house_content_created_item_carousels',
  'marketing_house_community_program',
  'marketing_house_community_program_item',
  'faqs',
];

const LEGACY_FIELD = 'legacy_marketing_house_item_id';
const c = { g: (s) => `\x1b[32m${s}\x1b[0m`, y: (s) => `\x1b[33m${s}\x1b[0m`, r: (s) => `\x1b[31m${s}\x1b[0m`, b: (s) => `\x1b[1m${s}\x1b[0m`, d: (s) => `\x1b[2m${s}\x1b[0m` };

async function main() {
  console.log('\n' + c.b('═'.repeat(70)));
  console.log(c.b('  RE-LINK marketing child collections → item ObjectId'));
  console.log(c.b(`  MODE: ${COMMIT ? c.r('COMMIT (writing changes)') : c.y('DRY-RUN (no writes — pass --commit to apply)')}`));
  console.log(c.b('═'.repeat(70)));

  // ── 1. Build mysqlId → slug from the original MySQL items table ────────────
  console.log('\n▶ Connecting to MySQL (' + config.mysql.database + ')…');
  const sql = await mysql.createConnection(config.mysql);
  const [rows] = await sql.query('SELECT id, marketing_house_slug FROM marketing_house_items');
  await sql.end();
  const mysqlIdToSlug = new Map();
  let noSlug = 0;
  for (const row of rows) {
    if (row.marketing_house_slug) mysqlIdToSlug.set(Number(row.id), String(row.marketing_house_slug));
    else noSlug++;
  }
  console.log(`  ✓ MySQL items: ${rows.length} (with slug: ${mysqlIdToSlug.size}, missing slug: ${noSlug})`);

  // ── 2. Build slug → Mongo ObjectId from the live items collection ──────────
  console.log('\n▶ Connecting to MongoDB…');
  await mongoose.connect(config.mongodb.uri);
  const db = mongoose.connection.db;
  const mongoItems = await db.collection('marketing_house_items')
    .find({}, { projection: { _id: 1, marketing_house_slug: 1 } }).toArray();
  const slugToObjectId = new Map();
  let dupSlug = 0;
  for (const it of mongoItems) {
    const slug = it.marketing_house_slug;
    if (!slug) continue;
    if (slugToObjectId.has(slug)) dupSlug++;
    slugToObjectId.set(String(slug), String(it._id));
  }
  console.log(`  ✓ Mongo items: ${mongoItems.length} (unique slugs: ${slugToObjectId.size}, duplicate slugs: ${dupSlug})`);

  // ── 3. Compose mysqlId → ObjectId ──────────────────────────────────────────
  const mysqlIdToObjectId = new Map();
  let unmatchedSlugs = 0;
  for (const [mysqlId, slug] of mysqlIdToSlug.entries()) {
    const oid = slugToObjectId.get(slug);
    if (oid) mysqlIdToObjectId.set(mysqlId, oid);
    else unmatchedSlugs++;
  }
  console.log(`\n▶ Mapping built: ${c.g(mysqlIdToObjectId.size)} mysqlId→ObjectId pairs` +
    (unmatchedSlugs ? c.y(`  (${unmatchedSlugs} MySQL slugs had no matching Mongo item)`) : ''));

  if (!mysqlIdToObjectId.size) {
    console.log(c.r('\n  ✗ No mapping could be built — aborting. Check that MySQL slugs match Mongo slugs.'));
    await mongoose.disconnect();
    process.exit(1);
  }

  // ── 4. Re-point each child collection ──────────────────────────────────────
  console.log('\n▶ Processing child collections…\n');
  console.log(`  ${'Collection'.padEnd(46)} ${'total'.padStart(7)} ${'relink'.padStart(7)} ${'done'.padStart(6)} ${'nolink'.padStart(7)}`);
  console.log('  ' + '─'.repeat(78));

  let grandRelink = 0, grandUnmatched = 0;
  for (const coll of CHILD_COLLECTIONS) {
    const col = db.collection(coll);
    const total = await col.countDocuments().catch(() => null);
    if (total === null) { console.log(`  ${coll.padEnd(46)} ${c.d('(missing collection)')}`); continue; }

    // Only docs whose FK is still a Number need re-linking. Docs already holding
    // an ObjectId/string are left untouched (idempotent re-runs).
    const cursor = col.find({ marketing_house_item_id: { $type: 'number' } },
      { projection: { _id: 1, marketing_house_item_id: 1 } });

    let relinked = 0, unmatched = 0;
    const unmatchedIds = new Set();
    let ops = [];
    for await (const doc of cursor) {
      const oid = mysqlIdToObjectId.get(Number(doc.marketing_house_item_id));
      if (!oid) { unmatched++; unmatchedIds.add(doc.marketing_house_item_id); continue; }
      relinked++;
      if (COMMIT) {
        ops.push({
          updateOne: {
            filter: { _id: doc._id },
            update: {
              $set: { marketing_house_item_id: oid, [LEGACY_FIELD]: doc.marketing_house_item_id },
            },
          },
        });
        if (ops.length >= 1000) { await col.bulkWrite(ops, { ordered: false }); ops = []; }
      }
    }
    if (COMMIT && ops.length) await col.bulkWrite(ops, { ordered: false });

    const alreadyDone = total - relinked - unmatched;
    grandRelink += relinked; grandUnmatched += unmatched;
    const flag = unmatched ? c.y('⚠') : c.g('✓');
    console.log(`  ${flag} ${coll.padEnd(44)} ${String(total).padStart(7)} ${String(relinked).padStart(7)} ${String(alreadyDone).padStart(6)} ${String(unmatched).padStart(7)}` +
      (unmatched ? c.d(`   unmatched ids: ${[...unmatchedIds].slice(0, 10).join(',')}${unmatchedIds.size > 10 ? '…' : ''}`) : ''));
  }

  console.log('  ' + '─'.repeat(78));
  console.log(`  ${(COMMIT ? 'RE-LINKED' : 'WOULD RE-LINK').padEnd(46)} ${''.padStart(7)} ${c.g(String(grandRelink).padStart(7))}` +
    (grandUnmatched ? `  ${c.y('unmatched: ' + grandUnmatched)}` : ''));

  if (!COMMIT) {
    console.log(c.y('\n  Dry-run only. Re-run with --commit to apply these changes.'));
  } else {
    console.log(c.g('\n  ✅ Done. Original numeric ids preserved in `' + LEGACY_FIELD + '` (reversible).'));
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(c.r('\n❌ FATAL: ' + err.message));
  console.error(err.stack);
  process.exit(1);
});
