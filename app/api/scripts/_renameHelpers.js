'use strict';

/**
 * Shared helpers for the rename-*-keys.js one-time migrations.
 * All operations are idempotent: $rename is a no-op for documents without
 * the old key, fill-renames are filtered so they never clobber an existing
 * target, and the timestamp pass skips documents already carrying Dates.
 */

// Plain rename: old keys move to new keys; if the target already exists it
// is OVERWRITTEN (so order maps from least- to most-authoritative source).
const rename = async (col, map, filter = {}) => {
  const res = await col.updateMany(filter, { $rename: map });
  console.log(`  ${col.collectionName}: rename ${Object.keys(map).join(', ')} → matched ${res.matchedCount}, modified ${res.modifiedCount}`);
};

// Fill-rename: move `from` → `to` ONLY where `to` is missing/empty; then
// drop the leftover `from` key everywhere else.
const fillRename = async (col, from, to) => {
  await col.updateMany(
    { [from]: { $exists: true }, $or: [{ [to]: { $exists: false } }, { [to]: null }, { [to]: '' }] },
    { $rename: { [from]: to } }
  );
  const res = await col.updateMany({ [from]: { $exists: true } }, { $unset: { [from]: 1 } });
  console.log(`  ${col.collectionName}: fill ${from} → ${to} (dropped ${res.modifiedCount} leftover)`);
};

const toDate = (val) => {
  if (val instanceof Date) return val;
  if (val === null || val === undefined || val === '') return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Backfill mongoose-standard createdAt/updatedAt from legacy Laravel
// created_at/updated_at and drop the legacy keys.
const fixTimestamps = async (col) => {
  const docs = await col.find({ $or: [{ created_at: { $exists: true } }, { updated_at: { $exists: true } }, { createdAt: { $not: { $type: 'date' } } }] }).toArray();
  let migrated = 0;
  for (const doc of docs) {
    const createdAt = toDate(doc.createdAt) ?? toDate(doc.created_at) ?? new Date();
    const updatedAt = toDate(doc.updatedAt) ?? toDate(doc.updated_at) ?? createdAt;
    const needsSet = !(doc.createdAt instanceof Date) || !(doc.updatedAt instanceof Date);
    const needsUnset = 'created_at' in doc || 'updated_at' in doc;
    if (!needsSet && !needsUnset) continue;
    await col.updateOne(
      { _id: doc._id },
      {
        ...(needsSet ? { $set: { createdAt, updatedAt } } : {}),
        ...(needsUnset ? { $unset: { created_at: 1, updated_at: 1 } } : {}),
      }
    );
    migrated += 1;
  }
  console.log(`  ${col.collectionName}: timestamps backfilled on ${migrated} docs`);
};

// Move a unique index from an old field to a new one (best-effort).
const moveUniqueIndex = async (col, oldIndexName, newField) => {
  try {
    await col.dropIndex(oldIndexName);
    console.log(`  ${col.collectionName}: dropped index ${oldIndexName}`);
  } catch (err) {
    console.log(`  ${col.collectionName}: index ${oldIndexName} not present (${err.codeName || err.message})`);
  }
  try {
    await col.createIndex({ [newField]: 1 }, { unique: true });
    console.log(`  ${col.collectionName}: unique index on ${newField} ensured`);
  } catch (err) {
    console.log(`  ${col.collectionName}: could not create unique ${newField} index: ${err.message}`);
  }
};

module.exports = { rename, fillRename, fixTimestamps, moveUniqueIndex };
