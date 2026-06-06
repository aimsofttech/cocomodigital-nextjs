'use strict';
/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║   COCOMA DIGITAL — MySQL → MongoDB Full Data Migration                  ║
 * ║                                                                          ║
 * ║   Reads 100% of MySQL data from:  cocma_digital_db                      ║
 * ║   Writes to MongoDB:              cocoma_digital_db                      ║
 * ║                                                                          ║
 * ║   Usage:                                                                 ║
 * ║     node migrate.js            → full migration                          ║
 * ║     node migrate.js --dry-run  → preview only (no DB writes)             ║
 * ║     node migrate.js --verbose  → detailed per-row logging                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const path  = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const config      = require('./config');
const mysqlReader = require('./mysqlReader');
const mongoWriter = require('./mongoWriter');
const { TABLE_MAP } = require('./tableMapping');
const { transformTable } = require('./transformer');
const idMapper    = require('./idMapper');

// ─────────────────────────────────────────────────────────────────────────────
// Indexes to create on each collection after insertion
// ─────────────────────────────────────────────────────────────────────────────
const COLLECTION_INDEXES = {
  users:                          [{ key: { email: 1 }, options: { unique: true } }],
  topbanners:                     [{ key: { display_order: 1 } }, { key: { country: 1 } }],
  brands:                         [{ key: { display_order: 1 } }],
  servicecategories:              [{ key: { display_order: 1 } }],
  serviceitems:                   [{ key: { service_slug: 1 }, options: { unique: true, sparse: true } }, { key: { service_category_id: 1 } }],
  clients:                        [{ key: { client_slug: 1 }, options: { unique: true, sparse: true } }],
  marketinghousecategories:       [{ key: { display_order: 1 } }],
  marketinghouseitems:            [{ key: { marketing_house_slug: 1 }, options: { unique: true, sparse: true } }, { key: { marketing_house_category_id: 1 } }],
  creativehousecategories:        [{ key: { display_order: 1 } }],
  creativehouseitems:             [{ key: { creative_house_slug: 1 }, options: { unique: true, sparse: true } }],
  groupserviceitems:              [{ key: { group_service_item_slug: 1 }, options: { unique: true, sparse: true } }],
  blogcategories:                 [{ key: { category_slug: 1 }, options: { unique: true, sparse: true } }],
  blogsubcategories:              [{ key: { sub_category_slug: 1 }, options: { unique: true, sparse: true } }],
  blogitems:                      [{ key: { blog_slug: 1 }, options: { unique: true, sparse: true } }, { key: { blog_category_id: 1 } }],
  jobcategories:                  [{ key: { category_slug: 1 }, options: { unique: true, sparse: true } }],
  joblists:                       [{ key: { job_slug: 1 }, options: { unique: true, sparse: true } }],
  jobapplicants:                  [{ key: { job_list_id: 1 } }, { key: { applicant_email: 1 } }],
  faqs:                           [{ key: { slug: 1 }, options: { sparse: true } }],
};

// ─────────────────────────────────────────────────────────────────────────────
// Build ordered migration list from TABLE_MAP (sorted by `order` field)
// ─────────────────────────────────────────────────────────────────────────────
function buildMigrationOrder(availableTables) {
  const entries = [];
  for (const [tableName, cfg] of Object.entries(TABLE_MAP)) {
    if (cfg.skip) continue;
    if (!availableTables.includes(tableName)) continue;
    entries.push({ tableName, ...cfg });
  }
  entries.sort((a, b) => (a.order || 99) - (b.order || 99));
  return entries;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pretty logging helpers
// ─────────────────────────────────────────────────────────────────────────────
const chalk = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
};

function log(msg)    { console.log(msg); }
function ok(msg)     { console.log(chalk.green('  ✓  ') + msg); }
function warn(msg)   { console.log(chalk.yellow('  ⚠  ') + msg); }
function fail(msg)   { console.log(chalk.red('  ✗  ') + msg); }
function section(msg){ console.log('\n' + chalk.bold(chalk.cyan('▶ ' + msg))); }

