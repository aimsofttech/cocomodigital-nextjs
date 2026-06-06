'use strict';
const mysql = require('mysql2/promise');

let connection = null;

async function connect(config) {
  connection = await mysql.createConnection(config);
  console.log('✅  MySQL connected');
  return connection;
}

async function disconnect() {
  if (connection) {
    await connection.end();
    console.log('MySQL connection closed');
  }
}

/** Return all non-system table names in the database */
async function getAllTables(database) {
  const [rows] = await connection.execute(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
     ORDER BY TABLE_NAME`,
    [database]
  );
  return rows.map((r) => r.TABLE_NAME);
}

/** Return column metadata for a table */
async function getColumns(database, table) {
  const [rows] = await connection.execute(
    `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
     ORDER BY ORDINAL_POSITION`,
    [database, table]
  );
  return rows;
}

/** Read all rows from a table */
async function readAll(table) {
  const [rows] = await connection.execute(`SELECT * FROM \`${table}\``);
  return rows;
}

/** Read rows in batches (for large tables) */
async function readBatched(table, batchSize = 500, onBatch) {
  const [[{ total }]] = await connection.execute(
    `SELECT COUNT(*) as total FROM \`${table}\``
  );
  let offset = 0;
  let totalRead = 0;
  while (offset < total) {
    const [rows] = await connection.execute(
      `SELECT * FROM \`${table}\` LIMIT ? OFFSET ?`,
      [batchSize, offset]
    );
    if (rows.length === 0) break;
    await onBatch(rows);
    totalRead += rows.length;
    offset += batchSize;
  }
  return totalRead;
}

/** Count rows in a table */
async function countRows(table) {
  try {
    const [[{ c }]] = await connection.execute(
      `SELECT COUNT(*) as c FROM \`${table}\``
    );
    return Number(c);
  } catch {
    return 0;
  }
}

module.exports = { connect, disconnect, getAllTables, getColumns, readAll, readBatched, countRows };
