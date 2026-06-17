'use strict';
/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  NORMALISE field keys for the "Other / Add-on Activities" items           ║
 * ║                                                                            ║
 * ║  PROBLEM                                                                    ║
 * ║  marketing_house_other_activity_item carries item-prefixed keys for the    ║
 * ║  same concepts the rest of the app exposes as plain title/description/     ║
 * ║  image, so the web/admin layers had to special-case each one (and some     ║
 * ║  reads silently returned undefined):                                       ║
 * ║                                                                            ║
 * ║      item_title       → title                                              ║
 * ║      item_description → description                                        ║
 * ║      item_image       → image                                              ║
 * ║      item_video_url   → video_url                                          ║
 * ║      item_youtube_id  → youtube_id                                         ║
 * ║                                                                            ║
 * ║  SCOPE                                                                      ║
 * ║  ONLY the `marketing_house_other_activity_item` collection. The identical  ║
 * ║  `item_*` keys on other collections (community-program / content-created / ║
 * ║  home-page items) are intentionally left untouched.                        ║
 * ║                                                                            ║
 * ║  SAFE BY DEFAULT                                                            ║
 * ║   • Idempotent — only docs that still carry the old key are touched.        ║
 * ║   • Dry-run by default; pass --commit to actually write.                    ║
 * ║   • Uses $rename, which preserves the value (no data loss).                 ║
 * ║                                                                            ║
 * ║  USAGE                                                                      ║
 * ║     cd app/api/database/mysql-migration                                     ║
 * ║     node normalize-other-activity-item-keys.js            # dry-run         ║
 * ║     node normalize-other-activity-item-keys.js --commit   # apply changes  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const mongoose = require('mongoose');
const config = require('./config');

const COMMIT = process.argv.includes('--commit');

// collection → { oldKey: newKey } map of renames to apply.
const RENAMES = [
  {
    collection: 'marketing_house_other_activity_item',
    fields: {
      item_title: 'title',
      item_description: 'description',
      item_image: 'image',
      item_video_url: 'video_url',
      item_youtube_id: 'youtube_id',
    },
  },
];

const c = { g: (s) => `\x1b[32m${s}\x1b[0m`, y: (s) => `\x1b[33m${s}\x1b[0m`, r: (s) => `\x1b[31m${s}\x1b[0m`, b: (s) => `\x1b[1m${s}\x1b[0m`, d: (s) => `\x1b[2m${s}\x1b[0m` };

async function main() {
  console.log('\n' + c.b('═'.repeat(70)));
  console.log(c.b('  NORMALISE other-activity-item keys → title / description / image / …'));
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
    console.log(c.g('\n  ✅ Done. Keys normalised to title / description / image / video_url / youtube_id.'));
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(c.r('\n❌ FATAL: ' + err.message));
  console.error(err.stack);
  process.exit(1);
});
