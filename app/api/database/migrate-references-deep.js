'use strict';
/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  DEEP / COMPREHENSIVE foreign-key migration (auto-detecting)               ║
 * ║                                                                            ║
 * ║  Unlike migrate-foreign-keys.js (driven by tableMapping config), this scans║
 * ║  EVERY collection and auto-detects every reference-shaped field (key ends  ║
 * ║  in _id / _ids), including nested objects and arrays. For each field it    ║
 * ║  derives the target collection from the field name, builds                 ║
 * ║      mysqlId ──(shared business key)──▶ ObjectId                            ║
 * ║  from the MySQL source, and rewrites positive numeric values to ObjectIds. ║
 * ║                                                                            ║
 * ║  • 0 / null / '' are treated as "no reference" and left untouched.          ║
 * ║  • Idempotent (already-ObjectId values skipped); reversible (originals in   ║
 * ║    `_legacy_fks.<path>`); non-destructive (unresolvable values kept + reported).
 * ║  • Dry-run by default; --commit to write.                                   ║
 * ║                                                                            ║
 * ║  USAGE (from app/api):                                                      ║
 * ║     node database/migrate-references-deep.js            # dry-run           ║
 * ║     node database/migrate-references-deep.js --commit   # apply            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const mysql = require(path.join(__dirname, 'mysql-migration', 'node_modules', 'mysql2', 'promise'));

const COMMIT = process.argv.includes('--commit');
const MYSQL = {
  host: process.env.MYSQL_HOST || '127.0.0.1', port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root', password: process.env.MYSQL_PASS || '', database: process.env.MYSQL_DB || 'cocoma-digital',
};
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cocoma_digital_db';

const c = { g: (s) => `\x1b[32m${s}\x1b[0m`, y: (s) => `\x1b[33m${s}\x1b[0m`, r: (s) => `\x1b[31m${s}\x1b[0m`, b: (s) => `\x1b[1m${s}\x1b[0m`, d: (s) => `\x1b[2m${s}\x1b[0m`, cy: (s) => `\x1b[36m${s}\x1b[0m` };

// Keys that end in _id but are NOT references (free-form ids / type tags).
const NON_REF = new Set(['youtube_id', 'marketing_house_youtube_id', 'marketing_video_type', 'video_id']);
const looksRef = (key) => /(_id|_ids)$/.test(key) && !NON_REF.has(key);
const isOid = (v) => v instanceof mongoose.Types.ObjectId || (v && typeof v === 'object' && v._bsontype === 'ObjectId');
const isPosNum = (v) => (typeof v === 'number' && v > 0) || (typeof v === 'string' && /^\d+$/.test(v) && Number(v) > 0);
const isEmptyRef = (v) => v === null || v === undefined || v === '' || v === 0 || v === '0';

// Explicit field-base → collection aliases for irregular names.
const ALIAS = {
  user: 'users',
  book_call_template: 'book_a_call', book_call: 'book_a_call',
  our_advantage_template: 'our_advantage',
  group_service_category: 'group_services_category',
  job: 'job_list',
  marketting_house_category: 'our_marketting_house_category',
  marketting_house_item: 'our_marketting_house_item',
  consultation_category: 'free_consultation_category',
  mps_category: 'monthly_performance_showcase_category',
  mps_subcategory: 'monthly_performance_showcase_subcategory',
  portfolio_category: 'group_single_service_portfolio_category',
  community_program_category: 'marketing_house_community_program',
  content_created_category: 'marketing_house_content_created_categories',
  marketing_house_other_activity_category: 'marketing_house_other_activity_category',
};

// Derive the target collection name for a FK field key, against the set of
// existing collections. Returns the collection name or null.
function resolveTarget(key, liveCols) {
  let base = key.replace(/_ids?$/, '');
  const tryNames = (b) => [b, `${b}s`, `${b}es`, b.replace(/y$/, 'ies')];
  if (ALIAS[base] && liveCols.has(ALIAS[base])) return ALIAS[base];
  for (const cand of tryNames(base)) if (liveCols.has(cand)) return cand;
  // Some fields carry an explore_our_ prefix already matching a collection.
  if (liveCols.has(base)) return base;
  return null;
}

