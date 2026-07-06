'use strict';

/**
 * One-time cleanup: remove Group Services document keys that are not used by
 * any code path (API, admin, or web) after the camelCase key migration
 * (rename-group-service-keys.js).
 *
 * Removed:
 *  - runningItem (group_service_item)         — no reader/writer anywhere
 *  - serviceCategoryId / serviceItemId
 *    (group_services_category)                — schema-only ghosts, superseded
 *                                               by exploreOurService*Id
 *  - image_title / imageTitle
 *    (group_single_service_image)             — never rendered or written
 *  - _legacy_fks (all group collections)      — migration provenance, not read
 *                                               by any group code path
 *
 * Run:   node scripts/cleanup-group-service-unused-keys.js     (from app/api)
 * Idempotent: $unset is a no-op when the key is absent.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const GROUP_COLLECTIONS = [
  'group_services_category',
  'group_service_item',
  'group_service_category_item',
  'group_single_service_image',
  'group_single_service_recent_work',
  'group_single_service_portfolio_category',
  'group_single_service_portfolio_item',
];

const EXTRA_UNSETS = {
  group_service_item: ['runningItem', 'group_service_item_running_item'],
  group_services_category: ['serviceCategoryId', 'serviceItemId', 'service_category_id', 'service_item_id'],
  group_single_service_image: ['imageTitle', 'image_title'],
};

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  for (const name of GROUP_COLLECTIONS) {
    const keys = ['_legacy_fks', ...(EXTRA_UNSETS[name] || [])];
    const unset = Object.fromEntries(keys.map((k) => [k, '']));
    const res = await db.collection(name).updateMany({}, { $unset: unset });
    console.log(`${name}: removed [${keys.join(', ')}] — modified ${res.modifiedCount}/${res.matchedCount}`);
  }

  await mongoose.disconnect();
  console.log('Done.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
