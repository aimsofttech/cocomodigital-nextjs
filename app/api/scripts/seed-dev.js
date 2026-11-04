'use strict';

/**
 * Seed the DEVELOPMENT database with the configuration the booking and contact
 * flows need, plus a few synthetic records to test against.
 *
 *   npm run seed:dev            (loads .env.local, see package.json)
 *
 * Refuses to run against anything but localhost or a database named
 * `cocoma_dev` (same allow-list as src/config/devDbGuard.js). Idempotent:
 * running it twice leaves exactly the same records, no duplicates.
 *
 * What it writes:
 *   - the admin panel login (ADMIN_EMAIL / ADMIN_PASSWORD from the env), as a
 *     Super Admin; the password is never reset on a re-run
 *   - the `meeting_availability` document: the studio schedule, mirroring
 *     production's VALUES as stated by Kirk (Mon–Sat, 10:00–20:00 IST, 15-min
 *     slots, no blocked dates). Replace SCHEDULE below, or point
 *     SEED_AVAILABILITY_JSON at an export, once the production document is
 *     available. This script never connects to production.
 *   - 3 synthetic meetings (one occupies a future slot for the 409 path, one
 *     confirmed, one rejected) and 2 contact enquiries, all @example.com
 *
 * Nothing here sends email, touches the CRM collections, or calls any
 * provider: it is plain model writes.
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const { checkDevDatabase } = require('../src/config/devDbGuard');
const User = require('../src/models/User');
const Meeting = require('../src/models/Meeting');
const ContactUs = require('../src/models/ContactUs');
const MeetingAvailability = require('../src/models/MeetingAvailability');
const { parseConfigInput, normalizeConfig, weekdayOf, addDays, slotKeyOf } = require('../src/utils/bookingWindow');
const { zonedTimeToUtc, wallClockInZone } = require('../src/utils/timezone');

const STUDIO_TZ = 'Asia/Kolkata';

// ── Schedule ────────────────────────────────────────────────────────────────
// Slot STARTS on the 15-minute grid. "10:00 to 20:00" is read as the last call
// starting at 19:45 so it ends by 20:00; change LAST_START to '20:00' if the
// studio means the last call may START at 20:00.
const FIRST_START = '10:00';
const LAST_START = '19:45';
const OPEN_WEEKDAYS = [1, 2, 3, 4, 5, 6]; // Mon–Sat (0 = Sunday)

const slotRange = (from, to) => {
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const out = [];
  for (let m = toMin(from); m <= toMin(to); m += 15) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return out;
};

const SCHEDULE = {
  timezone: STUDIO_TZ,
  minNoticeMinutes: 0,
  blockedDates: [],
  days: Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    enabled: OPEN_WEEKDAYS.includes(weekday),
    slots: OPEN_WEEKDAYS.includes(weekday) ? slotRange(FIRST_START, LAST_START) : [],
  })),
};

const loadSchedule = () => {
  const file = process.env.SEED_AVAILABILITY_JSON;
  if (!file) return SCHEDULE;
  const raw = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  // Accept either the raw document or the admin API's { data: {...} } shape.
  return raw && raw.data ? raw.data : raw;
};

// ── Synthetic people (never real addresses) ─────────────────────────────────
const SEED_TAG = '[seed-dev]';
const PEOPLE = {
  occupied: { name: 'Priya Seed', email: 'occupied-slot@example.com', phone: '919000000001' },
  confirmed: { name: 'Rahul Seed', email: 'confirmed-meeting@example.com', phone: '919000000002' },
  rejected: { name: 'Meera Seed', email: 'rejected-meeting@example.com', phone: '919000000003' },
  enquiry1: { name: 'Arjun Seed', email: 'enquiry-one@example.com', phone: '919000000004' },
  enquiry2: { name: 'Sara Seed', email: 'enquiry-two@example.com', phone: '' },
};

/** The next studio-zone date with the given weekday, strictly after today. */
const nextWeekday = (weekday, fromDate) => {
  let d = addDays(fromDate, 1);
  for (let i = 0; i < 8 && weekdayOf(d) !== weekday; i++) d = addDays(d, 1);
  return d;
};

const upsertMeeting = async (person, fields) => {
  let doc = await Meeting.findOne({ email: person.email });
  const created = !doc;
  if (!doc) doc = new Meeting({ userName: person.name, email: person.email });
  Object.assign(doc, { userName: person.name, phone: person.phone, ...fields });
  await doc.save(); // save(), not findOneAndUpdate: the pre('save') hook derives slot_hold
  return created;
};

const upsertEnquiry = async (person, fields) => {
  const existing = await ContactUs.findOne({ email: person.email });
  if (existing) {
    await ContactUs.updateOne({ _id: existing._id }, { $set: { name: person.name, phone: person.phone, ...fields } });
    return false;
  }
  await ContactUs.create({ name: person.name, email: person.email, phone: person.phone, ...fields });
  return true;
};

