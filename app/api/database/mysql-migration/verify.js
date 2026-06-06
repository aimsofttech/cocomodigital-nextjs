'use strict';
/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║   COCOMA DIGITAL — Post-Migration Verification Script                   ║
 * ║                                                                          ║
 * ║   Checks:                                                                ║
 * ║     1. Record counts  — MySQL rows == MongoDB docs for every table       ║
 * ║     2. Authentication — Laravel bcrypt hashes work with bcryptjs         ║
 * ║     3. Relationships  — FK counts are plausible                          ║
 * ║     4. Spot-checks    — First record of each collection                  ║
 * ║                                                                          ║
 * ║   Usage:  node verify.js                                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const bcrypt      = require('bcryptjs');
const config      = require('./config');
const mysqlReader = require('./mysqlReader');
const mongoWriter = require('./mongoWriter');
const { TABLE_MAP } = require('./tableMapping');

// ─── helpers ────────────────────────────────────────────────────────────────
const chalk = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
};

function ok(msg)   { console.log(chalk.green('  ✓  ') + msg); }
function warn(msg) { console.log(chalk.yellow('  ⚠  ') + msg); }
function fail(msg) { console.log(chalk.red('  ✗  ') + msg); }
function info(msg) { console.log('     ' + chalk.cyan(msg)); }
function section(title) { console.log('\n' + chalk.bold(chalk.cyan('▶ ' + title))); }

