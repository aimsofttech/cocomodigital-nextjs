require('dotenv').config();
const mongoose = require('mongoose');

// Verified legacy MySQL id for each department (matches the integer stored in
// explore_our_service_item.service_category_id on migrated records).
const LEGACY_ID_BY_NAME = {
  Content: 1,
  Growth: 2,
  Monetisation: 3,
  'Our Other Services': 4,
  Management: 24,
};

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const col = mongoose.connection.db.collection('explore_our_service_category');

  for (const [name, id] of Object.entries(LEGACY_ID_BY_NAME)) {
    const res = await col.updateOne({ service_category_name: name }, { $set: { id } });
    console.log(`${name} -> id ${id}: matched ${res.matchedCount}, modified ${res.modifiedCount}`);
  }

  const all = await col.find({}).sort({ id: 1 }).toArray();
  console.log('\nResult:');
  all.forEach((c) => console.log(`id ${c.id} | ${c.service_category_name} | _id ${c._id}`));

  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
