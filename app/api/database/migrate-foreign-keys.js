'use strict';
/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  FOREIGN-KEY MIGRATION — legacy MySQL integer ids → MongoDB ObjectId      ║
 * ║                                                                            ║
 * ║  WHY                                                                       ║
 * ║  The data was migrated from MySQL: every document got a fresh ObjectId     ║
 * ║  `_id`, but the integer PK was dropped and the foreign-key fields still    ║
 * ║  hold the old MySQL integers (e.g. marketing_house_item_id: 22). Mongoose  ║
 * ║  populate() therefore cannot resolve any relationship.                     ║
 * ║                                                                            ║
 * ║  HOW                                                                       ║
 * ║  The MySQL source DB is still available and the live Mongo collections     ║
 * ║  share both their NAME and their business keys (slug / email / name) with  ║
 * ║  the MySQL tables. So for every referenced (target) table we can rebuild   ║
 * ║      mysqlId ──(business key)──▶ ObjectId                                   ║
 * ║  and then rewrite each FK field from the integer to the matching ObjectId. ║
 * ║                                                                            ║
 * ║  Which fields are foreign keys is taken from the project's own migration   ║
 * ║  config: database/mysql-migration/tableMapping.js → `foreignKeys`.         ║
 * ║                                                                            ║
 * ║  SAFETY                                                                     ║
 * ║   • Dry-run by default; pass --commit to write.                             ║
 * ║   • Idempotent — values that are already ObjectIds are skipped.             ║
 * ║   • Reversible — the original integer is kept in `_legacy_fks.<field>`.     ║
 * ║   • Non-destructive — unmatched/invalid references are LEFT AS-IS and       ║
 * ║     reported (never nulled), so no data is lost.                            ║
 * ║   • Values are written as real BSON ObjectIds (so populate() works once     ║
 * ║     the schema fields carry `ref`).                                         ║
 * ║                                                                            ║
 * ║  USAGE  (run from app/api)                                                  ║
 * ║     node database/migrate-foreign-keys.js              # dry-run            ║
 * ║     node database/migrate-foreign-keys.js --commit     # apply             ║
 * ║     node database/migrate-foreign-keys.js --commit --only=marketing_house_statics,faqs
 * ║                                                                            ║
 * ║  MySQL creds via env (MYSQL_USER/MYSQL_PASS/MYSQL_DB) — defaults target the ║
 * ║  local dev DB.                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const mysql = require(path.join(__dirname, 'mysql-migration', 'node_modules', 'mysql2', 'promise'));
const { TABLE_MAP } = require(path.join(__dirname, 'mysql-migration', 'tableMapping'));

const COMMIT = process.argv.includes('--commit');
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').replace('--only=', '').split(',').filter(Boolean);

const MYSQL = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASS || '',
  database: process.env.MYSQL_DB || 'cocoma-digital',
};
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cocoma_digital_db';

// FK target names in tableMapping that don't equal the real table/collection name.
const TARGET_ALIAS = {
  book_calls: 'book_a_call',
  author_templates: 'author_template',
  our_advantages: 'our_advantage',
  marketing_house_community_program_category: 'marketing_house_community_program',
  marketing_house_community_program_category_item: 'marketing_house_community_program_item',
  group_service_category: 'group_services_category',
};

const c = {
  g: (s) => `\x1b[32m${s}\x1b[0m`, y: (s) => `\x1b[33m${s}\x1b[0m`, r: (s) => `\x1b[31m${s}\x1b[0m`,
  b: (s) => `\x1b[1m${s}\x1b[0m`, d: (s) => `\x1b[2m${s}\x1b[0m`, c: (s) => `\x1b[36m${s}\x1b[0m`,
};
const isObjectIdLike = (v) => v instanceof mongoose.Types.ObjectId ||
  (typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v));
const isLegacyNumeric = (v) =>
  (typeof v === 'number' && Number.isFinite(v)) ||
  (typeof v === 'string' && /^\d+$/.test(v.trim()) && v.trim() !== '');

