'use strict';
const mongoose = require('mongoose');

/**
 * Global ID map: tableName → Map<mysqlIntId, mongoObjectId>
 * Built during Phase 1, consumed during Phase 2.
 */
const idMap = new Map();

/** Register a MySQL integer ID → MongoDB ObjectId mapping for a table */
function register(tableName, mysqlId, mongoId) {
  if (!idMap.has(tableName)) idMap.set(tableName, new Map());
  idMap.get(tableName).set(Number(mysqlId), mongoId);
}

/** Look up the MongoDB ObjectId for a given MySQL table + integer ID */
function resolve(tableName, mysqlId) {
  if (mysqlId === null || mysqlId === undefined || mysqlId === 0) return null;
  const tableMap = idMap.get(tableName);
  if (!tableMap) return null;
  return tableMap.get(Number(mysqlId)) || null;
}

/** How many IDs are registered for a table */
function count(tableName) {
  return idMap.has(tableName) ? idMap.get(tableName).size : 0;
}

/** Return the full map for debugging */
function dump() {
  const out = {};
  for (const [table, map] of idMap.entries()) {
    out[table] = map.size;
  }
  return out;
}

module.exports = { register, resolve, count, dump };
