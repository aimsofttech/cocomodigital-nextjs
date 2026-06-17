'use strict';

/**
 * Shared CSV helpers for the generic bulk import / export feature.
 *
 * Format: the header row holds the RAW schema field names and the cells hold the
 * RAW stored values (S3 keys/URLs, ObjectId foreign keys, status 0/1, …). This
 * guarantees a clean export → import round-trip and never reinterprets data, so
 * records created here are identical in shape to ones created via the admin form.
 */

// Never written to an export.
const OMIT_EXPORT = new Set(['__v', '_legacy_fks']);
// Identity / audit fields ignored on import so every row is created fresh
// (import is create-only — it never updates existing records).
const OMIT_IMPORT = new Set(['_id', '__v', 'createdAt', 'updatedAt', '_legacy_fks']);

// Render one value as a CSV cell, quoting/escaping when needed.
const cell = (v) => {
  if (v === null || v === undefined) return '';
  let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
};

// Serialise an array of plain objects to a CSV string. Columns are the union of
// all keys in first-seen order, minus internal fields.
const recordsToCsv = (records) => {
  const cols = [];
  const seen = new Set();
  for (const r of records) {
    for (const k of Object.keys(r)) {
      if (OMIT_EXPORT.has(k) || seen.has(k)) continue;
      seen.add(k);
      cols.push(k);
    }
  }
  const lines = [cols.map(cell).join(',')];
  for (const r of records) lines.push(cols.map((c) => cell(r[c])).join(','));
  return lines.join('\r\n');
};

// Robust CSV parser: handles quoted fields containing commas, embedded newlines
// and escaped quotes (""). Returns an array of row-arrays (header row included).
const parseCsv = (text) => {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n') {
      row.push(field); field = ''; rows.push(row); row = [];
    } else if (ch === '\r') {
      if (text[i + 1] !== '\n') { row.push(field); field = ''; rows.push(row); row = []; }
    } else {
      field += ch;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
};

// Parse a CSV or XLSX file (multer memory buffer) into an array of objects keyed
// by the header row.
const fileToRecords = (file) => {
  const ext = (file.originalname.split('.').pop() || '').toLowerCase();
  let matrix;
  if (['xls', 'xlsx'].includes(ext)) {
    const XLSX = require('xlsx');
    const wb = XLSX.read(file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    matrix = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
  } else {
    matrix = parseCsv(file.buffer.toString('utf8'));
  }
  if (!matrix.length) return [];
  const header = matrix[0].map((h) => String(h).trim());
  const records = [];
  for (let i = 1; i < matrix.length; i++) {
    const arr = matrix[i] || [];
    if (!arr.some((v) => String(v).trim() !== '')) continue; // skip blank rows
    const rec = {};
    header.forEach((key, idx) => {
      if (key) rec[key] = arr[idx] === undefined ? '' : arr[idx];
    });
    records.push(rec);
  }
  return records;
};

// Coerce a raw CSV string back into a JS value: JSON for array/object cells,
// otherwise the string as-is (Mongoose casts numbers/booleans per the schema).
const coerce = (v) => {
  if (typeof v !== 'string') return v;
  const t = v.trim();
  if (t === '') return '';
  if ((t.startsWith('[') && t.endsWith(']')) || (t.startsWith('{') && t.endsWith('}'))) {
    try { return JSON.parse(t); } catch { /* keep raw string */ }
  }
  return v;
};

module.exports = { recordsToCsv, parseCsv, fileToRecords, coerce, OMIT_EXPORT, OMIT_IMPORT };