// Ordered business-key candidates that exist in BOTH the MySQL columns and the
// Mongo documents, used to match a MySQL row to its migrated Mongo doc.
function keyCandidates(fields) {
  const set = new Set(fields);
  const out = [];
  const push = (n) => { if (set.has(n) && !out.includes(n)) out.push(n); };
  push('email');
  fields.filter((f) => /_slug$/.test(f) || f === 'slug').forEach(push);
  ['marketing_house_slug', 'category_slug', 'blog_slug', 'job_slug', 'service_slug'].forEach(push);
  fields.filter((f) => /_name$/.test(f) || f === 'name').forEach(push);
  fields.filter((f) => /_title$/.test(f) || f === 'title').forEach(push);
  return out;
}

// Normalise a value into a stable string for signature/value comparison.
const norm = (v) => {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return String(v.getTime());
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v).trim();
};

// Build a mysqlId→ObjectId map from a value-key function. Maps only values that
// are unambiguous (appear exactly once) on BOTH sides — collisions are skipped
// rather than discarding the whole key, so one duplicate row can't sink an
// otherwise-good mapping. Returns null if nothing maps.
function tryKey(mysqlRows, mongoDocs, valueOf) {
  const sCount = new Map(), sId = new Map();
  for (const r of mysqlRows) { const k = valueOf(r); if (k === '') continue; sCount.set(k, (sCount.get(k) || 0) + 1); sId.set(k, r.id); }
  const mCount = new Map(), mOid = new Map();
  for (const d of mongoDocs) { const k = valueOf(d); if (k === '') continue; mCount.set(k, (mCount.get(k) || 0) + 1); mOid.set(k, d._id); }
  const map = new Map();
  for (const [k, mysqlId] of sId) {
    if (sCount.get(k) === 1 && mCount.get(k) === 1) { const oid = mOid.get(k); if (oid) map.set(Number(mysqlId), oid); }
  }
  return map.size ? map : null;
}

// Build mysqlId → ObjectId for one target collection. Tries single unique
// business keys first, then a composite signature over ALL shared fields (the
// data is a near 1:1 copy, so the signature matches rows reliably). Picks the
// candidate with the highest coverage.
async function buildIdMap(sqlConn, db, tableName, cache) {
  if (cache.has(tableName)) return cache.get(tableName);

  let result;
  try {
    const [mysqlRows] = await sqlConn.query(`SELECT * FROM \`${tableName}\``);
    const mongoDocs = await db.collection(tableName).find({}).toArray();
    if (!mysqlRows.length || !mongoDocs.length) {
      result = { map: new Map(), key: null, mysqlRows: mysqlRows.length, mongo: mongoDocs.length, matched: 0, reason: 'empty source or target' };
    } else {
      const shared = Object.keys(mysqlRows[0]).filter((f) => f in mongoDocs[0]);
      const attempts = [];

      // Single-field business keys.
      for (const key of keyCandidates(shared)) {
        const m = tryKey(mysqlRows, mongoDocs, (o) => norm(o[key]));
        if (m && m.size) attempts.push({ map: m, key, matched: m.size });
      }
      // Composite signature over all shared fields except identity fields.
      const sigFields = shared.filter((f) => f !== '_id' && f !== 'id' && f !== '__v');
      if (sigFields.length) {
        const sig = (o) => sigFields.map((f) => norm(o[f])).join('');
        const m = tryKey(mysqlRows, mongoDocs, sig);
        if (m && m.size) attempts.push({ map: m, key: `composite(${sigFields.length} fields)`, matched: m.size });
      }

      if (attempts.length) {
        attempts.sort((a, b) => b.matched - a.matched);
        result = { ...attempts[0], mysqlRows: mysqlRows.length, mongo: mongoDocs.length };
      } else {
        result = { map: new Map(), key: null, mysqlRows: mysqlRows.length, mongo: mongoDocs.length, matched: 0, reason: 'no unique shared key (single or composite)' };
      }
    }
  } catch (err) {
    result = { map: new Map(), key: null, matched: 0, reason: `error: ${err.message}` };
  }
  cache.set(tableName, result);
  return result;
}

