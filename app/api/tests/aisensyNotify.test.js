// Tests for the WhatsApp confirmation sent through AiSensy when an admin
// confirms a meeting that the WhatsApp agent created (phase 2 of the agent).
//
// Same style as tests/waAgent.test.js: plain Node + assert, no framework.
//
// Part 1 (no database): the service on its own — the two env keys, the
// source_page guard, the request body, the four template parameters and
// their fallbacks, every failure path, and that the API key never reaches a
// log line.
// Part 2 (local MongoDB): the real admin confirm route, with a WhatsApp
// booking and a website booking, proving the hook fires for exactly one of
// them and that confirmation, emails and response are unchanged either way.
//
// What is faked: global fetch for AiSensy's host only (captured; local HTTP
// still goes through the real fetch), the SMTP transport, the CRM ingest,
// the Google Calendar service, the logger. Nothing leaves the machine.
//
// Needs a disposable LOCAL MongoDB for part 2 — the script refuses any
// non-local URI:
//   node tests/aisensyNotify.test.js
//   AISENSY_TEST_MONGO_URI=mongodb://127.0.0.1:27017/aisensy_notify_test node tests/aisensyNotify.test.js

const assert = require('assert');
const http = require('http');
const path = require('path');

process.env.NODE_ENV = 'test';

// ── logger: capture every line, with its level ──────────────────────────────
const logged = [];
const logPath = require.resolve(path.join(__dirname, '../src/utils/logger'));
require.cache[logPath] = {
  id: logPath, filename: logPath, loaded: true,
  exports: {
    info: (m) => logged.push({ level: 'info', m: String(m) }),
    warn: (m) => logged.push({ level: 'warn', m: String(m) }),
    error: (m) => logged.push({ level: 'error', m: String(m) }),
  },
};
const lines = (level) => logged.filter((l) => !level || l.level === level).map((l) => l.m);
const lastAisensyLine = () => lines().filter((m) => m.startsWith('[aisensy]')).pop();

// ── database (part 2): a disposable LOCAL MongoDB ───────────────────────────
const MONGO_URI = process.env.AISENSY_TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/aisensy_notify_test';
if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(MONGO_URI)) {
  console.error(`Refusing to run against a non-local database: ${MONGO_URI}`);
  process.exit(1);
}

// ── email: fake credentials so the mailer switches on, and a capturing transport
Object.assign(process.env, {
  SMTP_HOST: 'smtp.test.invalid', SMTP_USER: 'bookings@studio.test', SMTP_PASS: 'x',
  MAIL_FROM: 'Cocoma Digital <bookings@studio.test>', MAIL_BRAND: 'Cocoma Digital',
  OWNER_EMAIL: 'owner@studio.test', OWNER_NAME: 'Anil',
  ADMIN_PANEL_URL: 'https://admin.studio.test/admin',
});
const sent = [];
const nodemailer = require('nodemailer');
nodemailer.createTransport = () => ({
  sendMail: async (msg) => { sent.push(msg); return { messageId: `<${sent.length}@test>` }; },
  verify: async () => true,
});

// ── CRM mirror: never run the real one ──────────────────────────────────────
const leadIngestPath = require.resolve(path.join(__dirname, '../src/crm/services/leadIngest'));
require.cache[leadIngestPath] = {
  id: leadIngestPath, filename: leadIngestPath, loaded: true,
  exports: { ingestSafe: () => {}, ingest: async () => null },
};

// ── Google Calendar: stubbed; confirm gets a Meet link from here ────────────
const MEET_LINK = 'https://meet.google.com/test-abcd-efg';
const calendarCalls = [];
const calendarPath = require.resolve(path.join(__dirname, '../src/services/calendarService'));
require.cache[calendarPath] = {
  id: calendarPath, filename: calendarPath, loaded: true,
  exports: {
    isConfigured: () => true,
    createMeetingEvent: async () => { calendarCalls.push('create'); return { meetLink: MEET_LINK, eventId: `evt${calendarCalls.length}`, htmlLink: 'https://calendar.test/evt' }; },
    updateMeetingEvent: async () => { calendarCalls.push('update'); return {}; },
    cancelMeetingEvent: async () => { calendarCalls.push('cancel'); return {}; },
  },
};