// ── business-key matching (same approach as migrate-foreign-keys.js) ──────────
const norm = (v) => v == null ? '' : v instanceof Date ? String(v.getTime()) : typeof v === 'object' ? JSON.stringify(v) : String(v).trim();
function tryKey(mysqlRows, mongoDocs, valueOf) {
  const sC = new Map(), sI = new Map();
  for (const r of mysqlRows) { const k = valueOf(r); if (k === '') continue; sC.set(k, (sC.get(k) || 0) + 1); sI.set(k, r.id); }
  const mC = new Map(), mO = new Map();
  for (const d of mongoDocs) { const k = valueOf(d); if (k === '') continue; mC.set(k, (mC.get(k) || 0) + 1); mO.set(k, d._id); }
  const map = new Map();
  for (const [k, id] of sI) if (sC.get(k) === 1 && mC.get(k) === 1) { const o = mO.get(k); if (o) map.set(Number(id), o); }
  return map.size ? map : null;
}
function keyCandidates(fields) {
  const out = []; const push = (n) => { if (fields.includes(n) && !out.includes(n)) out.push(n); };
  push('email'); fields.filter((f) => /_slug$/.test(f) || f === 'slug').forEach(push);
  fields.filter((f) => /_name$/.test(f) || f === 'name').forEach(push);
  fields.filter((f) => /_title$/.test(f) || f === 'title').forEach(push);
  return out;
}
async function buildIdMap(sqlConn, db, table, mysqlTables, cache) {
  if (cache.has(table)) return cache.get(table);
  let res;
  try {
    if (!mysqlTables.has(table)) { res = { map: new Map(), key: null, reason: 'no MySQL source table' }; cache.set(table, res); return res; }
    const [rows] = await sqlConn.query(`SELECT * FROM \`${table}\``);
    const docs = await db.collection(table).find({}).toArray();
    if (!rows.length || !docs.length) { res = { map: new Map(), key: null, reason: 'empty', mysqlRows: rows.length, mongo: docs.length }; }
    else {
      const shared = Object.keys(rows[0]).filter((f) => f in docs[0]);
      const attempts = [];
      for (const key of keyCandidates(shared)) { const m = tryKey(rows, docs, (o) => norm(o[key])); if (m) attempts.push({ map: m, key, matched: m.size }); }
      // Exclude reference-shaped fields from the signature: a prior pass may have
      // already converted them to ObjectId in Mongo while MySQL still holds the
      // integer, which would break composite matching. Match on stable content.
      const sig = shared.filter((f) => f !== '_id' && f !== 'id' && f !== '__v' && f !== '_legacy_fks' && !looksRef(f));
      if (sig.length) { const m = tryKey(rows, docs, (o) => sig.map((f) => norm(o[f])).join('')); if (m) attempts.push({ map: m, key: `composite(${sig.length})`, matched: m.size }); }
      attempts.sort((a, b) => b.matched - a.matched);
      res = attempts.length ? { ...attempts[0], mysqlRows: rows.length, mongo: docs.length } : { map: new Map(), key: null, reason: 'no unique key', mysqlRows: rows.length, mongo: docs.length };
    }
  } catch (e) { res = { map: new Map(), key: null, reason: `error: ${e.message}` }; }
  cache.set(table, res); return res;
}

