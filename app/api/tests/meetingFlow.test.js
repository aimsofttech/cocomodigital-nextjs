// End-to-end test of the Book a Meeting workflow: public booking → admin
// confirm / assign / reschedule / cancel / reject, through the real Express
// routes, controllers, Mongoose models and email templates.
//
// What is real: routes, controllers, the Meeting model and its slot-hold
// indexes (against a real MongoDB), the availability rules, bookingMailer's
// templates and recipient logic, mailer.js.
// What is faked: the SMTP transport (every message is captured instead of
// sent), the Google Calendar API (an in-memory calendar), and the CRM ingest
// hook. Nothing leaves the machine.
//
// Run with a disposable database — the script refuses any non-local URI:
//   MEETING_TEST_MONGO_URI=mongodb://127.0.0.1:27017/meeting_flow_test node tests/meetingFlow.test.js
const assert = require('assert');
const path = require('path');
const http = require('http');

const MONGO_URI = process.env.MEETING_TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/meeting_flow_test';
if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(MONGO_URI)) {
  console.error(`Refusing to run against a non-local database: ${MONGO_URI}`);
  process.exit(1);
}

// ── environment: fake credentials so both integrations switch on ───────────
Object.assign(process.env, {
  SMTP_HOST: 'smtp.test.invalid', SMTP_USER: 'bookings@studio.test', SMTP_PASS: 'x',
  MAIL_FROM: 'Cocoma Digital <bookings@studio.test>', MAIL_BRAND: 'Cocoma Digital',
  OWNER_EMAIL: 'owner@studio.test', OWNER_NAME: 'Anil',
  ADMIN_PANEL_URL: 'https://admin.studio.test/admin',
  GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret', GOOGLE_REFRESH_TOKEN: 'token',
  MEETING_HOST_EMAIL: 'host@studio.test', MEETING_DURATION_MIN: '15',
});

// ── fake SMTP: capture every message ───────────────────────────────────────
const sent = [];
const nodemailer = require('nodemailer');
nodemailer.createTransport = () => ({
  sendMail: async (msg) => { sent.push(msg); return { messageId: `<${sent.length}@test>` }; },
  verify: async () => true,
});

// ── fake Google Calendar ───────────────────────────────────────────────────
const events = new Map();
let eventSeq = 0;
const calendarCalls = [];
let failNextInsert = false;
const gone = () => Object.assign(new Error('Not Found'), { code: 404 });
const fakeCalendar = {
  events: {
    insert: async ({ requestBody }) => {
      calendarCalls.push('insert');
      if (failNextInsert) { failNextInsert = false; throw new Error('Calendar API unavailable'); }
      const id = `evt${++eventSeq}`;
      const ev = { ...requestBody, id, status: 'confirmed', hangoutLink: `https://meet.google.com/test-${id}`, htmlLink: `https://calendar.test/${id}` };
      events.set(id, ev);
      return { data: ev };
    },
    patch: async ({ eventId, requestBody }) => {
      calendarCalls.push('patch');
      const ev = events.get(eventId);
      if (!ev) throw gone();
      Object.assign(ev, requestBody);
      return { data: ev };
    },
    delete: async ({ eventId }) => {
      calendarCalls.push('delete');
      if (!events.has(eventId)) throw gone();
      events.delete(eventId);
      return { data: '' };
    },
  },
};
const { google } = require('googleapis');
google.auth.OAuth2 = class { setCredentials() {} };
google.calendar = () => fakeCalendar;

// ── stub the CRM hook (its automations can send WhatsApp / place calls) ────
const leadIngestPath = require.resolve(path.join(__dirname, '../src/crm/services/leadIngest'));
require.cache[leadIngestPath] = { id: leadIngestPath, filename: leadIngestPath, loaded: true, exports: { ingestSafe: () => {}, ingest: async () => {} } };

require('express-async-errors');
const express = require('express');
const mongoose = require('mongoose');
const Meeting = require('../src/models/Meeting');

// ── app: the real routers, with the admin user already authenticated (the
//    production `authorizeAdmin` gate sets req.user the same way) ───────────
const app = express();
app.use(express.json());
app.use('/api/contact', require('../src/routes/api/contact'));
app.use('/admin/api/meetings', (req, _res, next) => { req.user = { _id: 'admin-test' }; next(); }, require('../src/routes/admin/meeting'));
app.use(require('../src/middleware/errorHandler'));