// ── AiSensy: global fetch is intercepted for every host except the local test
//    server. Each call is captured (URL, options, parsed body); the reply is
//    whatever `aisensyReply` currently is. ─────────────────────────────────
const realFetch = globalThis.fetch;
const aisensyCalls = [];
const reply = (status, text) => async () => ({ status, text: async () => text });
let aisensyReply = reply(200, '{"success":true}');
globalThis.fetch = (url, opts = {}) => {
  const u = String(url);
  if (u.startsWith('http://127.0.0.1')) return realFetch(url, opts);
  let body = null;
  try { body = JSON.parse(opts.body); } catch { /* not JSON */ }
  aisensyCalls.push({ url: u, method: opts.method, headers: opts.headers || {}, body, signal: opts.signal });
  return aisensyReply(url, opts);
};

const API_KEY = 'aisensy-test-key-9f2c1b7e4d';
const CAMPAIGN = 'meeting_confirmed_v1_api';
const TEST_URL = 'https://aisensy.test.invalid/campaign/t1/api/v2';
const configure = (on) => {
  process.env.AISENSY_API_KEY = on ? API_KEY : '';
  process.env.AISENSY_CONFIRM_CAMPAIGN = on ? CAMPAIGN : '';
  process.env.AISENSY_API_URL = TEST_URL;
  process.env.AISENSY_TIMEOUT_MS = '';
};
configure(false);

const svc = require('../src/services/aisensyNotify');
const { sendMeetingConfirmedWhatsapp: send, confirmPayload, NO_LINK_TEXT } = svc;

// The shape meetingFields() in the admin meeting controller produces.
const START = new Date('2026-11-07T10:00:00Z'); // 15:30 IST, 05:00 New York
const booking = (over = {}) => ({
  name: 'Jessica Browning',
  email: 'jessica@example.com',
  phone: '919876543210',
  notes: '[via WhatsApp · ref RQR749BF]\n\nWants help with a podcast launch',
  meetLink: MEET_LINK,
  meeting_date: '2026-11-07',
  meeting_time: '15:30:00',
  meeting_timezone: 'Asia/Kolkata',
  meeting_start_utc: START,
  source_page: 'whatsapp',
  createdAt: new Date('2026-11-06T08:34:01Z'),
  meetingId: '6aed000000000000000000aa',
  ...over,
});

const results = [];
const test = async (name, fn) => {
  try {
    await fn();
    results.push([true, name]);
    console.log(`  PASS  ${name}`);
  } catch (err) {
    results.push([false, name]);
    console.log(`  FAIL  ${name}\n        ${err.message}`);
  }
};
const resetCalls = () => { aisensyCalls.length = 0; aisensyReply = reply(200, '{"success":true}'); };

