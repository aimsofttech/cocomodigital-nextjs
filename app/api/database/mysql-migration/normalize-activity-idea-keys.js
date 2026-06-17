'use strict';
/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  NORMALISE field keys for the "Our Activities" child collections          ║
 * ║                                                                            ║
 * ║  PROBLEM                                                                    ║
 * ║  The two collections feeding the web "Our Activities" section use          ║
 * ║  differently-prefixed keys for the same concept, so the web/admin layers   ║
 * ║  had to special-case each one (and some reads silently returned undefined):║
 * ║                                                                            ║
 * ║    marketing_house_idea_strategy_planning : idea_title / idea_description / ║
 * ║                                             idea_image                      ║
 * ║    marketing_house_pre_launch_activities  : activity_title /               ║
 * ║                                             activity_description /          ║
 * ║                                             activity_image                  ║
 * ║                                                                            ║
 * ║  WHAT THIS DOES                                                             ║
 * ║  Renames those prefixed fields to the shared, plain keys:                  ║
 * ║      *_title       → title                                                 ║
 * ║      *_description → description                                           ║
 * ║      *_image       → image                                                 ║
 * ║                                                                            ║
 * ║  SAFE BY DEFAULT                                                            ║
 * ║   • Idempotent — only docs that still carry the old key are touched.        ║
 * ║   • Dry-run by default; pass --commit to actually write.                    ║
 * ║   • Uses $rename, which preserves the value (no data loss).                 ║
 * ║                                                                            ║
 * ║  USAGE                                                                      ║
 * ║     cd app/api/database/mysql-migration                                     ║
 * ║     node normalize-activity-idea-keys.js            # dry-run (no writes)   ║
 * ║     node normalize-activity-idea-keys.js --commit   # apply changes        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const mongoose = require('mongoose');
const config = require('./config');

const COMMIT = process.argv.includes('--commit');

// collection → { oldKey: newKey } map of renames to apply.
const RENAMES = [
  {
    collection: 'marketing_house_idea_strategy_planning',
    fields: { idea_title: 'title', idea_description: 'description', idea_image: 'image' },
  },
  {
    collection: 'marketing_house_pre_launch_activities',
    fields: { activity_title: 'title', activity_description: 'description', activity_image: 'image' },
  },
];

const c = { g: (s) => `\x1b[32m${s}\x1b[0m`, y: (s) => `\x1b[33m${s}\x1b[0m`, r: (s) => `\x1b[31m${s}\x1b[0m`, b: (s) => `\x1b[1m${s}\x1b[0m`, d: (s) => `\x1b[2m${s}\x1b[0m` };

async function main() {
  console.log('\n' + c.b('═'.repeat(70)));
  console.log(c.b('  NORMALISE idea/pre-launch field keys → title / description / image'));
  console.log(c.b(`  MODE: ${COMMIT ? c.r('COMMIT (writing changes)') : c.y('DRY-RUN (no writes — pass --commit to apply)')}`));
  console.log(c.b('═'.repeat(70)));

  console.log('\n▶ Connecting to MongoDB…');
  await mongoose.connect(config.mongodb.uri);
  const db = mongoose.connection.db;

  let grandRenamed = 0;
  for (const { collection, fields } of RENAMES) {
    const col = db.collection(collection);
    const total = await col.countDocuments().catch(() => null);
    if (total === null) { console.log(`\n  ${collection.padEnd(46)} ${c.d('(missing collection)')}`); continue; }

    console.log(`\n  ${c.b(collection)}  ${c.d('(' + total + ' docs)')}`);
    for (const [oldKey, newKey] of Object.entries(fields)) {
      // Only docs that still have the old field need renaming. A doc that
      // already holds `newKey` but no `oldKey` is left untouched (idempotent).
      const filter = { [oldKey]: { $exists: true } };
      const affected = await col.countDocuments(filter);
      if (COMMIT && affected > 0) {
        await col.updateMany(filter, { $rename: { [oldKey]: newKey } });
      }
      grandRenamed += affected;
      const flag = affected ? c.g('✓') : c.d('·');
      console.log(`    ${flag} ${(oldKey + ' → ' + newKey).padEnd(40)} ${String(affected).padStart(6)} doc(s)`);
    }
  }

  console.log('\n  ' + '─'.repeat(60));
  console.log(`  ${(COMMIT ? 'RENAMED' : 'WOULD RENAME').padEnd(20)} ${c.g(String(grandRenamed))} field value(s)`);
  if (!COMMIT) {
    console.log(c.y('\n  Dry-run only. Re-run with --commit to apply these changes.'));
  } else {
    console.log(c.g('\n  ✅ Done. Keys normalised to title / description / image.'));
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(c.r('\n❌ FATAL: ' + err.message));
  console.error(err.stack);
  process.exit(1);
});
