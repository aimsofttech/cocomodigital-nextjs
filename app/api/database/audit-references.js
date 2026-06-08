'use strict';
/**
 * COMPREHENSIVE reference audit — read-only.
 * Scans EVERY collection and walks EVERY field (including nested objects and
 * arrays) to find reference-shaped fields (key ends with `_id` / `_ids`, or
 * holds ObjectIds) and reports, per field path:
 *    • how many values are real ObjectIds
 *    • how many are still legacy numerics (the migration gap)
 *    • sample numeric values
 *
 * Usage (from app/api):  node database/audit-references.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cocoma_digital_db';

const c = { g: (s) => `\x1b[32m${s}\x1b[0m`, y: (s) => `\x1b[33m${s}\x1b[0m`, r: (s) => `\x1b[31m${s}\x1b[0m`, b: (s) => `\x1b[1m${s}\x1b[0m`, d: (s) => `\x1b[2m${s}\x1b[0m` };
const isOid = (v) => v instanceof mongoose.Types.ObjectId || (v && typeof v === 'object' && v._bsontype === 'ObjectId');
// A positive integer is a legacy reference; 0 / '0' means "no reference".
const isNum = (v) => (typeof v === 'number' && v > 0) || (typeof v === 'string' && /^\d+$/.test(v) && Number(v) > 0);
// A field is "reference-shaped" if its key looks like a FK or it already holds ObjectIds.
const looksRef = (key) => /(_id|_ids)$/.test(key) && key !== 'youtube_id' && key !== 'marketing_house_youtube_id' && key !== 'marketing_video_type';

(async () => {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const collections = (await db.listCollections().toArray()).map((x) => x.name).sort();

  console.log('\n' + c.b('═'.repeat(86)));
  console.log(c.b(`  COMPREHENSIVE REFERENCE AUDIT — ${collections.length} collections`));
  console.log(c.b('═'.repeat(86)));

  const offenders = [];   // { coll, path, num, oid, samples }
  let totalDocs = 0, cleanColls = 0, numericColls = 0;

  for (const coll of collections) {
    const count = await db.collection(coll).countDocuments();
    totalDocs += count;
    if (count === 0) continue;

    // path -> { num, oid, other, samples:Set }
    const stats = {};
    const note = (path, kind, val) => {
      const s = (stats[path] ||= { num: 0, oid: 0, other: 0, samples: new Set() });
      s[kind]++;
      if (kind === 'num' && s.samples.size < 6) s.samples.add(String(val));
    };

    // Recursively walk a value, recording reference-shaped leaves.
    const walk = (key, val, path) => {
      if (val === null || val === undefined || val === '') return;
      if (Array.isArray(val)) {
        // Array under a ref-shaped key, or array of ObjectIds/numbers.
        val.forEach((el) => {
          if (isOid(el)) note(path + '[]', 'oid', el);
          else if (isNum(el) && looksRef(key)) note(path + '[]', 'num', el);
          else if (el && typeof el === 'object') Object.entries(el).forEach(([k, v]) => walk(k, v, `${path}[].${k}`));
        });
        return;
      }
      if (isOid(val)) { note(path, 'oid', val); return; }
      if (val && typeof val === 'object' && !(val instanceof Date)) {
        Object.entries(val).forEach(([k, v]) => walk(k, v, `${path}.${k}`));
        return;
      }
      if (looksRef(key)) { isNum(val) ? note(path, 'num', val) : note(path, 'other', val); }
    };

    const cursor = db.collection(coll).find({});
    for await (const doc of cursor) {
      for (const [k, v] of Object.entries(doc)) { if (k === '_id' || k === '_legacy_fks') continue; walk(k, v, k); }
    }

    const numericPaths = Object.entries(stats).filter(([, s]) => s.num > 0);
    if (numericPaths.length === 0) { cleanColls++; continue; }
    numericColls++;
    console.log(`\n${c.y('●')} ${c.b(coll)} ${c.d(`(${count} docs)`)}`);
    for (const [path, s] of Object.entries(stats)) {
      if (s.num > 0) {
        offenders.push({ coll, path, num: s.num, oid: s.oid });
        console.log(`   ${c.r('✗')} ${path.padEnd(52)} ${c.r(`numeric=${s.num}`)} ${c.d(`oid=${s.oid}`)}  samples: ${[...s.samples].join(',')}`);
      }
    }
  }

  console.log('\n' + c.b('═'.repeat(86)));
  console.log(c.b('  AUDIT SUMMARY'));
  console.log(`  Collections scanned          : ${collections.length}`);
  console.log(`  Documents scanned            : ${totalDocs}`);
  console.log(`  Collections with NO numeric FK: ${c.g(cleanColls)}`);
  console.log(`  Collections WITH numeric FK   : ${numericColls ? c.y(numericColls) : c.g(0)}`);
  console.log(`  Numeric reference fields found: ${offenders.length ? c.y(offenders.length) : c.g(0)}`);
  if (offenders.length) {
    console.log('\n  ' + c.b('Fields still holding numeric references:'));
    offenders.forEach((o) => console.log(`    - ${o.coll}.${o.path}  (numeric=${o.num})`));
  } else {
    console.log(c.g('\n  ✅ No numeric reference values found anywhere.'));
  }
  console.log(c.b('═'.repeat(86)) + '\n');

  await mongoose.disconnect();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