(async () => {
  console.log('\naisensy notify — part 1: the service on its own\n');

  await test('not configured (both keys blank) → skipped, not_configured; fetch never called', async () => {
    configure(false);
    const r = await send(booking());
    assert.deepStrictEqual(r, { sent: false, skipped: true, reason: 'not_configured' });
    assert.strictEqual(aisensyCalls.length, 0);
    assert.match(lastAisensyLine(), /^\[aisensy\] confirm status=skipped reason=not_configured ref=RQR749BF meeting=6aed000000000000000000aa$/);
  });

  await test('the "not configured" warning is logged once, however many sends are skipped', async () => {
    await send(booking());
    await send(booking());
    const warns = lines('warn').filter((m) => m.includes('AISENSY_API_KEY/AISENSY_CONFIRM_CAMPAIGN'));
    assert.strictEqual(warns.length, 1);
  });

  await test('only the API key set → still not configured, nothing sent', async () => {
    configure(false);
    process.env.AISENSY_API_KEY = API_KEY;
    const r = await send(booking());
    assert.strictEqual(r.reason, 'not_configured');
    assert.strictEqual(aisensyCalls.length, 0);
  });

  await test('only the campaign name set → still not configured, nothing sent', async () => {
    configure(false);
    process.env.AISENSY_CONFIRM_CAMPAIGN = CAMPAIGN;
    const r = await send(booking());
    assert.strictEqual(r.reason, 'not_configured');
    assert.strictEqual(aisensyCalls.length, 0);
  });

  await test('configured, but a website booking → skipped, not_whatsapp; fetch never called', async () => {
    configure(true); resetCalls();
    for (const source_page of ['website', 'schedule-meeting', '', undefined, null]) {
      const r = await send(booking({ source_page }));
      assert.deepStrictEqual(r, { sent: false, skipped: true, reason: 'not_whatsapp' }, `source_page=${source_page}`);
    }
    assert.strictEqual(aisensyCalls.length, 0);
    assert.match(lastAisensyLine(), /status=skipped reason=not_whatsapp/);
  });

  await test('no booking at all → skipped, not_whatsapp (never throws)', async () => {
    configure(true); resetCalls();
    assert.strictEqual((await send()).reason, 'not_whatsapp');
    assert.strictEqual((await send(null)).reason, 'not_whatsapp');
    assert.strictEqual(aisensyCalls.length, 0);
  });

  await test('configured + WhatsApp booking → one POST to AiSensy with the campaign body; result sent', async () => {
    configure(true); resetCalls();
    const r = await send(booking());
    assert.deepStrictEqual(r, { sent: true, http: 200 });
    assert.strictEqual(aisensyCalls.length, 1);
    const c = aisensyCalls[0];
    assert.strictEqual(c.url, TEST_URL);
    assert.strictEqual(c.method, 'POST');
    assert.strictEqual(c.headers['content-type'], 'application/json');
    assert.deepStrictEqual(c.body, {
      apiKey: API_KEY,
      campaignName: CAMPAIGN,
      destination: '+919876543210',
      userName: 'Jessica Browning',
      templateParams: ['Jessica Browning', 'Nov 07, 2026 · 3:30 PM (Asia/Kolkata)', 'RQR749BF', MEET_LINK],
      source: 'cocoma-api-confirm',
    });
    assert.ok(c.signal && typeof c.signal.aborted === 'boolean', 'an abort signal is attached for the timeout');
  });

  await test('the sent log line names the ref, the meeting and the destination digits — never the key', async () => {
    const line = lastAisensyLine();
    assert.strictEqual(line, '[aisensy] confirm status=sent http=200 ref=RQR749BF meeting=6aed000000000000000000aa to=919876543210');
    assert.ok(!line.includes(API_KEY));
    assert.strictEqual(logged.filter((l) => l.m === line && l.level === 'info').length, 1, 'logged at info level');
  });

  await test('the default endpoint is used when AISENSY_API_URL is blank', async () => {
    configure(true); resetCalls();
    process.env.AISENSY_API_URL = '';
    await send(booking());
    assert.strictEqual(aisensyCalls[0].url, 'https://backend.aisensy.com/campaign/t1/api/v2');
    configure(true);
  });

  await test('{{2}} is the confirmed time in the visitor\'s own zone', async () => {
    configure(true);
    const ny = confirmPayload(booking({ meeting_timezone: 'America/New_York' }));
    assert.strictEqual(ny.templateParams[1], 'Nov 07, 2026 · 5:00 AM (America/New_York)');
    const ist = confirmPayload(booking({ meeting_timezone: '' }));
    assert.strictEqual(ist.templateParams[1], 'Nov 07, 2026 · 3:30 PM (Asia/Kolkata)', 'IST when the booking has no zone');
    const junk = confirmPayload(booking({ meeting_timezone: 'Not/AZone' }));
    assert.strictEqual(junk.templateParams[1], 'Nov 07, 2026 · 3:30 PM (Not/AZone)', 'an unknown zone falls back to the IST rendering');
  });

  await test('every template slot has a fallback, so the array is always exactly four long', async () => {
    configure(true);
    const p = confirmPayload(booking({ name: '', userName: '', notes: 'no prefix here', meetLink: null, meeting_start_utc: 'not a date' }));
    assert.deepStrictEqual(p.templateParams, ['there', 'the agreed time', 'in your email', NO_LINK_TEXT]);
    assert.strictEqual(p.userName, 'there');
    const missing = confirmPayload(booking({ name: undefined, notes: undefined, meetLink: undefined, meeting_start_utc: undefined }));
    assert.strictEqual(missing.templateParams.length, 4);
    assert.deepStrictEqual(missing.templateParams, ['there', 'the agreed time', 'in your email', NO_LINK_TEXT]);
  });

  await test('the ref is read from the [via WhatsApp · ref …] prefix only', async () => {
    assert.strictEqual(svc.refFromNotes('[via WhatsApp · ref RQR749BF]\n\nhello'), 'RQR749BF');
    assert.strictEqual(svc.refFromNotes('[via WhatsApp · ref 8JBMEUVS]'), '8JBMEUVS');
    assert.strictEqual(svc.refFromNotes('Slot: 10:00 IST. ref RQR749BF mentioned in passing'), '');
    assert.strictEqual(svc.refFromNotes(''), '');
    assert.strictEqual(svc.refFromNotes(undefined), '');
  });

  await test('parameters are flattened to one line, control characters dropped, capped at 200 characters', async () => {
    assert.strictEqual(svc.cleanParam('Jessica\nBrowning\t\t  Smith\u0007'), 'Jessica Browning Smith');
    assert.strictEqual(svc.cleanParam('   '), '-');
    assert.strictEqual(svc.cleanParam('   ', 'there'), 'there');
    assert.strictEqual(svc.cleanParam(null, 'x'), 'x');
    const long = svc.cleanParam('a'.repeat(300));
    assert.strictEqual(long.length, 200);
    assert.ok(long.endsWith('…'));
    configure(true);
    const p = confirmPayload(booking({ name: 'Line one\nLine two' }));
    assert.strictEqual(p.templateParams[0], 'Line one Line two');
    assert.strictEqual(p.userName, 'Line one Line two');
  });

  await test('a phone that is not 10–15 plain digits → skipped, bad_phone; fetch never called', async () => {
    configure(true); resetCalls();
    for (const phone of ['', '+919876543210', '98765', '9'.repeat(16), '91 98765 43210', 'abc', undefined, null]) {
      const r = await send(booking({ phone }));
      assert.deepStrictEqual(r, { sent: false, skipped: true, reason: 'bad_phone' }, `phone=${phone}`);
    }
    assert.strictEqual(aisensyCalls.length, 0);
    assert.match(lastAisensyLine(), /status=skipped reason=bad_phone/);
  });

  await test('a 10-digit and a 15-digit number are accepted and get a leading +', async () => {
    configure(true); resetCalls();
    await send(booking({ phone: '8655986194' }));
    await send(booking({ phone: '123456789012345' }));
    assert.deepStrictEqual(aisensyCalls.map((c) => c.body.destination), ['+8655986194', '+123456789012345']);
  });

  await test('AiSensy answers non-200 → failed, rejected, http code; logged at error with the body snippet', async () => {
    configure(true); resetCalls();
    aisensyReply = reply(400, 'Campaign is not live');
    const r = await send(booking());
    assert.deepStrictEqual(r, { sent: false, reason: 'rejected', http: 400 });
    const line = lastAisensyLine();
    assert.strictEqual(line, '[aisensy] confirm status=failed reason=rejected http=400 ref=RQR749BF meeting=6aed000000000000000000aa to=919876543210 body="Campaign is not live"');
    assert.strictEqual(logged.find((l) => l.m === line).level, 'error');
  });

  await test('a response body that echoes the key is logged with the key redacted', async () => {
    configure(true); resetCalls();
    aisensyReply = reply(401, `{"error":"invalid apiKey ${API_KEY} for project"}`);
    const r = await send(booking());
    assert.strictEqual(r.reason, 'rejected');
    const line = lastAisensyLine();
    assert.ok(line.includes('body="{"error":"invalid apiKey [key] for project"}"'), line);
    assert.ok(!line.includes(API_KEY));
  });

  await test('a long response body is cut to 160 characters in the log', async () => {
    configure(true); resetCalls();
    aisensyReply = reply(500, 'x'.repeat(1000));
    await send(booking());
    const m = /body="([^"]*)"/.exec(lastAisensyLine());
    assert.strictEqual(m[1].length, 160);
  });

  await test('network failure → failed, network; the promise resolves', async () => {
    configure(true); resetCalls();
    aisensyReply = async () => { throw new TypeError('fetch failed'); };
    const r = await send(booking());
    assert.deepStrictEqual(r, { sent: false, reason: 'network' });
    assert.match(lastAisensyLine(), /status=failed reason=network ref=RQR749BF .* error="fetch failed"$/);
  });

  await test('fetch throwing synchronously → failed, network; the promise still resolves', async () => {
    configure(true); resetCalls();
    aisensyReply = () => { throw new Error('boom'); };
    const r = await send(booking());
    assert.deepStrictEqual(r, { sent: false, reason: 'network' });
  });

  await test('no reply within AISENSY_TIMEOUT_MS → aborted → failed, timeout', async () => {
    configure(true); resetCalls();
    process.env.AISENSY_TIMEOUT_MS = '40';
    aisensyReply = (url, opts) => new Promise((_, reject) => {
      opts.signal.addEventListener('abort', () => reject(Object.assign(new Error('This operation was aborted'), { name: 'AbortError' })));
    });
    const started = Date.now();
    const r = await send(booking());
    assert.deepStrictEqual(r, { sent: false, reason: 'timeout' });
    assert.ok(Date.now() - started < 1000, 'gave up promptly');
    assert.ok(aisensyCalls[0].signal.aborted);
    assert.match(lastAisensyLine(), /status=failed reason=timeout/);
    configure(true);
  });

  await test('an error message that contains the key is logged redacted', async () => {
    configure(true); resetCalls();
    aisensyReply = async () => { throw new Error(`connect failed for ${API_KEY}`); };
    await send(booking());
    const line = lastAisensyLine();
    assert.ok(line.includes('error="connect failed for [key]"'), line);
  });

  await test('isConfigured reflects the env at call time (rotation needs no restart of the module)', async () => {
    configure(false);
    assert.strictEqual(svc.isConfigured(), false);
    configure(true);
    assert.strictEqual(svc.isConfigured(), true);
  });

  await test('after every outcome above, the API key appears in no log line', async () => {
    assert.ok(logged.length > 20, 'the log was captured');
    assert.ok(!logged.some((l) => l.m.includes(API_KEY)));
  });

  // ── part 2: the real admin confirm route ──────────────────────────────────
  console.log('\naisensy notify — part 2: the admin confirm route\n');

  require('express-async-errors');
  const express = require('express');
  const mongoose = require('mongoose');
  const Meeting = require('../src/models/Meeting');

  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  } catch (err) {
    console.error(`Cannot reach the local test MongoDB at ${MONGO_URI}: ${err.message}\nStart it with ~/.cocoma-dev/mongo/start.sh`);
    process.exit(1);
  }
  await mongoose.connection.dropDatabase();

  const app = express();
  app.use(express.json());
  // The admin already authenticated, the way production's gate sets req.user.
  app.use('/admin/api/meetings', (req, _res, next) => { req.user = { _id: 'admin-test' }; next(); }, require('../src/routes/admin/meeting'));
  app.use(require('../src/middleware/errorHandler'));
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;

  const confirm = async (id) => {
    const res = await realFetch(`${base}/admin/api/meetings/${id}/confirm`, { method: 'PUT', headers: { 'content-type': 'application/json' } });
    return { status: res.status, json: await res.json() };
  };
  // Emails and the WhatsApp send happen after the response — wait for them.
  const settle = async (fn, ms = 1500) => {
    const until = Date.now() + ms;
    while (!fn() && Date.now() < until) await new Promise((r) => setTimeout(r, 15));
    await new Promise((r) => setTimeout(r, 60)); // and make sure no extras follow
  };

  // A pending meeting `days` from now at 10:00 IST (the future, so confirm accepts it).
  let slotSeq = 0;
  const pending = async (over = {}) => {
    const d = new Date(Date.now() + (2 + slotSeq) * 86400000);
    slotSeq += 1;
    const date = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const startUtc = new Date(`${date}T10:00:00+05:30`);
    return Meeting.create({
      userName: 'Jessica Browning',
      email: 'jessica@client.test',
      phone: '919876543210',
      meetingDate: date,
      meetingTime: '10:00:00',
      meetingTimezone: 'Asia/Kolkata',
      meeting_start_utc: startUtc,
      slot_key: startUtc.toISOString().slice(0, 16),
      duration: 15,
      notes: '[via WhatsApp · ref RQR749BF]\n\nWants help with a podcast launch',
      service: 'Discovery Call',
      source_page: 'whatsapp',
      status: 'pending',
      ...over,
    });
  };
  const resetAll = () => { resetCalls(); sent.length = 0; calendarCalls.length = 0; };

  await test('confirming a WhatsApp booking → 200, confirmed, Meet link, both emails, and ONE AiSensy send with that booking\'s ref and link', async () => {
    configure(true); resetAll();
    const m = await pending();
    const r = await confirm(m._id);
    assert.strictEqual(r.status, 200, JSON.stringify(r.json));
    assert.strictEqual(r.json.message, 'Meeting confirmed and emails sent');
    const after = await Meeting.findById(m._id).lean();
    assert.strictEqual(after.status, 'confirmed');
    assert.strictEqual(after.meetLink, MEET_LINK);
    await settle(() => aisensyCalls.length >= 1 && sent.length >= 2);
    assert.strictEqual(calendarCalls.length, 1);
    assert.strictEqual(sent.length, 2, 'owner + visitor confirmation emails, as before');
    assert.strictEqual(aisensyCalls.length, 1);
    const b = aisensyCalls[0].body;
    assert.strictEqual(b.apiKey, API_KEY);
    assert.strictEqual(b.campaignName, CAMPAIGN);
    assert.strictEqual(b.destination, '+919876543210');
    assert.strictEqual(b.userName, 'Jessica Browning');
    assert.strictEqual(b.templateParams.length, 4);
    assert.strictEqual(b.templateParams[0], 'Jessica Browning');
    assert.strictEqual(b.templateParams[1], `${new Date(after.meeting_start_utc).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })} · 10:00 AM (Asia/Kolkata)`);
    assert.strictEqual(b.templateParams[2], 'RQR749BF');
    assert.strictEqual(b.templateParams[3], MEET_LINK);
    assert.match(lastAisensyLine(), new RegExp(`status=sent http=200 ref=RQR749BF meeting=${m._id} to=919876543210$`));
  });

  await test('confirming a WEBSITE booking → 200, confirmed, both emails, and NO AiSensy call', async () => {
    configure(true); resetAll();
    const m = await pending({ source_page: 'schedule-meeting', notes: 'Slot: 10:00 IST', phone: '919876543210' });
    const r = await confirm(m._id);
    assert.strictEqual(r.status, 200);
    await settle(() => sent.length >= 2);
    assert.strictEqual((await Meeting.findById(m._id).lean()).status, 'confirmed');
    assert.strictEqual(sent.length, 2);
    assert.strictEqual(aisensyCalls.length, 0);
    assert.ok(!lines().some((l) => l.includes(`meeting=${m._id}`)), 'no [aisensy] line at all for a website booking');
  });

  await test('a booking with no source_page (older records) → confirmed, no AiSensy call', async () => {
    configure(true); resetAll();
    const m = await pending({ source_page: undefined, notes: '' });
    assert.strictEqual((await confirm(m._id)).status, 200);
    await settle(() => sent.length >= 2);
    assert.strictEqual(aisensyCalls.length, 0);
  });

  await test('WhatsApp booking with the keys blank → confirmed exactly as before, nothing sent, one skipped line', async () => {
    configure(false); resetAll();
    const m = await pending();
    const r = await confirm(m._id);
    assert.strictEqual(r.status, 200);
    await settle(() => sent.length >= 2);
    assert.strictEqual((await Meeting.findById(m._id).lean()).status, 'confirmed');
    assert.strictEqual(sent.length, 2);
    assert.strictEqual(aisensyCalls.length, 0);
    assert.match(lastAisensyLine(), new RegExp(`status=skipped reason=not_configured ref=RQR749BF meeting=${m._id}$`));
  });

  await test('AiSensy rejecting the send does not touch the confirmation, the response or the emails', async () => {
    configure(true); resetAll();
    aisensyReply = reply(500, 'upstream error');
    const m = await pending();
    const r = await confirm(m._id);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.json.data.status, 'confirmed');
    await settle(() => aisensyCalls.length >= 1 && sent.length >= 2);
    assert.strictEqual((await Meeting.findById(m._id).lean()).status, 'confirmed');
    assert.strictEqual(sent.length, 2);
    assert.match(lastAisensyLine(), /status=failed reason=rejected http=500/);
    assert.ok(!lines('error').some((l) => l.startsWith('confirm WhatsApp error')), 'the service resolved; the handler\'s catch was not needed');
  });

  await test('AiSensy unreachable does not touch the confirmation either', async () => {
    configure(true); resetAll();
    aisensyReply = async () => { throw new TypeError('fetch failed'); };
    const m = await pending();
    assert.strictEqual((await confirm(m._id)).status, 200);
    await settle(() => aisensyCalls.length >= 1 && sent.length >= 2);
    assert.strictEqual((await Meeting.findById(m._id).lean()).status, 'confirmed');
    assert.strictEqual(sent.length, 2);
    assert.match(lastAisensyLine(), /status=failed reason=network/);
  });

  await test('a WhatsApp booking whose stored phone is unusable → confirmed, skipped bad_phone, no call', async () => {
    configure(true); resetAll();
    const m = await pending({ phone: '+91 98765 43210' });
    assert.strictEqual((await confirm(m._id)).status, 200);
    await settle(() => sent.length >= 2);
    assert.strictEqual(aisensyCalls.length, 0);
    assert.match(lastAisensyLine(), /status=skipped reason=bad_phone/);
  });

  await test('confirming an already-confirmed WhatsApp booking again → "Already confirmed", no second send, no emails', async () => {
    configure(true); resetAll();
    const m = await pending();
    assert.strictEqual((await confirm(m._id)).status, 200);
    await settle(() => aisensyCalls.length >= 1 && sent.length >= 2);
    resetAll();
    const r = await confirm(m._id);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.json.message, 'Already confirmed');
    await settle(() => false, 200);
    assert.strictEqual(aisensyCalls.length, 0);
    assert.strictEqual(sent.length, 0);
  });

  await test('a rejected WhatsApp booking cannot be confirmed (400), so nothing is sent', async () => {
    configure(true); resetAll();
    const m = await pending({ status: 'rejected' });
    const r = await confirm(m._id);
    assert.strictEqual(r.status, 400);
    await settle(() => false, 150);
    assert.strictEqual(aisensyCalls.length, 0);
  });

  await test('the confirm response carries no AiSensy detail and the key is in no log line', async () => {
    assert.ok(!logged.some((l) => l.m.includes(API_KEY)));
    configure(true); resetAll();
    const m = await pending();
    const r = await confirm(m._id);
    const text = JSON.stringify(r.json);
    assert.ok(!text.includes(API_KEY) && !text.toLowerCase().includes('aisensy'));
    await settle(() => aisensyCalls.length >= 1);
  });

  server.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  globalThis.fetch = realFetch;

  const failed = results.filter(([ok]) => !ok).length;
  console.log(`\n${results.length - failed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