async function main() {
  console.log('\n' + c.b('═'.repeat(78)));
  console.log(c.b('  FOREIGN-KEY MIGRATION  (MySQL int → Mongo ObjectId)'));
  console.log(c.b(`  MODE: ${COMMIT ? c.r('COMMIT (writing)') : c.y('DRY-RUN (no writes — pass --commit to apply)')}`));
  if (ONLY.length) console.log(c.b(`  ONLY: ${ONLY.join(', ')}`));
  console.log(c.b('═'.repeat(78)));

  const sqlConn = await mysql.createConnection(MYSQL);
  console.log(c.g(`  ✓ MySQL connected: ${MYSQL.database}`));
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  console.log(c.g(`  ✓ Mongo connected`));
  const liveCollections = new Set((await db.listCollections().toArray()).map((x) => x.name));

  // Resolve a tableMapping reference name to an existing live collection name.
  const resolve = (name) => {
    if (liveCollections.has(name)) return name;
    const alias = TARGET_ALIAS[name];
    if (alias && liveCollections.has(alias)) return alias;
    return null;
  };

  // ── 1. Collect the work list: every (collection, field → target) FK. ───────
  const fkJobs = [];
  for (const [tableKey, cfg] of Object.entries(TABLE_MAP)) {
    if (cfg.skip || !cfg.foreignKeys) continue;
    const hostCol = resolve(tableKey);
    if (!hostCol) continue;
    if (ONLY.length && !ONLY.includes(hostCol)) continue;
    for (const [field, refName] of Object.entries(cfg.foreignKeys)) {
      const targetCol = resolve(refName);
      fkJobs.push({ hostCol, field, refName, targetCol });
    }
  }

  // ── 2. Build id maps for every referenced target collection. ───────────────
  console.log('\n' + c.c('▶ Building id maps for referenced collections…'));
  const cache = new Map();
  const targets = [...new Set(fkJobs.map((j) => j.targetCol).filter(Boolean))];
  for (const t of targets) {
    const m = await buildIdMap(sqlConn, db, t, cache);
    const status = m.key ? c.g(`key='${m.key}' mapped=${m.matched}/${m.mysqlRows}`) : c.r(`UNMAPPED (${m.reason})`);
    console.log(`   ${m.key ? '✓' : '✗'} ${t.padEnd(46)} ${status}`);
  }

  // ── 3. Rewrite FK fields per host collection. ──────────────────────────────
  console.log('\n' + c.c('▶ Rewriting foreign keys…\n'));
  console.log(`  ${'collection.field → target'.padEnd(64)} ${'docs'.padStart(6)} ${'upd'.padStart(6)} ${'miss'.padStart(6)}`);
  console.log('  ' + '─'.repeat(86));

  const totals = { processed: 0, updated: 0, missing: 0, skippedFields: 0, failed: 0 };
  const missingSamples = {};

  // Group jobs by host collection so we update each doc once across all its FKs.
  const byHost = {};
  for (const j of fkJobs) (byHost[j.hostCol] ||= []).push(j);

  for (const [hostCol, jobs] of Object.entries(byHost)) {
    const col = db.collection(hostCol);
    const docs = await col.find({}).toArray();
    const perField = {};
    jobs.forEach((j) => { perField[j.field] = { target: j.targetCol, ref: j.refName, upd: 0, miss: 0, skipped: !j.targetCol }; });

    let ops = [];
    for (const docu of docs) {
      totals.processed++;
      const set = {};
      const legacy = {};
      for (const j of jobs) {
        const fld = perField[j.field];
        if (!j.targetCol) { continue; } // unresolved target — reported, left as-is
        const tmap = cache.get(j.targetCol)?.map;
        if (!tmap || !tmap.size) continue;
        const val = docu[j.field];
        if (val === null || val === undefined || val === '' || val === 0 || val === '0') continue;

        const convertOne = (v) => {
          if (isObjectIdLike(v)) return undefined;             // already migrated
          if (!isLegacyNumeric(v)) return undefined;           // not a legacy int
          const oid = tmap.get(Number(v));
          if (!oid) {                                          // invalid / missing ref
            fld.miss++; totals.missing++;
            (missingSamples[`${hostCol}.${j.field}`] ||= new Set()).add(String(v));
            return null;                                       // sentinel: keep as-is
          }
          return oid;
        };

        if (Array.isArray(val)) {
          let changed = false;
          const mapped = val.map((v) => { const r = convertOne(v); if (r === undefined) return v; if (r === null) return v; changed = true; return r; });
          if (changed) { set[j.field] = mapped; legacy[j.field] = val; fld.upd++; totals.updated++; }
        } else {
          const r = convertOne(val);
          if (r && r !== null) { set[j.field] = r; legacy[j.field] = val; fld.upd++; totals.updated++; }
        }
      }
      if (COMMIT && Object.keys(set).length) {
        ops.push({ updateOne: { filter: { _id: docu._id }, update: { $set: { ...set, ...Object.fromEntries(Object.entries(legacy).map(([k, v]) => [`_legacy_fks.${k}`, v])) } } } });
        if (ops.length >= 1000) { try { await col.bulkWrite(ops, { ordered: false }); } catch (e) { totals.failed += ops.length; console.log(c.r(`   bulkWrite error on ${hostCol}: ${e.message}`)); } ops = []; }
      }
    }
    if (COMMIT && ops.length) { try { await col.bulkWrite(ops, { ordered: false }); } catch (e) { totals.failed += ops.length; console.log(c.r(`   bulkWrite error on ${hostCol}: ${e.message}`)); } }

    for (const j of jobs) {
      const fld = perField[j.field];
      const label = `${hostCol}.${j.field} → ${j.targetCol || j.refName}`;
      const flag = fld.skipped ? c.y('⏭') : (fld.miss ? c.y('⚠') : c.g('✓'));
      const note = fld.skipped ? c.y('  unresolved target — skipped') : (fld.miss ? c.d(`  missing ids: ${[...(missingSamples[`${hostCol}.${j.field}`] || [])].slice(0, 8).join(',')}`) : '');
      console.log(`  ${flag} ${label.padEnd(62)} ${String(docs.length).padStart(6)} ${String(fld.upd).padStart(6)} ${String(fld.miss).padStart(6)}${note}`);
      if (fld.skipped) totals.skippedFields++;
    }
  }

  // ── 4. Summary report. ─────────────────────────────────────────────────────
  console.log('\n' + c.b('═'.repeat(78)));
  console.log(c.b('  SUMMARY'));
  console.log(`  Records processed (host docs scanned) : ${c.c(totals.processed)}`);
  console.log(`  References ${COMMIT ? 'updated' : 'to update'}                : ${c.g(totals.updated)}`);
  console.log(`  Invalid / missing references          : ${totals.missing ? c.y(totals.missing) : 0}`);
  console.log(`  FK fields skipped (unresolved target) : ${totals.skippedFields ? c.y(totals.skippedFields) : 0}`);
  console.log(`  Failed bulk updates                   : ${totals.failed ? c.r(totals.failed) : 0}`);
  if (!COMMIT) console.log(c.y('\n  Dry-run only. Re-run with --commit to apply.'));
  else console.log(c.g('\n  ✅ Done. Originals preserved under `_legacy_fks` (reversible).'));
  console.log(c.b('═'.repeat(78)) + '\n');

  await sqlConn.end();
  await mongoose.disconnect();
}

main().catch((err) => { console.error(c.r('\n❌ FATAL: ' + err.message)); console.error(err.stack); process.exit(1); });
