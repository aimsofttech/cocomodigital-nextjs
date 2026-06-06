'use strict';
const mongoose = require('mongoose');
const { normalizeStatus } = require('./tableMapping');
const idMapper = require('./idMapper');

/**
 * Transform a single MySQL row into a MongoDB document.
 *
 * Steps:
 *  1. Rename fields according to the mapping config
 *  2. Resolve all foreign-key integer IDs → MongoDB ObjectIds
 *  3. Normalize status fields (active/inactive → 1/0)
 *  4. Convert MySQL datetime strings → JS Date objects
 *  5. Strip the MySQL auto-increment `id` (we assign a new MongoDB _id)
 *  6. Run optional postTransform hook
 */
function transformRow(row, tableConfig, mysqlTableName) {
  const { fields = {}, foreignKeys = {}, statusField, postTransform } = tableConfig;

  // Pre-assign a stable ObjectId so we can register it in the ID map
  const mongoId = new mongoose.Types.ObjectId();
  const doc = { _id: mongoId };

  // Track the original MySQL id so we can register in idMap after
  const mysqlId = row.id;

  for (const [mysqlCol, value] of Object.entries(row)) {
    if (mysqlCol === 'id') continue; // skip PK — handled separately

    // 1. Rename field if a mapping exists; otherwise keep original name
    const mongoField = fields[mysqlCol] !== undefined ? fields[mysqlCol] : mysqlCol;

    // Skip internal temporary fields starting with '_' that will be handled by postTransform
    // but still set them so postTransform can access them
    if (mongoField === null || mongoField === undefined || mongoField === '') continue;

    // 2. Resolve foreign key references
    if (foreignKeys[mongoField] !== undefined) {
      const refTable = foreignKeys[mongoField];
      doc[mongoField] = idMapper.resolve(refTable, value);
      continue;
    }
    // Also check original MySQL column name in foreignKeys (before rename)
    if (foreignKeys[mysqlCol] !== undefined) {
      const refTable = foreignKeys[mysqlCol];
      // mongoField may have been renamed already — use mongoField as key
      doc[mongoField] = idMapper.resolve(refTable, value);
      continue;
    }

    // 3. Status normalization
    if (mysqlCol === statusField || mongoField === 'status') {
      doc.status = normalizeStatus(value);
      continue;
    }

    // 4. Date conversion
    if (mysqlCol === 'created_at' || mysqlCol === 'updated_at') {
      doc[mysqlCol] = value ? new Date(value) : new Date();
      continue;
    }
    if (value instanceof Date) {
      doc[mongoField] = value;
      continue;
    }

    // 5. Convert numeric strings that are clearly integers
    if (mongoField === 'display_order' && value !== null) {
      doc[mongoField] = Number(value) || 0;
      continue;
    }

    // 6. Assign value
    doc[mongoField] = value;
  }

  // Ensure timestamps exist
  if (!doc.createdAt && !doc.created_at) doc.createdAt = new Date();
  if (!doc.updatedAt && !doc.updated_at) doc.updatedAt = new Date();

  // Rename created_at/updated_at → createdAt/updatedAt if needed
  if (doc.created_at && !doc.createdAt) { doc.createdAt = doc.created_at; delete doc.created_at; }
  if (doc.updated_at && !doc.updatedAt) { doc.updatedAt = doc.updated_at; delete doc.updated_at; }

  // 7. postTransform hook
  const finalDoc = postTransform ? postTransform(doc) : doc;

  return { mongoId, mysqlId, doc: finalDoc };
}

/**
 * Transform an entire array of MySQL rows for a table.
 * Returns array of transformed docs AND registers each MySQL id → ObjectId in idMap.
 *
 * @param {object[]} rows          - MySQL rows
 * @param {object}   tableConfig   - entry from TABLE_MAP
 * @param {string}   mysqlTableName
 * @returns {object[]} array of MongoDB documents ready for insertion
 */
function transformTable(rows, tableConfig, mysqlTableName) {
  const docs = [];
  for (const row of rows) {
    const { mongoId, mysqlId, doc } = transformRow(row, tableConfig, mysqlTableName);
    // Register ID mapping so FK references in later tables can be resolved
    idMapper.register(mysqlTableName, mysqlId, mongoId);
    docs.push(doc);
  }
  return docs;
}

module.exports = { transformRow, transformTable };