const main = async () => {
  const uri = process.env.MONGO_URI;
  const guard = checkDevDatabase(uri, 'development'); // always apply the dev rule, whatever NODE_ENV says
  if (!guard.ok) {
    console.error(`[seed-dev] Refusing to run: ${guard.reason}`);
    process.exit(1);
  }
  const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  if (!adminEmail || adminPassword.length < 6) {
    console.error('[seed-dev] ADMIN_EMAIL and ADMIN_PASSWORD (6+ chars) must be set in the dev env.');
    process.exit(1);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const dbName = mongoose.connection.db.databaseName;
  console.log(`[seed-dev] Connected to database "${dbName}"`);

  const summary = [];

  // 1) Admin panel login
  {
    let user = await User.findOne({ email: adminEmail });
    if (!user) {
      user = await User.create({
        name: 'Kirk (dev)', email: adminEmail, password: adminPassword,
        role: 'admin', roleKey: 'super_admin', status: 1, email_verified_at: new Date(),
      });
      summary.push(`admin user created: ${adminEmail}`);
    } else {
      let changed = false;
      if (user.roleKey !== 'super_admin') { user.roleKey = 'super_admin'; changed = true; }
      if (user.status !== 1) { user.status = 1; changed = true; }
      if (user.deletedAt) { user.deletedAt = null; changed = true; }
      if (changed) await user.save();
      summary.push(`admin user exists: ${adminEmail}${changed ? ' (access restored)' : ''}`);
    }
  }

  // 2) Studio schedule
  {
    const parsed = parseConfigInput(loadSchedule(), normalizeConfig(null));
    if (!parsed.ok) throw new Error(`Schedule is invalid: ${parsed.message}`);
    await MeetingAvailability.findOneAndUpdate(
      { key: 'default' },
      { $set: { ...parsed.value, updatedBy: { seed: SEED_TAG } } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const open = parsed.value.days.filter((d) => d.enabled);
    summary.push(`schedule set: ${open.length} open weekdays, ${open[0]?.slots.length || 0} slots/day (${open[0]?.slots[0]}–${open[0]?.slots.at(-1)} ${parsed.value.timezone}), ${parsed.value.blockedDates.length} blocked dates`);
  }

  // 3) Synthetic meetings (dates are relative to today so the slots stay bookable)
  {
    const today = wallClockInZone(new Date(), STUDIO_TZ).date;
    const monday = nextWeekday(1, today);
    const tuesday = nextWeekday(2, today);
    const lastWeek = addDays(today, -7);

    const slot = (date, time, tz = STUDIO_TZ) => {
      const utc = zonedTimeToUtc(date, time, tz);
      return {
        meetingDate: date, meetingTime: `${time}:00`, meetingTimezone: tz,
        meeting_start_utc: utc, slot_key: slotKeyOf(utc), duration: 15,
      };
    };

    const results = await Promise.all([
      // Occupies next Monday 11:00 IST → booking it again must return 409.
      upsertMeeting(PEOPLE.occupied, {
        ...slot(monday, '11:00'), status: 'pending', service: 'Discovery Call',
        source_page: '/ScheduleMeeting', notes: `${SEED_TAG} Occupies a slot so the taken-slot (409) path can be tested.`,
        confirmedAt: null, rejectedAt: null,
      }),
      upsertMeeting(PEOPLE.confirmed, {
        ...slot(tuesday, '15:00'), status: 'confirmed', service: 'Podcast Editing',
        source_page: '/ScheduleMeeting', notes: `${SEED_TAG} Confirmed meeting (no Meet link in dev).`,
        confirmedAt: new Date(), confirmedBy: { seed: SEED_TAG }, rejectedAt: null,
      }),
      upsertMeeting(PEOPLE.rejected, {
        ...slot(lastWeek, '12:00', 'America/New_York'), status: 'rejected', service: 'YouTube Growth',
        source_page: '/ScheduleMeeting', notes: `${SEED_TAG} Rejected meeting in a non-IST zone.`,
        rejectedAt: new Date(), confirmedAt: null,
      }),
    ]);
    summary.push(`meetings: ${results.filter(Boolean).length} created, ${results.filter((c) => !c).length} updated (occupied slot: ${monday} 11:00 ${STUDIO_TZ})`);
  }

  // 4) Synthetic contact enquiries
  {
    const results = await Promise.all([
      upsertEnquiry(PEOPLE.enquiry1, { subject: 'Podcast Editing', message: `[Type: Podcast Editing]\n\n${SEED_TAG} Looking for weekly episode editing.` }),
      upsertEnquiry(PEOPLE.enquiry2, { subject: 'General', message: `[Type: General]\n\n${SEED_TAG} Enquiry without a phone number.` }),
    ]);
    summary.push(`enquiries: ${results.filter(Boolean).length} created, ${results.filter((c) => !c).length} updated`);
  }

  for (const line of summary) console.log(`[seed-dev] ${line}`);
  console.log('[seed-dev] Done.');
  await mongoose.disconnect();
};

main().catch(async (err) => {
  console.error(`[seed-dev] Failed: ${err.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