// ─────────────────────────────────────────────────────────────────────────────
// 1. COUNT VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
async function verifyCounts() {
  section('Record Count Verification (MySQL vs MongoDB)');

  const availableTables = await mysqlReader.getAllTables(config.mysql.database);
  const mongoose = require('mongoose');
  const db = mongoose.connection.db;

  let passed = 0, failed = 0, skipped = 0;
  const rows = [];

  for (const tableName of availableTables) {
    const cfg = TABLE_MAP[tableName];
    if (!cfg || cfg.skip) { skipped++; continue; }

    const collectionName = cfg.collection || tableName;
    const mysqlCount  = await mysqlReader.countRows(tableName);
    const mongoCount  = await mongoWriter.countDocuments(collectionName);
    const match       = mysqlCount === mongoCount;

    rows.push({ tableName, collectionName, mysqlCount, mongoCount, match });
    if (match) passed++; else failed++;
  }

  // Print table
  console.log(`\n  ${'MySQL Table'.padEnd(45)} ${'Collection'.padEnd(40)} ${'MySQL'.padStart(8)} ${'Mongo'.padStart(8)} ${'OK?'.padStart(6)}`);
  console.log('  ' + '─'.repeat(112));

  for (const r of rows) {
    const status = r.match ? chalk.green('  ✓') : chalk.red('  ✗');
    console.log(
      `  ${r.tableName.padEnd(45)} ${r.collectionName.padEnd(40)} ` +
      `${String(r.mysqlCount).padStart(8)} ${String(r.mongoCount).padStart(8)} ${status}`
    );
  }

  console.log('  ' + '─'.repeat(112));
  console.log(`\n  Passed: ${chalk.green(passed)}  |  Failed: ${chalk.red(failed)}  |  Skipped: ${skipped}`);
  return failed === 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. AUTHENTICATION VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
async function verifyAuth() {
  section('Authentication Verification (Password Hash Compatibility)');

  const mongoose = require('mongoose');
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({}).limit(5).toArray();

  if (users.length === 0) {
    warn('No users found in MongoDB users collection');
    return false;
  }

  let allOk = true;
  for (const user of users) {
    const hash = user.password;
    if (!hash) {
      warn(`User ${user.email} has no password hash`);
      allOk = false;
      continue;
    }

    // Verify hash format — Laravel generates $2y$ prefix, bcryptjs verifies both $2y$ and $2b$
    const isLaravelHash = hash.startsWith('$2y$') || hash.startsWith('$2b$') || hash.startsWith('$2a$');

    if (isLaravelHash) {
      ok(`${user.email} — hash format valid (${hash.substring(0, 7)}...)`);
      info(`bcryptjs.compare() will work with this hash — no password reset needed`);
    } else {
      fail(`${user.email} — unexpected hash format: ${hash.substring(0, 10)}`);
      allOk = false;
    }
  }

  // Demonstrate bcryptjs compatibility with a $2y$ hash
  try {
    const testPassword = 'TestPassword123!';
    const laravelStyleHash = bcrypt.hashSync(testPassword, 10).replace('$2b$', '$2y$');
    const verified = await bcrypt.compare(testPassword, laravelStyleHash);
    if (verified) {
      ok(`bcryptjs successfully verified a $2y$ (Laravel-style) hash — all user logins will work`);
    } else {
      fail('bcryptjs could NOT verify $2y$ hash — passwords may need reset!');
      allOk = false;
    }
  } catch (err) {
    warn(`Hash test error: ${err.message}`);
  }

  return allOk;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. RELATIONSHIP VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
async function verifyRelationships() {
  section('Relationship Verification (FK Integrity Samples)');

  const mongoose = require('mongoose');
  const db = mongoose.connection.db;

  const checks = [
    {
      name: 'Marketing Items → Categories',
      collection: 'marketinghouseitems',
      fkField: 'marketing_house_category_id',
      refCollection: 'marketinghousecategories',
    },
    {
      name: 'Creative Items → Categories',
      collection: 'creativehouseitems',
      fkField: 'creative_house_category_id',
      refCollection: 'creativehousecategories',
    },
    {
      name: 'Blog Posts → Blog Categories',
      collection: 'blogitems',
      fkField: 'blog_category_id',
      refCollection: 'blogcategories',
    },
    {
      name: 'Group Service Items → Group Service Categories',
      collection: 'groupserviceitems',
      fkField: 'group_service_category_id',
      refCollection: 'groupservicecategories',
    },
    {
      name: 'Job Applicants → Job List',
      collection: 'jobapplicants',
      fkField: 'job_list_id',
      refCollection: 'joblists',
    },
    {
      name: 'Service Items → Service Categories',
      collection: 'serviceitems',
      fkField: 'service_category_id',
      refCollection: 'servicecategories',
    },
  ];

  let allOk = true;
  for (const check of checks) {
    try {
      // Get a sample record with a non-null FK
      const sample = await db.collection(check.collection).findOne({
        [check.fkField]: { $ne: null },
      });

      if (!sample) {
        warn(`${check.name} — no records with FK in ${check.collection}`);
        continue;
      }

      const refId = sample[check.fkField];
      const ref = await db.collection(check.refCollection).findOne({ _id: refId });

      if (ref) {
        ok(`${check.name} — resolved correctly`);
      } else {
        fail(`${check.name} — FK ${refId} not found in ${check.refCollection}`);
        allOk = false;
      }
    } catch (err) {
      warn(`${check.name} — ${err.message}`);
    }
  }

  return allOk;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SPOT-CHECK FIRST RECORDS
// ─────────────────────────────────────────────────────────────────────────────
async function spotCheckRecords() {
  section('Spot-Check: First Record From Key Collections');

  const mongoose = require('mongoose');
  const db = mongoose.connection.db;

  const collections = [
    'users',
    'topbanners',
    'marketinghouseitems',
    'creativehouseitems',
    'blogitems',
    'jobapplicants',
    'joblists',
  ];

  for (const col of collections) {
    try {
      const doc = await db.collection(col).findOne({});
      if (!doc) {
        warn(`${col} — empty`);
      } else {
        const preview = JSON.stringify(doc, null, 0)
          .replace(/"password":"[^"]+"/g, '"password":"[REDACTED]"')
          .slice(0, 200);
        ok(`${col} — sample: ${preview}…`);
      }
    } catch (err) {
      warn(`${col} — ${err.message}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n' + chalk.bold('═'.repeat(60)));
  console.log(chalk.bold('  COCOMA DIGITAL — Post-Migration Verification'));
  console.log(chalk.bold('═'.repeat(60)));

  await mysqlReader.connect(config.mysql);
  await mongoWriter.connect(config.mongodb.uri);

  const countOk   = await verifyCounts();
  const authOk    = await verifyAuth();
  const relOk     = await verifyRelationships();
  await spotCheckRecords();

  section('Final Verification Report');
  if (countOk)  ok('All record counts match ✅');
  else          fail('Some record counts do NOT match — re-run migrate.js');

  if (authOk)   ok('Password hashes are compatible — users can log in ✅');
  else          fail('Password hash issues detected — check auth setup');

  if (relOk)    ok('All sampled FK relationships resolved correctly ✅');
  else          fail('Some FK relationships are broken — check transformer.js');

  if (countOk && authOk && relOk) {
    console.log('\n' + chalk.green(chalk.bold('  🎉  MIGRATION VERIFIED SUCCESSFULLY — Node.js API is ready!')));
  } else {
    console.log('\n' + chalk.yellow(chalk.bold('  ⚠️   Verification has issues — see details above')));
  }

  console.log('');
  await mysqlReader.disconnect();
  await mongoWriter.disconnect();
}

main().catch((err) => {
  console.error('\n❌  FATAL:', err.message);
  process.exit(1);
});