// ─────────────────────────────────────────────────────────────────────────────
// Migrate a single table
// ─────────────────────────────────────────────────────────────────────────────
async function migrateTable(tableName, tableConfig, opts) {
  const { collection } = tableConfig;
  const { dryRun, verbose } = opts;

  // Read from MySQL
  let rows;
  try {
    rows = await mysqlReader.readAll(tableName);
  } catch (err) {
    warn(`Could not read ${tableName}: ${err.message}`);
    return { tableName, mysqlCount: 0, mongoCount: 0, skipped: true };
  }

  const mysqlCount = rows.length;
  if (mysqlCount === 0) {
    ok(`${tableName} → ${collection} — ${chalk.dim('empty table, skipped')}`);
    return { tableName, mysqlCount: 0, mongoCount: 0, skipped: false };
  }

  // Transform rows
  const docs = transformTable(rows, tableConfig, tableName);

  if (verbose) {
    log(chalk.dim(`     Sample doc: ${JSON.stringify(docs[0], null, 2).slice(0, 300)}`));
  }

  if (dryRun) {
    log(chalk.yellow(`  [DRY-RUN] ${tableName} → ${collection}: would insert ${mysqlCount} records`));
    return { tableName, mysqlCount, mongoCount: 0, skipped: false, dryRun: true };
  }

  // Insert into MongoDB
  let insertedCount = 0;
  try {
    insertedCount = await mongoWriter.insertMany(collection, docs);
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key — count how many succeeded
      insertedCount = err.result?.nInserted || docs.length;
      warn(`${tableName}: duplicate key errors (some records skipped)`);
    } else {
      fail(`${tableName}: ${err.message}`);
      return { tableName, mysqlCount, mongoCount: 0, error: err.message };
    }
  }

  // Create indexes
  if (COLLECTION_INDEXES[collection]) {
    await mongoWriter.createIndexes(collection, COLLECTION_INDEXES[collection]);
  }

  ok(`${tableName} → ${collection}: ${mysqlCount} MySQL rows → ${insertedCount} MongoDB docs`);
  return { tableName, mysqlCount, mongoCount: insertedCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const startTime = Date.now();
  const { dryRun, verbose } = config.options;

  log('\n' + chalk.bold('═'.repeat(60)));
  log(chalk.bold('  COCOMA DIGITAL — MySQL → MongoDB Migration'));
  if (dryRun) log(chalk.yellow('  MODE: DRY RUN (no data will be written)'));
  log(chalk.bold('═'.repeat(60)));

  // 1. Connect
  section('Connecting to databases…');
  await mysqlReader.connect(config.mysql);
  await mongoWriter.connect(config.mongodb.uri);

  // 2. Discover MySQL tables
  section('Discovering MySQL tables…');
  const availableTables = await mysqlReader.getAllTables(config.mysql.database);
  log(`  Found ${availableTables.length} tables in MySQL: ${availableTables.join(', ')}`);

  // 3. Build migration order
  const migrationPlan = buildMigrationOrder(availableTables);
  const unknownTables = availableTables.filter(
    (t) => !config.options.skipTables.includes(t) &&
           !TABLE_MAP[t] &&
           !['migrations'].includes(t)
  );
  if (unknownTables.length > 0) {
    warn(`Tables in MySQL with no mapping (will be migrated as-is): ${unknownTables.join(', ')}`);
  }

  // 4. Drop existing collections (fresh migration)
  if (!dryRun) {
    section('Dropping existing MongoDB collections…');
    const collectionsToDrop = migrationPlan.map((e) => e.collection);
    // Also include unmapped tables
    unknownTables.forEach((t) => collectionsToDrop.push(t));
    await mongoWriter.dropCollections([...new Set(collectionsToDrop)]);
  }

  // 5. Migrate each table in order
  section('Migrating tables…');
  const results = [];

  for (const tableEntry of migrationPlan) {
    const result = await migrateTable(tableEntry.tableName, tableEntry, { dryRun, verbose });
    results.push(result);
  }

  // 6. Migrate unmapped tables (pass-through — no field transformation)
  if (unknownTables.length > 0) {
    section('Migrating unmapped tables (pass-through)…');
    for (const tableName of unknownTables) {
      if (config.options.skipTables.includes(tableName)) continue;
      const passConfig = {
        collection: tableName.toLowerCase(),
        fields: {},
        foreignKeys: {},
        statusField: 'status',
        order: 99,
      };
      const result = await migrateTable(tableName, passConfig, { dryRun, verbose });
      results.push(result);
    }
  }

  // 7. Print summary
  section('Migration Summary');
  let totalMySQL = 0, totalMongo = 0, totalErrors = 0;
  log(`\n  ${'Table'.padEnd(50)} ${'MySQL'.padStart(8)} ${'MongoDB'.padStart(8)}`);
  log('  ' + '─'.repeat(70));

  for (const r of results) {
    if (r.skipped) continue;
    totalMySQL += r.mysqlCount;
    totalMongo += r.mongoCount;
    if (r.error) totalErrors++;
    const match = r.mysqlCount === r.mongoCount
      ? chalk.green('✓')
      : (r.dryRun ? chalk.yellow('~') : chalk.red('✗'));
    const name = (r.tableName || '').padEnd(50);
    const mysql = String(r.mysqlCount).padStart(8);
    const mongo = String(r.dryRun ? '-' : r.mongoCount).padStart(8);
    log(`  ${match} ${name} ${mysql} ${mongo}`);
  }

  log('  ' + '─'.repeat(70));
  log(`  ${'TOTAL'.padEnd(50)} ${String(totalMySQL).padStart(8)} ${String(dryRun ? '-' : totalMongo).padStart(8)}`);

  if (totalErrors > 0) {
    fail(`${totalErrors} table(s) had errors. Check logs above.`);
  } else if (!dryRun) {
    log('\n' + chalk.green(chalk.bold('  ✅  Migration completed successfully!')));
  }

  log(`\n  ID map registered: ${JSON.stringify(idMapper.dump())}`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`\n  ⏱  Total time: ${elapsed}s\n`);

  // 8. Disconnect
  await mysqlReader.disconnect();
  await mongoWriter.disconnect();
}

main().catch((err) => {
  console.error('\n❌  FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
