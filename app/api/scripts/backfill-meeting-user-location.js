'use strict';

/**
 * One-time migration: give every meeting a `userLocation` key, so the field
 * exists on all documents in the `meetings` collection.
 *
 * Only documents that have NO userLocation at all are touched — a meeting that
 * already has a resolved location is never overwritten. Each one gets empty
 * values: city/region/country/countryCode/source = '' and capturedAt = null
 * (null rather than '' because capturedAt is a Date).
 *
 * Idempotent: running it again changes nothing.
 *
 * Run (from app/api):
 *   node scripts/backfill-meeting-user-location.js --dry-run   # count only
 *   node scripts/backfill-meeting-user-location.js             # apply
 */

require('dotenv').config();
const mongoose = require('mongoose');

const EMPTY_USER_LOCATION = {
  city: '',
  region: '',
  country: '',
  countryCode: '',
  source: '',
  capturedAt: null,
};

(async () => {
  const dryRun = process.argv.includes('--dry-run');
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const meetings = mongoose.connection.db.collection('meetings');

  const missing = { userLocation: { $exists: false } };
  const total = await meetings.countDocuments();
  const toUpdate = await meetings.countDocuments(missing);
  console.log(`meetings: ${total} total, ${toUpdate} without userLocation, ${total - toUpdate} already have it`);

  if (dryRun) {
    console.log('Dry run — nothing written.');
  } else if (toUpdate) {
    const res = await meetings.updateMany(missing, { $set: { userLocation: EMPTY_USER_LOCATION } });
    console.log(`Added userLocation to ${res.modifiedCount} meeting(s).`);
  } else {
    console.log('Nothing to do.');
  }

  await mongoose.disconnect();
})().catch(async (err) => {
  console.error('Migration failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
