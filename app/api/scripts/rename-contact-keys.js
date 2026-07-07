'use strict';

/**
 * One-time migration: rename Contact module document keys to camelCase —
 * contact_us, free_consultation_category, free_consultation_item.
 *
 * DELIBERATELY UNTOUCHED: the meeting-slot booking keys on
 * free_consultation_item (meeting_start_utc, slot_key, meeting_status,
 * meeting_date/time/timezone, google_*, meet_link, service, source_page,
 * notes) — the unique partial slot index and the booking race-guard in
 * contactController depend on those exact names.
 *
 * Run:   node scripts/rename-contact-keys.js     (from app/api)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { rename, fillRename, fixTimestamps } = require('./_renameHelpers');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const contacts = db.collection('contact_us');
  await rename(contacts, {
    first_name: 'firstName',
    last_name: 'lastName',
    phone_no: 'phoneNo',
    company_name: 'companyName',
    media_budget: 'mediaBudget',
    is_read: 'isRead',
  });
  await fixTimestamps(contacts);

  const categories = db.collection('free_consultation_category');
  await rename(categories, {
    category_name: 'name',
    display_order: 'displayOrder',
    user_id: 'userId',
  });
  await fixTimestamps(categories);

  const items = db.collection('free_consultation_item');
  await rename(items, {
    is_read: 'isRead',
    consultation_category_id: 'consultationCategoryId',
    display_order: 'displayOrder',
    user_id: 'userId',
  });
  // Legacy config rows keyed the category as free_consultation_category_id.
  await fillRename(items, 'free_consultation_category_id', 'consultationCategoryId');
  await fixTimestamps(items);

  await mongoose.disconnect();
  console.log('rename-contact-keys: done');
})().catch((err) => { console.error(err); process.exit(1); });
