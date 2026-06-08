'use strict';
/**
 * Verify the foreign-key migration:
 *   • every FK field is now an ObjectId (or empty),
 *   • no legacy numeric ids remain (except genuinely orphaned source refs),
 *   • every ObjectId reference points to an existing target document.
 *
 * Read-only. Usage (from app/api):  node database/verify-foreign-keys.js
 */
require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const { TABLE_MAP } = require(path.join(__dirname, 'mysql-migration', 'tableMapping'));

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cocoma_digital_db';
const TARGET_ALIAS = {
  book_calls: 'book_a_call', author_templates: 'author_template', our_advantages: 'our_advantage',
  marketing_house_community_program_category: 'marketing_house_community_program',
  marketing_house_community_program_category_item: 'marketing_house_community_program_item',
  group_service_category: 'group_services_category',
};
const c = { g: (s) => `\x1b[32m${s}\x1b[0m`, y: (s) => `\x1b[33m${s}\x1b[0m`, r: (s) => `\x1b[31m${s}\x1b[0m`, b: (s) => `\x1b[1m${s}\x1b[0m`, d: (s) => `\x1b[2m${s}\x1b[0m` };
const isNumericLegacy = (v) => (typeof v === 'number') || (typeof v === 'string' && /^\d+$/.test(v));

(async () => {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const live = new Set((await db.listCollections().toArray()).map((x) => x.name));
  const resolve = (n) => (live.has(n) ? n : (TARGET_ALIAS[n] && live.has(TARGET_ALIAS[n]) ? TARGET_ALIAS[n] : null));

  // Cache of existing _id sets per target collection (as hex strings).
  const idSetCache = new Map();
  const idSet = async (coll) => {
    if (idSetCache.has(coll)) return idSetCache.get(coll);
    const ids = new Set((await db.collection(coll).find({}, { projection: { _id: 1 } }).toArray()).map((d) => String(d._id)));
    idSetCache.set(coll, ids); return ids;
  };

  console.log('\n' + c.b('═'.repeat(80)));
  console.log(c.b('  FOREIGN-KEY VERIFICATION'));
  console.log(c.b('═'.repeat(80)));
  console.log(`  ${'collection.field → target'.padEnd(60)} ${'oid'.padStart(6)} ${'num'.padStart(5)} ${'broken'.padStart(6)}`);
  console.log('  ' + '─'.repeat(82));

  let totNum = 0, totBroken = 0, totOid = 0;
  for (const [tableKey, cfg] of Object.entries(TABLE_MAP)) {
    if (cfg.skip || !cfg.foreignKeys) continue;
    const hostCol = resolve(tableKey);
    if (!hostCol) continue;
    for (const [field, refName] of Object.entries(cfg.foreignKeys)) {
      const targetCol = resolve(refName);
      const docs = await db.collection(hostCol).find(
        { [field]: { $nin: [null, '', 0, '0'] } }, { projection: { [field]: 1 } }).toArray();
      let oid = 0, num = 0, broken = 0;
      const targetIds = targetCol ? await idSet(targetCol) : null;
      const numSamples = new Set();
      for (const d of docs) {
        const vals = Array.isArray(d[field]) ? d[field] : [d[field]];
        for (const v of vals) {
          if (v === null || v === undefined || v === '' || v === 0 || v === '0') continue;
          if (v instanceof mongoose.Types.ObjectId || (typeof v === 'object' && v._bsontype === 'ObjectId')) {
            oid++;
            if (targetIds && !targetIds.has(String(v))) broken++;
          } else if (isNumericLegacy(v)) {
            num++; if (numSamples.size < 8) numSamples.add(String(v));
          }
        }
      }
      totNum += num; totBroken += broken; totOid += oid;
      const flag = (num || broken) ? c.y('⚠') : c.g('✓');
      const note = num ? c.d(`  legacy nums: ${[...numSamples].join(',')}`) : (broken ? c.r('  BROKEN refs!') : '');
      console.log(`  ${flag} ${`${hostCol}.${field} → ${targetCol || refName}`.padEnd(58)} ${String(oid).padStart(6)} ${String(num).padStart(5)} ${String(broken).padStart(6)}${note}`);
    }
  }

  console.log('  ' + '─'.repeat(82));
  console.log(`\n  ObjectId references            : ${c.g(totOid)}`);
  console.log(`  Remaining legacy numeric refs  : ${totNum ? c.y(totNum) + c.d('  (orphaned — target row absent in source)') : c.g(0)}`);
  console.log(`  Broken refs (ObjectId w/o doc) : ${totBroken ? c.r(totBroken) : c.g(0)}`);
  console.log('\n' + c.b('═'.repeat(80)) + '\n');
  await mongoose.disconnect();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
