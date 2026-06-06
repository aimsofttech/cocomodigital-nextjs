'use strict';
const mongoose = require('mongoose');

let isConnected = false;

async function connect(uri) {
  await mongoose.connect(uri);
  isConnected = true;
  console.log(`✅  MongoDB connected → ${uri}`);
}

async function disconnect() {
  if (isConnected) {
    await mongoose.disconnect();
    console.log('MongoDB connection closed');
  }
}

/**
 * Drop all collections from a list of collection names.
 * Used to reset MongoDB before a fresh migration.
 */
async function dropCollections(collectionNames) {
  const db = mongoose.connection.db;
  const existing = await db.listCollections().toArray();
  const existingNames = new Set(existing.map((c) => c.name));

  for (const name of collectionNames) {
    if (existingNames.has(name)) {
      await db.dropCollection(name);
      console.log(`  🗑️  Dropped collection: ${name}`);
    }
  }
}

/**
 * Insert documents into a MongoDB collection using raw driver
 * (bypasses Mongoose validation for speed during migration).
 * Returns count of inserted documents.
 */
async function insertMany(collectionName, docs, options = {}) {
  if (!docs || docs.length === 0) return 0;
  const db = mongoose.connection.db;
  const collection = db.collection(collectionName);
  const { insertedCount } = await collection.insertMany(docs, {
    ordered: false,
    ...options,
  });
  return insertedCount;
}

/**
 * Count documents in a collection.
 */
async function countDocuments(collectionName) {
  try {
    const db = mongoose.connection.db;
    return await db.collection(collectionName).countDocuments();
  } catch {
    return 0;
  }
}

/**
 * Create indexes on a collection to match Mongoose model indexes.
 */
async function createIndexes(collectionName, indexSpecs) {
  if (!indexSpecs || indexSpecs.length === 0) return;
  const db = mongoose.connection.db;
  const collection = db.collection(collectionName);
  for (const spec of indexSpecs) {
    try {
      await collection.createIndex(spec.key, spec.options || {});
    } catch (err) {
      // Ignore duplicate index errors
      if (!err.message.includes('already exists')) {
        console.warn(`  ⚠️  Index creation warning [${collectionName}]:`, err.message);
      }
    }
  }
}

module.exports = { connect, disconnect, dropCollections, insertMany, countDocuments, createIndexes };