(async () => {
  console.log('\n' + c.b('═'.repeat(86)));
  console.log(c.b('  DEEP FOREIGN-KEY MIGRATION  (auto-detect, all collections)'));
  console.log(c.b(`  MODE: ${COMMIT ? c.r('COMMIT (writing)') : c.y('DRY-RUN (no writes — pass --commit)')}`));
  console.log(c.b('═'.repeat(86)));

  const sqlConn = await mysql.createConnection(MYSQL);
  const [tbls] = await sqlConn.query('SHOW TABLES');
  const mysqlTables = new Set(tbls.map((r) => Object.values(r)[0]));
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const liveCols = new Set((await db.listCollections().toArray()).map((x) => x.name));
  console.log(c.g(`  ✓ MySQL (${MYSQL.database}) + Mongo connected\n`));

  const cache = new Map();
  const report = { scanned: 0, updatedColls: new Set(), noChangeColls: 0, fields: 0, converted: 0, missing: 0, unresolved: [] };
  const missingSamples = {};

  for (const coll of [...liveCols].sort()) {
    report.scanned++;
    const docs = await db.collection(coll).find({}).toArray();
    if (!docs.length) { report.noChangeColls++; continue; }

    // Discover reference-shaped fields holding ≥1 positive numeric (top-level,
    // arrays, and one level of nesting).
    const fieldTargets = {}; // path -> target collection (resolved once)
    const fieldKey = {};     // path -> leaf key (for resolution)
    const discover = (key, val, pth) => {
      if (isEmptyRef(val)) return;
      if (Array.isArray(val)) { val.forEach((el) => { if (isPosNum(el) && looksRef(key)) { fieldKey[pth + '[]'] = key; } else if (el && typeof el === 'object' && !isOid(el)) Object.entries(el).forEach(([k, v]) => discover(k, v, `${pth}[].${k}`)); }); return; }
      if (isOid(val)) return;
      if (val && typeof val === 'object' && !(val instanceof Date)) { Object.entries(val).forEach(([k, v]) => discover(k, v, `${pth}.${k}`)); return; }
      if (looksRef(key) && isPosNum(val)) fieldKey[pth] = key;
    };
    for (const d of docs) for (const [k, v] of Object.entries(d)) { if (k === '_id' || k === '_legacy_fks') continue; discover(k, v, k); }

    const paths = Object.keys(fieldKey);
    if (!paths.length) { report.noChangeColls++; continue; }

    // Resolve target collection + build id map for each discovered field.
    for (const p of paths) {
      const target = resolveTarget(fieldKey[p], liveCols);
      fieldTargets[p] = target;
      if (!target) { report.unresolved.push(`${coll}.${p} (key '${fieldKey[p]}')`); continue; }
      await buildIdMap(sqlConn, db, target, mysqlTables, cache);
    }

    // Convert.
    const getAt = (obj, p) => p.split('.').reduce((o, seg) => (o == null ? o : o[seg]), obj);
    let ops = [], collConverted = 0;
    const perField = {};
    for (const d of docs) {
      const set = {}, legacy = {};
      for (const p of paths) {
        const target = fieldTargets[p];
        if (!target) continue;
        const tmap = cache.get(target)?.map; if (!tmap || !tmap.size) continue;
        perField[p] ||= { upd: 0, miss: 0, target };

        if (p.endsWith('[]')) {
          const base = p.slice(0, -2);
          const arr = getAt(d, base);
          if (!Array.isArray(arr)) continue;
          let changed = false;
          const mapped = arr.map((v) => {
            if (isOid(v) || isEmptyRef(v) || !isPosNum(v)) return v;
            const o = tmap.get(Number(v)); if (!o) { perField[p].miss++; report.missing++; (missingSamples[`${coll}.${p}`] ||= new Set()).add(String(v)); return v; }
            changed = true; perField[p].upd++; report.converted++; collConverted++; return o;
          });
          if (changed) { set[base] = mapped; legacy[base] = arr; }
        } else {
          const v = getAt(d, p);
          if (isOid(v) || isEmptyRef(v) || !isPosNum(v)) continue;
          const o = tmap.get(Number(v));
          if (!o) { perField[p].miss++; report.missing++; (missingSamples[`${coll}.${p}`] ||= new Set()).add(String(v)); continue; }
          set[p] = o; legacy[`_legacy_fks.${p}`] = v; perField[p].upd++; report.converted++; collConverted++;
        }
      }
      if (COMMIT && Object.keys(set).length) {
        ops.push({ updateOne: { filter: { _id: d._id }, update: { $set: { ...set, ...legacy } } } });
        if (ops.length >= 1000) { await db.collection(coll).bulkWrite(ops, { ordered: false }); ops = []; }
      }
    }
    if (COMMIT && ops.length) await db.collection(coll).bulkWrite(ops, { ordered: false });

    if (Object.keys(perField).length) {
      report.updatedColls.add(coll);
      report.fields += Object.keys(perField).length;
      console.log(`${c.cy('●')} ${c.b(coll)} ${c.d(`(${docs.length} docs)`)}`);
      for (const [p, s] of Object.entries(perField)) {
        const flag = s.miss ? c.y('⚠') : c.g('✓');
        const note = s.miss ? c.d(`  missing: ${[...(missingSamples[`${coll}.${p}`] || [])].slice(0, 6).join(',')}`) : '';
        console.log(`   ${flag} ${p.padEnd(46)} → ${String(s.target).padEnd(40)} ${c.g('conv=' + s.upd)} ${s.miss ? c.y('miss=' + s.miss) : ''}${note}`);
      }
    } else report.noChangeColls++;
  }

  console.log('\n' + c.b('═'.repeat(86)));
  console.log(c.b('  MIGRATION REPORT'));
  console.log(`  Collections scanned             : ${report.scanned}`);
  console.log(`  Collections updated             : ${report.updatedColls.size ? c.g(report.updatedColls.size) : 0}`);
  console.log(`  Collections requiring no change : ${report.noChangeColls}`);
  console.log(`  FK fields identified & migrated : ${report.fields}`);
  console.log(`  References ${COMMIT ? 'converted' : 'to convert'}            : ${c.g(report.converted)}`);
  console.log(`  Invalid / missing references    : ${report.missing ? c.y(report.missing) : 0}`);
  console.log(`  Unresolved FK fields            : ${report.unresolved.length ? c.r(report.unresolved.length) : 0}`);
  report.unresolved.forEach((u) => console.log(c.r(`      • ${u}`)));
  if (!COMMIT) console.log(c.y('\n  Dry-run only. Re-run with --commit to apply.'));
  else console.log(c.g('\n  ✅ Done. Originals preserved under `_legacy_fks` (reversible).'));
  console.log(c.b('═'.repeat(86)) + '\n');

  await sqlConn.end(); await mongoose.disconnect();
})().catch((e) => { console.error(c.r('FATAL ' + e.message)); console.error(e.stack); process.exit(1); });
