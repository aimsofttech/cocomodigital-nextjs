require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

async function analyzeDatabase() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  const names = collections.map(c => c.name).sort();

  console.log('\n=== COLLECTIONS (' + names.length + ' total) ===');
  console.log(names.join('\n'));

  for (const name of names) {
    const col = db.collection(name);
    const count = await col.countDocuments();
    const sample = await col.find({}).limit(2).toArray();

    console.log('\n\n--- ' + name.toUpperCase() + ' (' + count + ' docs) ---');
    if (sample.length > 0) {
      // Print field structure from first doc
      const doc = sample[0];
      printFields(doc, '  ');
    } else {
      console.log('  (empty collection)');
    }
  }

  await mongoose.disconnect();
}

function printFields(obj, indent, prefix) {
  for (const [key, val] of Object.entries(obj)) {
    if (key === '__v') continue;
    const type = getType(val);
    console.log(indent + (prefix || '') + key + ' : ' + type);
    if (type === 'object' && val !== null) {
      printFields(val, indent + '  ');
    } else if (type === 'array' && val.length > 0 && typeof val[0] === 'object' && val[0] !== null) {
      printFields(val[0], indent + '  ', '[0].');
    }
  }
}

function getType(val) {
  if (val === null) return 'null';
  if (val instanceof mongoose.Types.ObjectId || (val && val._bsontype === 'ObjectId')) return 'ObjectId';
  if (val instanceof Date) return 'Date';
  if (Array.isArray(val)) return 'array[' + (val.length > 0 ? getType(val[0]) : 'empty') + ']';
  return typeof val;
}

analyzeDatabase().catch(e => { console.error(e); process.exit(1); });
