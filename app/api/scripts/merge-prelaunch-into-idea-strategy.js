/**
 * One-off migration: merge "PreLaunched Activity" into "Idea Strategy Planning"
 * (now displayed as "Our Activities").
 *
 * Copies every document from `marketing_house_pre_launch_activities` into
 * `marketing_house_idea_strategy_planning`, keeping the same _id so the run is
 * idempotent (re-running skips docs that were already copied). The source
 * collection is left in place as a backup; drop it manually once verified.
 *
 * Run from app/api:  node scripts/merge-prelaunch-into-idea-strategy.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const src = db.collection('marketing_house_pre_launch_activities');
  const dst = db.collection('marketing_house_idea_strategy_planning');

  const docs = await src.find({}).toArray();
  let copied = 0, skipped = 0;
  for (const d of docs) {
    const exists = await dst.findOne({ _id: d._id });
    if (exists) { skipped++; continue; }
    await dst.insertOne(d);
    copied++;
  }
  console.log(`pre-launch docs found: ${docs.length}, copied: ${copied}, already present: ${skipped}`);
  console.log('idea_strategy total now:', await dst.countDocuments());
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