let baseUrl;
const call = async (method, url, body) => {
  const res = await fetch(`${baseUrl}${url}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
};

// Emails go out after the response — wait until `n` new ones have arrived.
const waitForMail = async (from, n) => {
  for (let i = 0; i < 100 && sent.length < from + n; i++) await new Promise((r) => setTimeout(r, 20));
  await new Promise((r) => setTimeout(r, 50)); // and make sure no extras follow
  return sent.slice(from);
};
const to = (m) => [].concat(m.to).map((x) => String(x).toLowerCase()).sort().join(',');
const find = (mails, recipients) => mails.find((m) => to(m) === [].concat(recipients).sort().join(','));

// A slot on the default (all-open) grid, `days` from now at 10:00 IST.
const istSlot = (days, hhmm = '10:00') => {
  const d = new Date(Date.now() + days * 86400000);
  const date = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const startUtc = new Date(`${date}T${hhmm}:00+05:30`).toISOString();
  return { date, time: hhmm, startUtc };
};

const VISITOR = 'visitor@client.test';
const ASSIGNEE = { name: 'Priya', email: 'priya@studio.test' };
const results = [];
const test = async (name, fn) => {
  try { await fn(); results.push([true, name]); console.log(`  ✓ ${name}`); }
  catch (err) { results.push([false, name]); console.log(`  ✗ ${name}\n      ${err.stack.split('\n').slice(0, 3).join('\n      ')}`); }
};

(async () => {
  await mongoose.connect(MONGO_URI);
  await mongoose.connection.dropDatabase();
  await Meeting.syncIndexes();
  const server = http.createServer(app).listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const slotA = istSlot(2);
  const slotB = istSlot(3, '11:30');
  const slotC = istSlot(4, '15:00');
  let meetingA;
  let meetingB;

  console.log('\nBooking');
  await test('visitor books a slot → pending meeting + request emails to owner and visitor', async () => {
    const n = sent.length;
    const { status, body } = await call('POST', '/api/contact/free-consultation', {
      name: 'Rahul Verma', email: VISITOR, phone: '+91 90000 00000', service: 'Discovery Call',
      meeting_date: slotA.date, meeting_time: `${slotA.time}:00`, meeting_timezone: 'Asia/Kolkata',
      meeting_start_utc: slotA.startUtc, notes: 'Message: launching a web series',
    });
    assert.strictEqual(status, 201, JSON.stringify(body));
    meetingA = body.data;
    assert.strictEqual(meetingA.status, 'pending');
    assert.strictEqual(new Date(meetingA.meeting_start_utc).toISOString(), slotA.startUtc);

    const mails = await waitForMail(n, 2);
    assert.strictEqual(mails.length, 2);
    const owner = find(mails, 'owner@studio.test');
    const user = find(mails, VISITOR);
    assert.match(owner.subject, /New Meeting Request from Rahul Verma/);
    assert.match(owner.html, new RegExp(`open=${meetingA._id}&amp;action=confirm`));
    assert.strictEqual(user.subject, 'Meeting Request Received');
    assert.match(user.html, /10:00 AM \(Asia\/Kolkata\)/);
  });

  await test('the same slot cannot be booked twice (409)', async () => {
    const { status } = await call('POST', '/api/contact/free-consultation', {
      name: 'Someone Else', email: 'else@client.test',
      meeting_date: slotA.date, meeting_time: slotA.time, meeting_timezone: 'Asia/Kolkata', meeting_start_utc: slotA.startUtc,
    });
    assert.strictEqual(status, 409);
  });

  await test('a booking with an empty timezone succeeds and its emails still render', async () => {
    const n = sent.length;
    const { status, body } = await call('POST', '/api/contact/free-consultation', {
      name: 'No Zone', email: 'nozone@client.test',
      meeting_date: slotB.date, meeting_time: slotB.time, meeting_timezone: '', meeting_start_utc: slotB.startUtc,
    });
    assert.strictEqual(status, 201, JSON.stringify(body));
    meetingB = body.data;
    assert.strictEqual(meetingB.meetingTimezone, 'Asia/Kolkata');
    assert.strictEqual(meetingB.meetingTime, '11:30');
    const mails = await waitForMail(n, 2);
    assert.strictEqual(mails.length, 2);
    assert.match(find(mails, 'nozone@client.test').html, /11:30 AM \(Asia\/Kolkata\)/);
  });

  console.log('\nConfirm');
  await test('a Google failure leaves the meeting pending and sends nothing (502)', async () => {
    const n = sent.length;
    failNextInsert = true;
    const { status, body } = await call('PUT', `/admin/api/meetings/${meetingA._id}/confirm`);
    assert.strictEqual(status, 502, JSON.stringify(body));
    assert.strictEqual((await Meeting.findById(meetingA._id)).status, 'pending');
    assert.strictEqual((await waitForMail(n, 0)).length, 0);
  });

  await test('confirm creates one event with a Meet link and emails it to owner and visitor', async () => {
    const n = sent.length;
    const { status, body } = await call('PUT', `/admin/api/meetings/${meetingA._id}/confirm`);
    assert.strictEqual(status, 200, JSON.stringify(body));
    const doc = await Meeting.findById(meetingA._id).lean();
    assert.strictEqual(doc.status, 'confirmed');
    assert.ok(doc.meetLink && doc.google_event_id);
    assert.strictEqual(events.size, 1);
    const ev = events.get(doc.google_event_id);
    assert.strictEqual(ev.start.dateTime, slotA.startUtc);
    assert.deepStrictEqual(ev.attendees.map((a) => a.email), [VISITOR, 'host@studio.test']);

    const mails = await waitForMail(n, 2);
    assert.strictEqual(mails.length, 2);
    const owner = find(mails, 'owner@studio.test');
    const user = find(mails, VISITOR);
    assert.strictEqual(user.subject, 'Meeting Confirmed');
    for (const m of [owner, user]) {
      assert.ok(m.html.includes(doc.meetLink), `${m.subject} lacks the Meet link`);
      assert.ok(m.text.includes(doc.meetLink), `${m.subject} text part lacks the Meet link`);
    }
  });

  await test('confirming a meeting twice sends no second set of emails', async () => {
    const n = sent.length;
    const { body } = await call('PUT', `/admin/api/meetings/${meetingA._id}/confirm`);
    assert.strictEqual(body.message, 'Already confirmed');
    assert.strictEqual((await waitForMail(n, 0)).length, 0);
  });

  console.log('\nAssign');
  await test('assign saves the assignee, adds them to the event and emails assignee, owner and visitor', async () => {
    const n = sent.length;
    const { status, body } = await call('PUT', `/admin/api/meetings/${meetingA._id}/assign`, ASSIGNEE);
    assert.strictEqual(status, 200, JSON.stringify(body));
    const doc = await Meeting.findById(meetingA._id).lean();
    assert.deepStrictEqual(doc.assignedTo, ASSIGNEE);

    const mails = await waitForMail(n, 3);
    assert.strictEqual(mails.length, 3);
    const assignee = find(mails, ASSIGNEE.email);
    const owner = find(mails, 'owner@studio.test');
    const user = find(mails, VISITOR);
    assert.match(assignee.subject, /Anil has assigned you a meeting/);
    assert.ok(assignee.html.includes(doc.meetLink));
    assert.match(owner.subject, /assigned Rahul Verma's meeting to Priya/);
    assert.match(user.subject, /hosted by Priya/);
    assert.ok(user.html.includes(doc.meetLink), 'visitor assignment email lacks the Meet link');
    assert.ok(events.get(doc.google_event_id).attendees.some((a) => a.email === ASSIGNEE.email), 'assignee not on the event');
  });

  console.log('\nReschedule');
  await test('reschedule moves the same event (same Meet link) and emails owner+assignee and visitor', async () => {
    await Meeting.updateOne({ _id: meetingA._id }, { reminderSentAt: new Date() });
    const before = await Meeting.findById(meetingA._id).lean();
    const n = sent.length;
    const { status, body } = await call('PUT', `/admin/api/meetings/${meetingA._id}/reschedule`, { meetingDate: slotC.date, meetingTime: slotC.time });
    assert.strictEqual(status, 200, JSON.stringify(body));
    const doc = await Meeting.findById(meetingA._id).lean();
    assert.strictEqual(new Date(doc.meeting_start_utc).toISOString(), slotC.startUtc);
    assert.strictEqual(doc.status, 'confirmed');
    assert.strictEqual(doc.google_event_id, before.google_event_id);
    assert.strictEqual(doc.meetLink, before.meetLink);
    assert.strictEqual(doc.reminderSentAt, null, 'reminder not re-armed for the new time');
    assert.strictEqual(events.size, 1, 'an orphaned calendar event was left behind');
    assert.strictEqual(events.get(doc.google_event_id).start.dateTime, slotC.startUtc);

    const mails = await waitForMail(n, 2);
    assert.strictEqual(mails.length, 2);
    const ownerSide = find(mails, ['owner@studio.test', ASSIGNEE.email]);
    const user = find(mails, VISITOR);
    assert.ok(ownerSide, 'owner-side email must go to the owner and the assignee');
    assert.match(ownerSide.html, /3:00 PM/);
    assert.match(user.html, /3:00 PM/);
    for (const m of [ownerSide, user]) assert.ok(m.html.includes(doc.meetLink));
  });

  await test('the old slot is free again after the reschedule', async () => {
    const { body } = await call('GET', `/api/contact/availability?date=${slotA.date}&tz=Asia/Kolkata`);
    const s = body.slots.find((x) => x.startUtc === slotA.startUtc);
    assert.ok(s && !s.booked);
  });

  console.log('\nCancel / reject');
  await test('cancelling a confirmed meeting deletes the event and emails owner+assignee and visitor', async () => {
    const n = sent.length;
    const { status, body } = await call('PUT', `/admin/api/meetings/${meetingA._id}/reject`);
    assert.strictEqual(status, 200, JSON.stringify(body));
    assert.strictEqual(body.message, 'Meeting cancelled and user notified');
    const doc = await Meeting.findById(meetingA._id).lean();
    assert.strictEqual(doc.status, 'rejected');
    assert.strictEqual(doc.meetLink, null);
    assert.strictEqual(events.size, 0);

    const mails = await waitForMail(n, 2);
    assert.strictEqual(mails.length, 2);
    assert.match(find(mails, ['owner@studio.test', ASSIGNEE.email]).subject, /Meeting Cancelled/);
    assert.strictEqual(find(mails, VISITOR).subject, 'Meeting Cancelled');
  });

  await test('rejecting a pending, unassigned request emails the visitor and the owner', async () => {
    const n = sent.length;
    const { status } = await call('PUT', `/admin/api/meetings/${meetingB._id}/reject`);
    assert.strictEqual(status, 200);
    const mails = await waitForMail(n, 2);
    assert.strictEqual(mails.length, 2);
    assert.strictEqual(find(mails, 'nozone@client.test').subject, 'Meeting Request Rejected');
    assert.match(find(mails, 'owner@studio.test').subject, /Meeting Rejected/);
  });

  await test('rejecting the same meeting again sends nothing', async () => {
    const n = sent.length;
    const { body } = await call('PUT', `/admin/api/meetings/${meetingB._id}/reject`);
    assert.strictEqual(body.message, 'Already rejected');
    assert.strictEqual((await waitForMail(n, 0)).length, 0);
  });

  await test('a rejected meeting cannot be confirmed (400)', async () => {
    const { status } = await call('PUT', `/admin/api/meetings/${meetingB._id}/confirm`);
    assert.strictEqual(status, 400);
  });

  console.log('\nRe-use and pending paths');
  await test('a rejected meeting rescheduled to a new slot gets a fresh event and link', async () => {
    const n = sent.length;
    const { status, body } = await call('PUT', `/admin/api/meetings/${meetingA._id}/reschedule`, { meetingDate: slotA.date, meetingTime: slotA.time });
    assert.strictEqual(status, 200, JSON.stringify(body));
    const doc = await Meeting.findById(meetingA._id).lean();
    assert.strictEqual(doc.status, 'confirmed');
    assert.ok(doc.meetLink && events.has(doc.google_event_id));
    assert.ok(events.get(doc.google_event_id).attendees.some((a) => a.email === ASSIGNEE.email), 'existing assignee missing from the new event');
    assert.strictEqual((await waitForMail(n, 2)).length, 2);
  });

  await test('assigning a pending meeting tells the visitor the link follows on confirmation', async () => {
    const slot = istSlot(5);
    const booked = await call('POST', '/api/contact/free-consultation', {
      name: 'Pending Pat', email: 'pat@client.test',
      meeting_date: slot.date, meeting_time: slot.time, meeting_timezone: 'Europe/London', meeting_start_utc: slot.startUtc,
    });
    assert.strictEqual(booked.status, 201, JSON.stringify(booked.body));
    // Europe/London wall-clock 10:00 is not 10:00 IST — the server recomputes
    // the instant from the visitor's own fields, so take what it stored.
    await waitForMail(sent.length, 2);
    const n = sent.length;
    await call('PUT', `/admin/api/meetings/${booked.body.data._id}/assign`, ASSIGNEE);
    const mails = await waitForMail(n, 3);
    assert.strictEqual(mails.length, 3);
    const user = find(mails, 'pat@client.test');
    assert.match(user.html, /awaiting confirmation/);
    assert.ok(!/meet\.google\.com/.test(user.html));
    assert.match(user.html, /\(Europe\/London\)|Europe\/London/);
  });

  await test('confirm emails the assignee too, and puts them on the event', async () => {
    const pending = await Meeting.findOne({ email: 'pat@client.test' }).lean();
    const n = sent.length;
    const { status, body } = await call('PUT', `/admin/api/meetings/${pending._id}/confirm`);
    assert.strictEqual(status, 200, JSON.stringify(body));
    const doc = await Meeting.findById(pending._id).lean();
    assert.ok(events.get(doc.google_event_id).attendees.some((a) => a.email === ASSIGNEE.email));
    const mails = await waitForMail(n, 2);
    assert.ok(find(mails, ['owner@studio.test', ASSIGNEE.email]));
  });

  server.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();

  const failed = results.filter(([ok]) => !ok).length;
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
