'use strict';

/**
 * One-time seed: the "Growth at a glance" homepage stat tiles, matching
 * the values that were hardcoded in the web app's StatsSection component
 * before the section went admin-managed.
 *
 * Run:   node scripts/seed-growth-stats.js     (from app/api)
 *
 * Idempotent: skips seeding when the collection already has documents.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const GrowthStat = require('../src/models/GrowthStat');

const STATS = [
  { prefix: '',  value: 45,  suffix: 'M+', label: 'Subscribers Built',      displayOrder: 1 },
  { prefix: '',  value: 12,  suffix: 'B+', label: 'Organic Views',          displayOrder: 2 },
  { prefix: '$', value: 600, suffix: 'K+', label: 'Ad Revenue · 2025',      displayOrder: 3 },
  { prefix: '',  value: 35,  suffix: 'K+', label: 'Videos Produced',        displayOrder: 4 },
  { prefix: '',  value: 70,  suffix: '%',  label: 'Partnerships Recurring', displayOrder: 5 },
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await GrowthStat.countDocuments();
  if (existing > 0) {
    console.log(`growth_stats already has ${existing} documents — skipping seed.`);
  } else {
    await GrowthStat.insertMany(STATS.map((s) => ({ ...s, status: 1 })));
    console.log(`Seeded ${STATS.length} growth stats.`);
  }

  await mongoose.disconnect();
  console.log('Done.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
