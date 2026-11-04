// Tests for the WhatsApp agent gateway (/api/wa-agent).
//
// Same style as tests/meetingFlow.test.js: plain Node + assert, the real
// router mounted on a throwaway Express app, no test framework.
//
// What is real: the gateway router, middleware and validation, the shared
// intake service, the website's contact router, the ContactUs model against a
// real local MongoDB, bookingMailer's templates. What is faked: the SMTP
// transport (captured), the CRM ingest (captured), the logger (captured).
//
// Needs a disposable LOCAL MongoDB — the script refuses any non-local URI:
//   node tests/waAgent.test.js
//   WA_AGENT_TEST_MONGO_URI=mongodb://127.0.0.1:27017/wa_agent_test node tests/waAgent.test.js

const assert = require('assert');
const http = require('http');

// ── environment: the keys the router must accept ───────────────────────────
process.env.WA_AGENT_KEYS = ' testkey1, testkey2 ,,';
process.env.NODE_ENV = 'test';

// Logger writes to logs/*.log files and the console; keep the test output clean.
const path = require('path');
const logPath = require.resolve(path.join(__dirname, '../src/utils/logger'));
const logged = [];
require.cache[logPath] = {
  id: logPath, filename: logPath, loaded: true,
  exports: { info: (m) => logged.push(m), warn: (m) => logged.push(m), error: (m) => logged.push(m) },
};

// ── database: a disposable LOCAL MongoDB (same rule as meetingFlow.test.js) ─
const MONGO_URI = process.env.WA_AGENT_TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/wa_agent_test';
if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(MONGO_URI)) {
  console.error(`Refusing to run against a non-local database: ${MONGO_URI}`);
  process.exit(1);
}

// ── email: fake credentials so the mailer switches on, and a capturing transport
Object.assign(process.env, {
  SMTP_HOST: 'smtp.test.invalid', SMTP_USER: 'bookings@studio.test', SMTP_PASS: 'x',
  MAIL_FROM: 'Cocoma Digital <bookings@studio.test>', MAIL_BRAND: 'Cocoma Digital',
  OWNER_EMAIL: 'owner@studio.test', OWNER_NAME: 'Anil',
});
const sent = [];
const nodemailer = require('nodemailer');
nodemailer.createTransport = () => ({
  sendMail: async (msg) => { sent.push(msg); return { messageId: `<${sent.length}@test>` }; },
  verify: async () => true,
});

// ── CRM mirror: capture every ingest call instead of running the real one ──
// (the real one would create CRM leads, notifications and automation jobs)
const crmCalls = [];
const leadIngestPath = require.resolve(path.join(__dirname, '../src/crm/services/leadIngest'));
require.cache[leadIngestPath] = {
  id: leadIngestPath, filename: leadIngestPath, loaded: true,
  exports: { ingestSafe: (input) => { crmCalls.push(input); }, ingest: async (input) => { crmCalls.push(input); return null; } },
};

// ── Google Calendar: must never be touched by a booking. Stubbed to count. ──
const calendarCalls = [];
const calendarPath = require.resolve(path.join(__dirname, '../src/services/calendarService'));
require.cache[calendarPath] = {
  id: calendarPath, filename: calendarPath, loaded: true,
  exports: {
    isConfigured: () => true,
    createMeetingEvent: async () => { calendarCalls.push('create'); return {}; },
    updateMeetingEvent: async () => { calendarCalls.push('update'); return {}; },
    cancelMeetingEvent: async () => { calendarCalls.push('cancel'); return {}; },
  },
};

require('express-async-errors');
const express = require('express');
const mongoose = require('mongoose');
const ContactUs = require('../src/models/ContactUs');
const Meeting = require('../src/models/Meeting');
const MeetingAvailability = require('../src/models/MeetingAvailability');
const WaAgentQuota = require('../src/models/WaAgentQuota');
const { invalidateAvailabilityCache, weekdayOf, addDays, CLOSED_DAY_MESSAGE, OUT_OF_HOURS_MESSAGE } = require('../src/utils/bookingWindow');
const { zonedTimeToUtc } = require('../src/utils/timezone');

const app = express();
app.use(express.json());
app.use('/api/wa-agent', require('../src/routes/api/waAgent'));
// The website's own contact router, mounted too: step 4 moved its enquiry
// sequence into a shared service, and these tests prove it still behaves
// exactly as before.
app.use('/api/contact', require('../src/routes/api/contact'));
// The real app's shared error handler sits after every router. It must never
// see a gateway error; mounting it here proves that.
app.use(require('../src/middleware/errorHandler'));

// Emails and CRM calls happen after the response — wait for them to land.
const waitFor = async (fn, ms = 1500) => {
  const until = Date.now() + ms;
  while (!fn() && Date.now() < until) await new Promise((r) => setTimeout(r, 15));
  await new Promise((r) => setTimeout(r, 40)); // and make sure no extras follow
};

let baseUrl;
const call = async (method, url, { key, body, rawHeaders } = {}) => {
  const headers = { 'content-type': 'application/json', ...(rawHeaders || {}) };
  if (key !== undefined) headers['x-agent-key'] = key;
  const res = await fetch(`${baseUrl}${url}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, json, text, contentType: res.headers.get('content-type') || '' };
};

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

const UNAUTH = { ok: false, reason: 'unauthorized', message: 'Invalid or missing agent key.' };

(async () => {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  } catch (err) {
    console.error(`Cannot reach the local test MongoDB at ${MONGO_URI}: ${err.message}\nStart it with ~/.cocoma-dev/mongo/start.sh`);
    process.exit(1);
  }
  await mongoose.connection.dropDatabase();

  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  console.log('\nwa-agent gateway — step 1: key check + health\n');

  await test('GET /health without a key → 401, bare unauthorized shape', async () => {
    const r = await call('GET', '/api/wa-agent/health');
    assert.strictEqual(r.status, 401);
    assert.deepStrictEqual(r.json, UNAUTH);
  });

  await test('GET /health with a wrong key → 401, identical body (no hint)', async () => {
    const r = await call('GET', '/api/wa-agent/health', { key: 'wrongkey' });
    assert.strictEqual(r.status, 401);
    assert.deepStrictEqual(r.json, UNAUTH);
  });

  await test('a key of the right length but wrong value → 401', async () => {
    const r = await call('GET', '/api/wa-agent/health', { key: 'testkeyX' });
    assert.strictEqual(r.status, 401);
  });

  await test('a prefix of a valid key → 401', async () => {
    const r = await call('GET', '/api/wa-agent/health', { key: 'testkey' });
    assert.strictEqual(r.status, 401);
  });

  await test('an empty header value → 401', async () => {
    const r = await call('GET', '/api/wa-agent/health', { key: '' });
    assert.strictEqual(r.status, 401);
  });

  await test('GET /health with the first key → 200 { ok: true }', async () => {
    const r = await call('GET', '/api/wa-agent/health', { key: 'testkey1' });
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(r.json, { ok: true });
  });

  await test('GET /health with the second (rotation) key → 200', async () => {
    const r = await call('GET', '/api/wa-agent/health', { key: 'testkey2' });
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(r.json, { ok: true });
  });

  await test('header name is case-insensitive (X-Agent-Key)', async () => {
    const r = await call('GET', '/api/wa-agent/health', { rawHeaders: { 'X-Agent-Key': 'testkey1' } });
    assert.strictEqual(r.status, 200);
  });

  await test('surrounding whitespace in WA_AGENT_KEYS and the header is ignored', async () => {
    const r = await call('GET', '/api/wa-agent/health', { key: ' testkey2 ' });
    assert.strictEqual(r.status, 200);
  });

  await test('unknown path with a valid key → 404 in the gateway JSON shape, not HTML', async () => {
    const r = await call('GET', '/api/wa-agent/does-not-exist', { key: 'testkey1' });
    assert.strictEqual(r.status, 404);
    assert.deepStrictEqual(r.json, { ok: false, reason: 'not_found', message: 'No such endpoint.' });
    assert.ok(!/<html/i.test(r.text));
  });

  await test('unknown path WITHOUT a key → 401 (the key check comes first, nothing is probeable)', async () => {
    const r = await call('POST', '/api/wa-agent/book', { body: { name: 'x' } });
    assert.strictEqual(r.status, 401);
  });

  await test('401 log line carries only the IP and the first 4 characters of the attempt', async () => {
    logged.length = 0;
    await call('GET', '/api/wa-agent/health', { key: 'supersecretguess' });
    const line = logged.find((m) => String(m).includes('[wa-agent] 401'));
    assert.ok(line, 'expected a [wa-agent] 401 log line');
    assert.ok(line.includes('key_prefix=supe'), line);
    assert.ok(!line.includes('supersecretguess'), 'full key must never be logged');
  });

  await test('with WA_AGENT_KEYS unset every request is refused with 401', async () => {
    const saved = process.env.WA_AGENT_KEYS;
    process.env.WA_AGENT_KEYS = '';
    try {
      const r = await call('GET', '/api/wa-agent/health', { key: 'testkey1' });
      assert.strictEqual(r.status, 401);
    } finally {
      process.env.WA_AGENT_KEYS = saved;
    }
  });

  await test('a valid key is never written to the log', async () => {
    logged.length = 0;
    await call('GET', '/api/wa-agent/health', { key: 'testkey1' });
    assert.ok(!logged.some((m) => String(m).includes('testkey1')));
  });

  // ── step 2: one [wa-agent] request line per call ─────────────────────────
  const requestLine = () => logged.map(String).find((m) => /^\[wa-agent\] (GET|POST) /.test(m));
  // Give the 'finish' hook a tick to run after the response body arrives.
  const settle = () => new Promise((r) => setTimeout(r, 20));

  await test('every request logs exactly one [wa-agent] line with endpoint, status and reason', async () => {
    logged.length = 0;
    await call('GET', '/api/wa-agent/health', { key: 'testkey1' });
    await settle();
    const lines = logged.map(String).filter((m) => /^\[wa-agent\] GET /.test(m));
    assert.strictEqual(lines.length, 1, JSON.stringify(logged));
    assert.strictEqual(lines[0], '[wa-agent] GET /health status=200 reason=ok wa_from=- conv=-');
  });

  await test('a 401 is logged with reason=unauthorized and no key', async () => {
    logged.length = 0;
    await call('GET', '/api/wa-agent/health', { key: 'supersecretguess' });
    await settle();
    const line = requestLine();
    assert.ok(line, 'expected a request line');
    assert.ok(line.includes('status=401 reason=unauthorized'), line);
    assert.ok(!logged.some((m) => String(m).includes('supersecretguess')));
  });

  await test('wa_from and X-Conversation-Id appear in the line; nothing else from the body does', async () => {
    logged.length = 0;
    await call('POST', '/api/wa-agent/book', {
      key: 'testkey1',
      body: { wa_from: '919000000099', name: 'Secret Person', email: 'secret@example.com', message: 'confidential' },
      rawHeaders: { 'X-Conversation-Id': 'conv_ABC-123' },
    });
    await settle();
    const line = requestLine();
    assert.ok(line, 'expected a request line');
    assert.strictEqual(line, '[wa-agent] POST /book status=422 reason=invalid_input wa_from=919000000099 conv=conv_ABC-123');
    const all = logged.join('\n');
    for (const leak of ['Secret Person', 'secret@example.com', 'confidential', 'testkey1']) {
      assert.ok(!all.includes(leak), `log must not contain "${leak}"`);
    }
  });

  await test('a wa_from that is not 10–15 digits is logged as "-", never verbatim', async () => {
    logged.length = 0;
    await call('POST', '/api/wa-agent/enquiry', {
      key: 'testkey1',
      body: { wa_from: '<script>alert(1)</script>', name: 'x' },
    });
    await settle();
    const line = requestLine();
    assert.ok(line.includes('wa_from=-'), line);
    assert.ok(!logged.join('\n').includes('<script>'));
  });

  await test('a conversation id is sanitised and capped at 64 characters', async () => {
    logged.length = 0;
    await call('GET', '/api/wa-agent/health', {
      key: 'testkey1',
      // (a newline cannot be sent at all — fetch rejects it client-side)
      rawHeaders: { 'X-Conversation-Id': 'a b<c>' + 'x'.repeat(200) },
    });
    await settle();
    const line = requestLine();
    const conv = /conv=(\S+)/.exec(line)[1];
    assert.ok(conv.startsWith('abcx'), conv);
    assert.strictEqual(conv.length, 64);
    assert.ok(!line.includes('<'));
  });

  await test('the request line is still written when the key is missing entirely', async () => {
    logged.length = 0;
    await call('GET', '/api/wa-agent/health');
    await settle();
    assert.ok(requestLine().includes('status=401 reason=unauthorized wa_from=- conv=-'));
  });

  // ── step 3: validation layer ──────────────────────────────────────────────
  console.log('\nstep 3: validation\n');

  const { validate, stripHtml } = require('../src/validation/waAgent');
  const { wallClockInZone } = require('../src/utils/timezone');
  const todayIst = wallClockInZone(new Date(), 'Asia/Kolkata').date;
  const nextYear = `${Number(todayIst.slice(0, 4)) + 1}-06-15`; // always "later", always real

  const BOOK = {
    wa_from: '919000000099', name: 'Test Sender', email: 'Test.Sender@Example.com',
    meeting_date: nextYear, meeting_time: '11:00:00', meeting_timezone: 'Asia/Kolkata', message: 'hello',
  };
  const ENQUIRY = { wa_from: '919000000099', name: 'Test Sender', email: 'test.sender@example.com', service: 'Podcast Editing', message: 'Need a quote' };

  const expect422 = async (name, path, body, field) => test(`${name} → 422 field=${field}`, async () => {
    const r = await call('POST', path, { key: 'testkey1', body });
    assert.strictEqual(r.status, 422, JSON.stringify(r.json));
    assert.strictEqual(r.json.ok, false);
    assert.strictEqual(r.json.reason, 'invalid_input');
    assert.strictEqual(r.json.field, field, JSON.stringify(r.json));
    assert.deepStrictEqual(Object.keys(r.json).sort(), ['field', 'message', 'ok', 'reason']);
    // The message never echoes the submitted value.
    const submitted = body[field];
    if (typeof submitted === 'string' && submitted.length > 3) assert.ok(!r.json.message.includes(submitted), r.json.message);
  });

  await test('a valid /book body passes validation and reaches the handler (201 or a slot verdict, never 422)', async () => {
    const r = await call('POST', '/api/wa-agent/book', { key: 'testkey1', body: BOOK });
    assert.ok([201, 400, 409].includes(r.status), JSON.stringify(r.json));
    assert.notStrictEqual(r.json.reason, 'invalid_input');
    await waitFor(() => r.status !== 201 || (sent.length >= 2 && crmCalls.length >= 1));
    sent.length = 0; crmCalls.length = 0;
    await Meeting.deleteMany({});
  });

  await test('a valid /enquiry body passes validation and reaches the handler (201)', async () => {
    const r = await call('POST', '/api/wa-agent/enquiry', { key: 'testkey1', body: ENQUIRY });
    assert.strictEqual(r.status, 201, JSON.stringify(r.json));
    await waitFor(() => sent.length >= 1 && crmCalls.length >= 1);
    sent.length = 0; crmCalls.length = 0;
    await ContactUs.deleteMany({});
  });

  // one per rule in the validation table
  await expect422('wa_from with "+"', '/api/wa-agent/book', { ...BOOK, wa_from: '+919000000099' }, 'wa_from');
  await expect422('wa_from 9 digits', '/api/wa-agent/book', { ...BOOK, wa_from: '919000000' }, 'wa_from');
  await expect422('wa_from 16 digits', '/api/wa-agent/book', { ...BOOK, wa_from: '9190000000991234' }, 'wa_from');
  await expect422('name 1 char', '/api/wa-agent/book', { ...BOOK, name: 'A' }, 'name');
  await expect422('name 81 chars', '/api/wa-agent/book', { ...BOOK, name: 'n'.repeat(81) }, 'name');
  await expect422('email invalid', '/api/wa-agent/book', { ...BOOK, email: 'not-an-email' }, 'email');
  await expect422('email 121 chars', '/api/wa-agent/book', { ...BOOK, email: `${'a'.repeat(110)}@example.com` }, 'email');
  await expect422('meeting_date wrong format', '/api/wa-agent/book', { ...BOOK, meeting_date: '15/06/2027' }, 'meeting_date');
  await expect422('meeting_date not a real date', '/api/wa-agent/book', { ...BOOK, meeting_date: '2027-02-30' }, 'meeting_date');
  await expect422('meeting_date in the past', '/api/wa-agent/book', { ...BOOK, meeting_date: '2020-01-01' }, 'meeting_date');
  await expect422('meeting_time without seconds', '/api/wa-agent/book', { ...BOOK, meeting_time: '11:00' }, 'meeting_time');
  await expect422('meeting_time 12-hour', '/api/wa-agent/book', { ...BOOK, meeting_time: '11:00:00 AM' }, 'meeting_time');
  await expect422('meeting_time out of range', '/api/wa-agent/book', { ...BOOK, meeting_time: '25:00:00' }, 'meeting_time');
  await expect422('meeting_timezone not IANA', '/api/wa-agent/book', { ...BOOK, meeting_timezone: 'Mars/Olympus' }, 'meeting_timezone');
  await expect422('meeting_timezone offset form', '/api/wa-agent/book', { ...BOOK, meeting_timezone: '+05:30' }, 'meeting_timezone');
  await expect422('service 1 char', '/api/wa-agent/enquiry', { ...ENQUIRY, service: 'X' }, 'service');
  await expect422('service 81 chars', '/api/wa-agent/enquiry', { ...ENQUIRY, service: 's'.repeat(81) }, 'service');
  await expect422('message 1,001 chars', '/api/wa-agent/book', { ...BOOK, message: 'm'.repeat(1001) }, 'message');
  await expect422('message 2,000 chars', '/api/wa-agent/enquiry', { ...ENQUIRY, message: 'm'.repeat(2000) }, 'message');

  // hostile shapes
  await expect422('$gt object in name', '/api/wa-agent/book', { ...BOOK, name: { $gt: '' } }, 'name');
  await expect422('$-prefixed string in name', '/api/wa-agent/book', { ...BOOK, name: '$where sleep(1)' }, 'name');
  await expect422('$-prefixed string in message', '/api/wa-agent/enquiry', { ...ENQUIRY, message: '$ne' }, 'message');
  await expect422('array in a string field', '/api/wa-agent/book', { ...BOOK, name: ['a', 'b'] }, 'name');
  await expect422('number in a string field', '/api/wa-agent/book', { ...BOOK, wa_from: 919000000099 }, 'wa_from');
  await expect422('object in email', '/api/wa-agent/book', { ...BOOK, email: { $regex: '.*' } }, 'email');
  await expect422('unknown field (status)', '/api/wa-agent/book', { ...BOOK, status: 'confirmed' }, 'status');
  await expect422('unknown field with a hostile name is reported as "unknown"', '/api/wa-agent/book', { ...BOOK, '<script>': 1 }, 'unknown');
  await expect422('<script>alert(1)</script> as name (injection test 5)', '/api/wa-agent/book', { ...BOOK, name: '<script>alert(1)</script>' }, 'name');
  await expect422('benign tag <b> in name is still rejected, not laundered', '/api/wa-agent/book', { ...BOOK, name: '<b>John</b>' }, 'name');
  await expect422('tag in message', '/api/wa-agent/enquiry', { ...ENQUIRY, message: 'hi <img src=x onerror=alert(1)>' }, 'message');
  await expect422('tag in an optional field is rejected too', '/api/wa-agent/book', { ...BOOK, message: '<br>' }, 'message');
  await expect422('missing required field', '/api/wa-agent/book', { ...BOOK, email: undefined }, 'email');
  await expect422('null required field', '/api/wa-agent/enquiry', { ...ENQUIRY, service: null }, 'service');
  await expect422('enquiry without email (required in phase 1)', '/api/wa-agent/enquiry', { ...ENQUIRY, email: '' }, 'email');
  await expect422('enquiry without message', '/api/wa-agent/enquiry', { ...ENQUIRY, message: '' }, 'message');

  await test('body that is an array → 422 field=body', async () => {
    const r = await fetch(`${baseUrl}/api/wa-agent/book`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-key': 'testkey1' }, body: '[1,2]' });
    assert.strictEqual(r.status, 422);
    assert.strictEqual((await r.json()).field, 'body');
  });

  await test('first failing field is reported in schema order, not the first bad one in the body', async () => {
    const r = await call('POST', '/api/wa-agent/book', { key: 'testkey1', body: { ...BOOK, message: 'm'.repeat(1001), wa_from: 'abc' } });
    assert.strictEqual(r.json.field, 'wa_from');
  });

  await test('cleaning: email lowercased, whitespace trimmed, control chars removed', async () => {
    const r = validate('book', { ...BOOK, name: '  John\u0000 Doe ', email: ' Test.Sender@Example.COM ' });
    assert.ok(r.ok, JSON.stringify(r));
    assert.strictEqual(r.value.name, 'John  Doe');
    assert.strictEqual(r.value.email, 'test.sender@example.com');
  });

  await test('cleaning: message keeps newlines, drops other control characters', async () => {
    const r = validate('enquiry', { ...ENQUIRY, message: 'line one\nline two\u0007' });
    assert.ok(r.ok);
    assert.strictEqual(r.value.message, 'line one\nline two');
  });

  await test('cleaning: a stray "<" that is not a tag (price < 500) is allowed and removed', async () => {
    const r = validate('enquiry', { ...ENQUIRY, message: 'budget < 500 and > 100' });
    assert.ok(r.ok, JSON.stringify(r));
    assert.strictEqual(r.value.message, 'budget  500 and  100');
  });

  await test('cleaning: an optional message that cleans to empty is omitted, not stored as ""', async () => {
    const r = validate('book', { ...BOOK, message: '   ' });
    assert.ok(r.ok);
    assert.ok(!('message' in r.value));
  });

  await test('stripHtml never leaves a "<" behind, even unterminated', async () => {
    assert.strictEqual(stripHtml('a <b unterminated'), 'a ');
    assert.strictEqual(stripHtml('<<script>>x'), 'x');
  });

  await test('meeting_date "today" in the sender zone is accepted', async () => {
    const r = validate('book', { ...BOOK, meeting_date: todayIst });
    assert.ok(r.ok, JSON.stringify(r));
  });

  await test('a 4 KB string field is capped before the rules run and still rejected on length', async () => {
    const r = await call('POST', '/api/wa-agent/book', { key: 'testkey1', body: { ...BOOK, name: 'x'.repeat(4000) } });
    assert.strictEqual(r.status, 422);
    assert.strictEqual(r.json.field, 'name');
  });

  await test('oversized body (> 16 KB) → 413 before the key check', async () => {
    const r = await call('POST', '/api/wa-agent/book', { body: { ...BOOK, message: 'm'.repeat(20000) } });
    assert.strictEqual(r.status, 413, JSON.stringify(r.json));
    assert.deepStrictEqual(r.json, { ok: false, reason: 'payload_too_large', message: 'The request body must be under 16 KB.' });
  });

  await test('a body just under 16 KB passes the size gate (then fails validation on length)', async () => {
    const r = await call('POST', '/api/wa-agent/book', { key: 'testkey1', body: { ...BOOK, message: 'm'.repeat(15000) } });
    assert.strictEqual(r.status, 422);
    assert.strictEqual(r.json.field, 'message');
  });

  await test('GET /health has no body and is untouched by the size gate', async () => {
    const r = await call('GET', '/api/wa-agent/health', { key: 'testkey1' });
    assert.strictEqual(r.status, 200);
  });

  // ── step 4: /enquiry, and the website contact form it shares code with ──
  console.log('\nstep 4: enquiry\n');

  // Every reset also clears the quota/idempotency records: a sender re-used
  // across tests would otherwise hit a replay or a 429 by design.
  const reset = async () => { sent.length = 0; crmCalls.length = 0; await ContactUs.deleteMany({}); await WaAgentQuota.deleteMany({}); };
  const toList = (m) => [].concat(m.to).map((x) => String(x).toLowerCase());

  await test('REGRESSION website POST /api/contact: response, record, owner email and CRM call unchanged', async () => {
    await reset();
    const body = { name: 'Web Visitor', email: 'Web.Visitor@Example.com', phone: '+91 98765 43210', subject: 'General', message: '[Type: General]\n\nHello from the website' };
    const r = await call('POST', '/api/contact', { body });
    assert.strictEqual(r.status, 201, JSON.stringify(r.json));
    assert.strictEqual(r.json.status, 'success');
    assert.strictEqual(r.json.message, 'Message sent successfully');
    assert.ok(r.json.data && r.json.data._id, 'website response still carries data (the document)');

    const docs = await ContactUs.find({}).lean();
    assert.strictEqual(docs.length, 1);
    const d = docs[0];
    assert.strictEqual(d.name, 'Web Visitor');
    assert.strictEqual(d.email, 'web.visitor@example.com');
    assert.strictEqual(d.phone, '+91 98765 43210');
    assert.strictEqual(d.subject, 'General');
    assert.strictEqual(d.message, body.message);
    assert.strictEqual(d.isRead, 0);
    assert.ok(!('source_page' in d), 'website records must not gain a source_page');

    await waitFor(() => sent.length >= 1 && crmCalls.length >= 1);
    assert.strictEqual(sent.length, 1, 'exactly one email (owner), none to the visitor');
    assert.deepStrictEqual(toList(sent[0]), ['owner@studio.test']);
    assert.strictEqual(sent[0].replyTo, 'Web.Visitor@Example.com');
    assert.strictEqual(sent[0].subject, 'New enquiry: Web Visitor — General');

    assert.strictEqual(crmCalls.length, 1);
    const c = crmCalls[0];
    assert.strictEqual(c.channel, 'contact_form');
    assert.strictEqual(c.externalCollection, 'contact_us');
    assert.strictEqual(String(c.externalId), String(d._id));
    assert.deepStrictEqual(c.raw, { subject: 'General' });
    assert.ok(!('sourcePage' in c), 'website CRM call must not gain sourcePage');
    assert.strictEqual(c.serviceInterest, 'General');
    assert.strictEqual(c.phone, '+91 98765 43210');
  });

  await test('REGRESSION website POST /api/contact without a message → 400, unchanged wording', async () => {
    const r = await call('POST', '/api/contact', { body: { name: 'x', email: 'x@example.com' } });
    assert.strictEqual(r.status, 400);
    assert.deepStrictEqual(r.json, { status: 'error', message: 'Name, email, and message are required' });
  });

  let enquiryRef;
  await test('POST /enquiry → 201 { ok, ref } and nothing else', async () => {
    await reset();
    const r = await call('POST', '/api/wa-agent/enquiry', { key: 'testkey1', body: ENQUIRY });
    assert.strictEqual(r.status, 201, JSON.stringify(r.json));
    assert.deepStrictEqual(Object.keys(r.json).sort(), ['ok', 'ref']);
    assert.strictEqual(r.json.ok, true);
    assert.match(r.json.ref, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
    assert.ok(!r.text.includes('_id') && !r.text.includes('$oid'), 'no database id in the response');
    enquiryRef = r.json.ref;
  });

  await test('the record is in contact_us with phone = wa_from, subject = service, source_page = whatsapp', async () => {
    const docs = await ContactUs.find({}).lean();
    assert.strictEqual(docs.length, 1);
    const d = docs[0];
    assert.strictEqual(d.name, 'Test Sender');
    assert.strictEqual(d.email, 'test.sender@example.com');
    assert.strictEqual(d.phone, '919000000099');
    assert.strictEqual(d.subject, 'Podcast Editing');
    assert.strictEqual(d.source_page, 'whatsapp');
    assert.strictEqual(d.message, `[via WhatsApp · ref ${enquiryRef}]\n\nNeed a quote`);
    assert.strictEqual(d.isRead, 0);
  });

  await test('the record has the same shape as a website enquiry apart from source_page', async () => {
    const wa = (await ContactUs.find({}).lean())[0];
    await call('POST', '/api/contact', { body: { name: 'Web Visitor', email: 'w@example.com', phone: '1', subject: 'General', message: 'hi' } });
    const web = (await ContactUs.find({ email: 'w@example.com' }).lean())[0];
    const keys = (o) => Object.keys(o).sort();
    assert.deepStrictEqual(keys(wa).filter((k) => k !== 'source_page'), keys(web));
    await waitFor(() => sent.length >= 2 && crmCalls.length >= 2);
    sent.splice(1); crmCalls.splice(1); await ContactUs.deleteOne({ email: 'w@example.com' });
  });

  await test('exactly one owner email, none to the sender; it names the service and carries the ref', async () => {
    await waitFor(() => sent.length >= 1);
    assert.strictEqual(sent.length, 1);
    assert.deepStrictEqual(toList(sent[0]), ['owner@studio.test']);
    assert.ok(!toList(sent[0]).includes('test.sender@example.com'));
    assert.strictEqual(sent[0].replyTo, 'test.sender@example.com');
    assert.strictEqual(sent[0].subject, 'New enquiry: Test Sender — Podcast Editing');
    assert.ok(sent[0].text.includes('919000000099'));
    assert.ok(sent[0].text.includes(`ref ${enquiryRef}`));
    assert.ok(sent[0].html.includes('via WhatsApp'));
  });

  await test('the CRM mirror is called once with channel whatsapp_inbound, sourcePage whatsapp and the ref', async () => {
    await waitFor(() => crmCalls.length >= 1);
    assert.strictEqual(crmCalls.length, 1);
    const c = crmCalls[0];
    const d = (await ContactUs.findOne({}).lean());
    assert.strictEqual(c.channel, 'whatsapp_inbound');
    assert.strictEqual(c.externalCollection, 'contact_us');
    assert.strictEqual(String(c.externalId), String(d._id));
    assert.strictEqual(c.sourcePage, 'whatsapp');
    assert.strictEqual(c.phone, '919000000099');
    assert.strictEqual(c.email, 'test.sender@example.com');
    assert.strictEqual(c.serviceInterest, 'Podcast Editing');
    assert.deepStrictEqual(c.raw, { subject: 'Podcast Editing', via: 'whatsapp', wa_ref: enquiryRef });
  });

  await test('two enquiries get two different refs and two records', async () => {
    await reset();
    const a = await call('POST', '/api/wa-agent/enquiry', { key: 'testkey1', body: ENQUIRY });
    const b = await call('POST', '/api/wa-agent/enquiry', { key: 'testkey1', body: { ...ENQUIRY, message: 'second' } });
    assert.notStrictEqual(a.json.ref, b.json.ref);
    assert.strictEqual(await ContactUs.countDocuments({}), 2);
    await waitFor(() => sent.length >= 2 && crmCalls.length >= 2);
  });

  await test('a failing database write → 500 in the gateway shape, no internals, logged with the [wa-agent] prefix', async () => {
    await reset();
    const original = ContactUs.create;
    ContactUs.create = async () => { throw new Error('E11000 duplicate key error collection: contact_us index: email_1'); };
    try {
      logged.length = 0;
      const r = await call('POST', '/api/wa-agent/enquiry', { key: 'testkey1', body: ENQUIRY });
      assert.strictEqual(r.status, 500);
      assert.deepStrictEqual(r.json, { ok: false, reason: 'server_error', message: 'Something went wrong. Please try again shortly.' });
      assert.ok(!r.text.includes('E11000') && !r.text.includes('contact_us'));
      await settle();
      assert.ok(logged.some((m) => String(m).includes('[wa-agent] unhandled error')));
    } finally {
      ContactUs.create = original;
    }
  });

  await test('the website route is not affected by a gateway-side failure (sanity)', async () => {
    await reset();
    const r = await call('POST', '/api/contact', { body: { name: 'Web', email: 'web@example.com', message: 'ok' } });
    assert.strictEqual(r.status, 201);
    await waitFor(() => sent.length >= 1 && crmCalls.length >= 1);
  });

  // ── step 5: /book, and the website booking it shares code with ──────────
  console.log('\nstep 5: book\n');

  // Studio schedule like production (and seed-dev.js): Mon–Sat, 10:00–19:45 IST.
  const slotsFrom = (from, to) => { const out = []; for (let m = from; m <= to; m += 15) out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`); return out; };
  await MeetingAvailability.findOneAndUpdate({ key: 'default' }, {
    $set: {
      timezone: 'Asia/Kolkata', slotStepMinutes: 15, minNoticeMinutes: 0, blockedDates: [],
      days: Array.from({ length: 7 }, (_, wd) => ({ weekday: wd, enabled: wd !== 0, slots: wd !== 0 ? slotsFrom(600, 1185) : [] })),
    },
  }, { upsert: true });
  invalidateAvailabilityCache();
  await Meeting.syncIndexes(); // the slot_hold unique index is what makes the race test real

  // Fixed future dates: a Tuesday and the Sunday before it, in June next year.
  let tuesday = `${Number(todayIst.slice(0, 4)) + 1}-06-15`;
  while (weekdayOf(tuesday) !== 2) tuesday = addDays(tuesday, 1);
  const sunday = addDays(tuesday, -2);
  const WEB_BOOK = (date, time, tz) => ({
    name: 'Web Visitor', email: 'Web.Visitor@Example.com', phone: '+91 98765 43210',
    service: 'Discovery Call', source_page: '/ScheduleMeeting',
    meeting_date: date, meeting_time: time, meeting_timezone: tz,
    meeting_start_utc: zonedTimeToUtc(date, time, tz === 'Nowhere/Invalid' ? 'Asia/Kolkata' : tz).toISOString(),
    notes: `Slot: ${date} ${time} (${tz})\n\nMessage: from the website`,
  });
  const resetBookings = async () => { sent.length = 0; crmCalls.length = 0; calendarCalls.length = 0; await Meeting.deleteMany({}); await WaAgentQuota.deleteMany({}); };

  await test('REGRESSION website booking POST /api/contact/free-consultation: response, record, 2 emails, CRM call unchanged', async () => {
    await resetBookings();
    const r = await call('POST', '/api/contact/free-consultation', { body: WEB_BOOK(tuesday, '15:00:00', 'Asia/Kolkata') });
    assert.strictEqual(r.status, 201, JSON.stringify(r.json));
    assert.strictEqual(r.json.status, 'success');
    assert.strictEqual(r.json.message, 'Meeting request submitted. You will receive a confirmation email once your meeting is approved.');
    assert.ok(r.json.data && r.json.data._id);

    const d = await Meeting.findOne({}).lean();
    assert.strictEqual(d.userName, 'Web Visitor');
    assert.strictEqual(d.email, 'web.visitor@example.com');
    assert.strictEqual(d.phone, '+91 98765 43210');
    assert.strictEqual(d.meetingDate, tuesday);
    assert.strictEqual(d.meetingTime, '15:00:00');
    assert.strictEqual(d.meetingTimezone, 'Asia/Kolkata');
    assert.strictEqual(d.meeting_start_utc.toISOString(), `${tuesday}T09:30:00.000Z`);
    assert.strictEqual(d.slot_key, `${tuesday}T09:30`);
    assert.strictEqual(d.slot_hold, `${tuesday}T09:30`);
    assert.strictEqual(d.status, 'pending');
    assert.strictEqual(d.duration, 15);
    assert.strictEqual(d.service, 'Discovery Call');
    assert.strictEqual(d.source_page, '/ScheduleMeeting');
    assert.ok(d.notes.startsWith('Slot: '));
    assert.strictEqual(d.meetLink, null);

    await waitFor(() => sent.length >= 2 && crmCalls.length >= 1);
    assert.strictEqual(sent.length, 2, 'owner + visitor');
    assert.deepStrictEqual(sent.map((m) => toList(m).join()).sort(), ['owner@studio.test', 'web.visitor@example.com']);

    assert.strictEqual(crmCalls.length, 1);
    const c = crmCalls[0];
    assert.strictEqual(c.channel, 'meeting');
    assert.strictEqual(c.externalCollection, 'meetings');
    assert.strictEqual(String(c.externalId), String(d._id));
    assert.strictEqual(c.sourcePage, '/ScheduleMeeting');
    assert.strictEqual(c.serviceInterest, 'Discovery Call');
    assert.strictEqual(new Date(c.meetingStartUtc).toISOString(), d.meeting_start_utc.toISOString());
    assert.deepStrictEqual(c.raw, { meeting_date: tuesday, meeting_time: '15:00:00', meeting_timezone: 'Asia/Kolkata' });
    assert.strictEqual(calendarCalls.length, 0);
  });

  await test('REGRESSION website booking on a closed day → 400 with the same message', async () => {
    const r = await call('POST', '/api/contact/free-consultation', { body: WEB_BOOK(sunday, '15:00:00', 'Asia/Kolkata') });
    assert.strictEqual(r.status, 400);
    assert.deepStrictEqual(r.json, { status: 'error', message: CLOSED_DAY_MESSAGE });
  });

  await test('REGRESSION website booking of a taken slot → 409 with the same message', async () => {
    const r = await call('POST', '/api/contact/free-consultation', { body: WEB_BOOK(tuesday, '15:00:00', 'Asia/Kolkata') });
    assert.strictEqual(r.status, 409);
    assert.deepStrictEqual(r.json, { status: 'error', message: 'That time slot is no longer available. Please pick another.' });
    assert.strictEqual(await Meeting.countDocuments({}), 1);
  });

  await test('REGRESSION website booking with an unusable timezone still books, stored in studio time', async () => {
    const r = await call('POST', '/api/contact/free-consultation', { body: WEB_BOOK(tuesday, '16:00:00', 'Nowhere/Invalid') });
    assert.strictEqual(r.status, 201, JSON.stringify(r.json));
    const d = await Meeting.findOne({ meetingTime: '16:00' }).lean();
    assert.ok(d, 'wall clock re-derived in the studio zone (HH:mm)');
    assert.strictEqual(d.meetingTimezone, 'Asia/Kolkata');
    assert.strictEqual(d.meetingDate, tuesday);
    await waitFor(() => sent.length >= 4 && crmCalls.length >= 2);
    assert.strictEqual(crmCalls[1].raw.meeting_timezone, 'Nowhere/Invalid', 'raw CRM payload keeps what was sent');
  });

  const GW_BOOK = (date, time, tz, extra = {}) => ({
    wa_from: '919000000099', name: 'Test Sender', email: 'Test.Sender@Example.com',
    meeting_date: date, meeting_time: time, meeting_timezone: tz, message: 'Booked over WhatsApp', ...extra,
  });
  const expectedWhen = (date, time, tz, label) => {
    const d = zonedTimeToUtc(date, time, tz);
    const p = {}; for (const x of new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(d)) p[x.type] = x.value;
    return `${p.weekday} ${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute} ${p.dayPeriod} ${label}`;
  };

  let bookingRef;
  await test('POST /book on an open slot (Asia/Kolkata) → 201 { ok, booking_ref, status: pending, when } and nothing else', async () => {
    await resetBookings();
    const r = await call('POST', '/api/wa-agent/book', { key: 'testkey1', body: GW_BOOK(tuesday, '15:00:00', 'Asia/Kolkata') });
    assert.strictEqual(r.status, 201, JSON.stringify(r.json));
    assert.deepStrictEqual(Object.keys(r.json).sort(), ['booking_ref', 'ok', 'status', 'when']);
    assert.strictEqual(r.json.ok, true);
    assert.strictEqual(r.json.status, 'pending');
    assert.match(r.json.booking_ref, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
    assert.strictEqual(r.json.when, expectedWhen(tuesday, '15:00:00', 'Asia/Kolkata', 'IST'));
    assert.match(r.json.when, /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d{1,2} [A-Z][a-z]{2} \d{4}, \d{1,2}:\d{2} (AM|PM) IST$/);
    assert.ok(!r.text.includes('_id'));
    bookingRef = r.json.booking_ref;
  });

  await test('the meeting record is pending, phone = wa_from, source_page = whatsapp, service = Discovery Call, notes prefixed', async () => {
    const d = await Meeting.findOne({}).lean();
    assert.strictEqual(d.userName, 'Test Sender');
    assert.strictEqual(d.email, 'test.sender@example.com');
    assert.strictEqual(d.phone, '919000000099');
    assert.strictEqual(d.meetingDate, tuesday);
    assert.strictEqual(d.meetingTime, '15:00:00');
    assert.strictEqual(d.meetingTimezone, 'Asia/Kolkata');
    assert.strictEqual(d.meeting_start_utc.toISOString(), `${tuesday}T09:30:00.000Z`);
    assert.strictEqual(d.slot_key, `${tuesday}T09:30`);
    assert.strictEqual(d.slot_hold, `${tuesday}T09:30`);
    assert.strictEqual(d.status, 'pending');
    assert.strictEqual(d.duration, 15);
    assert.strictEqual(d.service, 'Discovery Call');
    assert.strictEqual(d.source_page, 'whatsapp');
    assert.strictEqual(d.notes, `[via WhatsApp · ref ${bookingRef}]\n\nBooked over WhatsApp`);
    assert.strictEqual(d.meetLink, null);
    assert.strictEqual(d.google_event_id, null);
    assert.strictEqual(d.confirmedAt, null);
  });

  await test('the record has exactly the same fields as a website booking', async () => {
    const wa = await Meeting.findOne({}).lean();
    await call('POST', '/api/contact/free-consultation', { body: WEB_BOOK(tuesday, '17:00:00', 'Asia/Kolkata') });
    const web = await Meeting.findOne({ meetingTime: '17:00:00' }).lean();
    assert.deepStrictEqual(Object.keys(wa).sort(), Object.keys(web).sort());
    await waitFor(() => sent.length >= 4 && crmCalls.length >= 2);
    await Meeting.deleteOne({ _id: web._id }); sent.splice(2); crmCalls.splice(1);
  });

  await test('owner + visitor emails: two, visitor to the sender, owner copy names WhatsApp and the ref, slot in IST', async () => {
    await waitFor(() => sent.length >= 2);
    assert.strictEqual(sent.length, 2);
    const owner = sent.find((m) => toList(m).includes('owner@studio.test'));
    const visitor = sent.find((m) => toList(m).includes('test.sender@example.com'));
    assert.ok(owner && visitor);
    assert.ok(owner.subject.startsWith('New Meeting Request from Test Sender'), owner.subject);
    assert.ok(owner.text.includes('3:00 PM'), 'owner sees the slot in IST');
    assert.ok(owner.html.includes('via WhatsApp') && owner.html.includes(bookingRef));
    assert.ok(owner.html.includes('919000000099'));
    assert.strictEqual(visitor.subject, 'Meeting Request Received');
    assert.ok(visitor.html.includes('3:00 PM'));
  });

  await test('the CRM mirror is called once with channel meeting (so the CRM schedules the call), sourcePage whatsapp, the ref', async () => {
    await waitFor(() => crmCalls.length >= 1);
    assert.strictEqual(crmCalls.length, 1);
    const c = crmCalls[0];
    const d = await Meeting.findOne({}).lean();
    assert.strictEqual(c.channel, 'meeting');
    assert.strictEqual(c.externalCollection, 'meetings');
    assert.strictEqual(String(c.externalId), String(d._id));
    assert.strictEqual(c.sourcePage, 'whatsapp');
    assert.strictEqual(c.phone, '919000000099');
    assert.strictEqual(c.serviceInterest, 'Discovery Call');
    assert.strictEqual(new Date(c.meetingStartUtc).toISOString(), `${tuesday}T09:30:00.000Z`);
    assert.deepStrictEqual(c.raw, { meeting_date: tuesday, meeting_time: '15:00:00', meeting_timezone: 'Asia/Kolkata', via: 'whatsapp', wa_ref: bookingRef });
  });

  await test('no calendar call was made (the founder-confirm path is the only one that creates a Meet link)', async () => {
    assert.strictEqual(calendarCalls.length, 0);
  });

  await test('same slot again from another sender → 409 slot_taken, one record', async () => {
    const r = await call('POST', '/api/wa-agent/book', { key: 'testkey1', body: GW_BOOK(tuesday, '15:00:00', 'Asia/Kolkata', { wa_from: '919000000098', email: 'other@example.com' }) });
    assert.strictEqual(r.status, 409, JSON.stringify(r.json));
    assert.deepStrictEqual(r.json, { ok: false, reason: 'slot_taken', message: 'That time slot is no longer available. Please pick another.' });
    assert.strictEqual(await Meeting.countDocuments({}), 1);
  });

  await test('a slot taken on the website is taken for WhatsApp too (one calendar, both channels)', async () => {
    await call('POST', '/api/contact/free-consultation', { body: WEB_BOOK(tuesday, '18:00:00', 'Asia/Kolkata') });
    const r = await call('POST', '/api/wa-agent/book', { key: 'testkey1', body: GW_BOOK(tuesday, '18:00:00', 'Asia/Kolkata') });
    assert.strictEqual(r.status, 409);
    assert.strictEqual(r.json.reason, 'slot_taken');
    await waitFor(() => sent.length >= 4 && crmCalls.length >= 2);
  });

  await test('closed day (Sunday) → 400 slot_not_offered with the schedule message', async () => {
    const r = await call('POST', '/api/wa-agent/book', { key: 'testkey1', body: GW_BOOK(sunday, '15:00:00', 'Asia/Kolkata') });
    assert.strictEqual(r.status, 400, JSON.stringify(r.json));
    assert.deepStrictEqual(r.json, { ok: false, reason: 'slot_not_offered', message: CLOSED_DAY_MESSAGE });
  });

  await test('off-grid time (10:07) → 400 slot_not_offered', async () => {
    const r = await call('POST', '/api/wa-agent/book', { key: 'testkey1', body: GW_BOOK(tuesday, '10:07:00', 'Asia/Kolkata') });
    assert.strictEqual(r.status, 400);
    assert.deepStrictEqual(r.json, { ok: false, reason: 'slot_not_offered', message: OUT_OF_HOURS_MESSAGE });
  });

  await test('outside hours (09:00 IST) → 400 slot_not_offered', async () => {
    const r = await call('POST', '/api/wa-agent/book', { key: 'testkey1', body: GW_BOOK(tuesday, '09:00:00', 'Asia/Kolkata') });
    assert.strictEqual(r.status, 400);
    assert.strictEqual(r.json.reason, 'slot_not_offered');
  });

  await test('America/New_York 02:30 = 12:00 IST → 201; when in EDT; stored UTC, zone and wall-clock are the sender\'s', async () => {
    await resetBookings();
    const r = await call('POST', '/api/wa-agent/book', { key: 'testkey1', body: GW_BOOK(tuesday, '02:30:00', 'America/New_York', { wa_from: '12125550123' }) });
    assert.strictEqual(r.status, 201, JSON.stringify(r.json));
    assert.strictEqual(r.json.when, expectedWhen(tuesday, '02:30:00', 'America/New_York', 'EDT'));
    const d = await Meeting.findOne({}).lean();
    assert.strictEqual(d.meeting_start_utc.toISOString(), `${tuesday}T06:30:00.000Z`);
    assert.strictEqual(d.slot_key, `${tuesday}T06:30`);
    assert.strictEqual(d.meetingTimezone, 'America/New_York');
    assert.strictEqual(d.meetingDate, tuesday);
    assert.strictEqual(d.meetingTime, '02:30:00');
    await waitFor(() => sent.length >= 2);
    const owner = sent.find((m) => toList(m).includes('owner@studio.test'));
    const visitor = sent.find((m) => toList(m).includes('test.sender@example.com'));
    assert.ok(owner.text.includes('12:00 PM'), 'owner email shows the slot in IST');
    assert.ok(visitor.html.includes('2:30 AM'), 'visitor email shows the slot in their zone');
  });

  await test('America/New_York 02:37 → off the studio grid → 400', async () => {
    const r = await call('POST', '/api/wa-agent/book', { key: 'testkey1', body: GW_BOOK(tuesday, '02:37:00', 'America/New_York') });
    assert.strictEqual(r.status, 400);
    assert.strictEqual(r.json.reason, 'slot_not_offered');
  });

  await test('a booking without a message stores just the prefix in notes', async () => {
    await resetBookings();
    const r = await call('POST', '/api/wa-agent/book', { key: 'testkey1', body: GW_BOOK(tuesday, '15:00:00', 'Asia/Kolkata', { message: undefined }) });
    assert.strictEqual(r.status, 201, JSON.stringify(r.json));
    const d = await Meeting.findOne({}).lean();
    assert.strictEqual(d.notes, `[via WhatsApp · ref ${r.json.booking_ref}]`);
    await waitFor(() => sent.length >= 2 && crmCalls.length >= 1);
  });

  await test('race: two callers pass the taken-check together → the slot_hold index turns the loser into 409', async () => {
    // A pending meeting already holds 15:00. Make the pre-check miss it so the
    // insert itself is what collides.
    const original = Meeting.findOne;
    Meeting.findOne = () => ({ lean: async () => null });
    try {
      const r = await call('POST', '/api/wa-agent/book', { key: 'testkey1', body: GW_BOOK(tuesday, '15:00:00', 'Asia/Kolkata', { wa_from: '919000000097' }) });
      assert.strictEqual(r.status, 409, JSON.stringify(r.json));
      assert.deepStrictEqual(r.json, { ok: false, reason: 'slot_taken', message: 'That time slot was just booked. Please pick another.' });
      assert.ok(!r.text.includes('E11000') && !r.text.includes('slot_hold'));
    } finally {
      Meeting.findOne = original;
    }
    assert.strictEqual(await Meeting.countDocuments({}), 1);
  });

  await test('a failing lookup → 500 in the gateway shape, no internals', async () => {
    const original = Meeting.findOne;
    Meeting.findOne = () => ({ lean: async () => { throw new Error('MongoServerSelectionError: connect ECONNREFUSED'); } });
    try {
      const r = await call('POST', '/api/wa-agent/book', { key: 'testkey1', body: GW_BOOK(tuesday, '16:00:00', 'Asia/Kolkata') });
      assert.strictEqual(r.status, 500);
      assert.deepStrictEqual(r.json, { ok: false, reason: 'server_error', message: 'Something went wrong. Please try again shortly.' });
      assert.ok(!r.text.includes('ECONNREFUSED'));
    } finally {
      Meeting.findOne = original;
    }
  });

  // ── step 6: rate limits + idempotency ───────────────────────────────────
  console.log('\nstep 6: rate limits + idempotency\n');

  const { globalLimiter, GLOBAL_KEY, GLOBAL_PER_HOUR, PER_SENDER } = require('../src/middleware/waAgentRateLimit');
  await WaAgentQuota.syncIndexes();
  const resetQuotas = async () => { await resetBookings(); await ContactUs.deleteMany({}); await WaAgentQuota.deleteMany({}); };
  const RL_MSG = (kind) => `You have reached the limit of ${kind === 'book' ? 'booking requests' : 'enquiries'} for today. Please try again tomorrow, or contact us another way.`;

  await test('wa_agent_quotas has a 24-hour TTL index and a sender/kind index', async () => {
    const idx = await WaAgentQuota.collection.indexes();
    const ttl = idx.find((i) => i.key && i.key.createdAt === 1 && i.expireAfterSeconds !== undefined);
    assert.ok(ttl, JSON.stringify(idx));
    assert.strictEqual(ttl.expireAfterSeconds, 86400);
    assert.ok(idx.some((i) => i.key && i.key.wa_from === 1 && i.key.kind === 1));
  });

  await test('the 4th booking from one sender within 24 h → 429 rate_limited; the first 3 exist', async () => {
    await resetQuotas();
    const times = ['10:00:00', '10:15:00', '10:30:00', '10:45:00'];
    const results = [];
    for (const t of times) results.push(await call('POST', '/api/wa-agent/book', { key: 'testkey1', body: GW_BOOK(tuesday, t, 'Asia/Kolkata') }));
    assert.deepStrictEqual(results.map((r) => r.status), [201, 201, 201, 429], JSON.stringify(results.map((r) => r.json)));
    assert.deepStrictEqual(results[3].json, { ok: false, reason: 'rate_limited', message: RL_MSG('book') });
    assert.strictEqual(await Meeting.countDocuments({}), 3);
    assert.strictEqual(PER_SENDER.book, 3);
    await waitFor(() => sent.length >= 6 && crmCalls.length >= 3);
  });

  await test('another sender is unaffected by the first sender\'s quota', async () => {
    const r = await call('POST', '/api/wa-agent/book', { key: 'testkey1', body: GW_BOOK(tuesday, '11:00:00', 'Asia/Kolkata', { wa_from: '919000000001', email: 'other@example.com' }) });
    assert.strictEqual(r.status, 201, JSON.stringify(r.json));
    await waitFor(() => sent.length >= 8 && crmCalls.length >= 4);
  });

  await test('a 409 (slot taken) does not use up the sender\'s allowance', async () => {
    await resetQuotas();
    await call('POST', '/api/wa-agent/book', { key: 'testkey1', body: GW_BOOK(tuesday, '10:00:00', 'Asia/Kolkata', { wa_from: '919000000002', email: 'a@example.com' }) });
    for (let i = 0; i < 4; i++) {
      const r = await call('POST', '/api/wa-agent/book', { key: 'testkey1', body: GW_BOOK(tuesday, '10:00:00', 'Asia/Kolkata') });
      assert.strictEqual(r.status, 409);
    }
    const ok = await call('POST', '/api/wa-agent/book', { key: 'testkey1', body: GW_BOOK(tuesday, '10:15:00', 'Asia/Kolkata') });
    assert.strictEqual(ok.status, 201, 'four 409s later the sender can still book');
    assert.strictEqual(await WaAgentQuota.countDocuments({ wa_from: '919000000099' }), 1);
    await waitFor(() => sent.length >= 4 && crmCalls.length >= 2);
  });

  await test('the quota is rolling: a booking older than 24 h no longer counts', async () => {
    await resetQuotas();
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
    for (let i = 0; i < 3; i++) await WaAgentQuota.create({ kind: 'book', wa_from: '919000000099', ref: `OLDREF0${i}`, createdAt: old });
    const r = await call('POST', '/api/wa-agent/book', { key: 'testkey1', body: GW_BOOK(tuesday, '10:00:00', 'Asia/Kolkata') });
    assert.strictEqual(r.status, 201, JSON.stringify(r.json));
    await waitFor(() => sent.length >= 2 && crmCalls.length >= 1);
  });

  await test('the 6th enquiry from one sender within 24 h → 429; the first 5 exist', async () => {
    await resetQuotas();
    const results = [];
    for (let i = 0; i < 6; i++) results.push(await call('POST', '/api/wa-agent/enquiry', { key: 'testkey1', body: { ...ENQUIRY, message: `enquiry ${i}` } }));
    assert.deepStrictEqual(results.map((r) => r.status), [201, 201, 201, 201, 201, 429]);
    assert.deepStrictEqual(results[5].json, { ok: false, reason: 'rate_limited', message: RL_MSG('enquiry') });
    assert.strictEqual(await ContactUs.countDocuments({}), 5);
    assert.strictEqual(PER_SENDER.enquiry, 5);
    await waitFor(() => sent.length >= 5 && crmCalls.length >= 5);
  });

  await test('bookings and enquiries have separate allowances', async () => {
    const r = await call('POST', '/api/wa-agent/book', { key: 'testkey1', body: GW_BOOK(tuesday, '10:00:00', 'Asia/Kolkata') });
    assert.strictEqual(r.status, 201, 'five enquiries do not block a booking');
    await waitFor(() => sent.length >= 7 && crmCalls.length >= 6);
  });

  await test('idempotency: the same booking twice within 2 min → same booking_ref, one record, one set of emails', async () => {
    await resetQuotas();
    const body = GW_BOOK(tuesday, '15:00:00', 'Asia/Kolkata');
    const a = await call('POST', '/api/wa-agent/book', { key: 'testkey1', body });
    const b = await call('POST', '/api/wa-agent/book', { key: 'testkey1', body });
    assert.strictEqual(a.status, 201, JSON.stringify(a.json));
    assert.strictEqual(b.status, 201, JSON.stringify(b.json));
    assert.deepStrictEqual(b.json, a.json);
    assert.strictEqual(await Meeting.countDocuments({}), 1);
    await waitFor(() => sent.length >= 2 && crmCalls.length >= 1);
    await settle();
    assert.strictEqual(sent.length, 2, 'the replay sends no emails');
    assert.strictEqual(crmCalls.length, 1, 'the replay does not touch the CRM');
    assert.strictEqual(await WaAgentQuota.countDocuments({ wa_from: '919000000099' }), 1, 'the replay does not count against the quota');
  });

  await test('idempotency: a different time, or a different sender, is a new booking', async () => {
    const r1 = await call('POST', '/api/wa-agent/book', { key: 'testkey1', body: GW_BOOK(tuesday, '15:15:00', 'Asia/Kolkata') });
    assert.strictEqual(r1.status, 201);
    const r2 = await call('POST', '/api/wa-agent/book', { key: 'testkey1', body: GW_BOOK(tuesday, '15:00:00', 'Asia/Kolkata', { wa_from: '919000000003', email: 'c@example.com' }) });
    assert.strictEqual(r2.status, 409, 'the other sender hits the taken slot, not a replay');
    await waitFor(() => sent.length >= 4 && crmCalls.length >= 2);
  });

  await test('idempotency: after the 2-minute window the same request is treated afresh (→ 409, slot now taken)', async () => {
    await WaAgentQuota.updateMany({ wa_from: '919000000099', meeting_time: '15:00:00' }, { $set: { createdAt: new Date(Date.now() - 3 * 60 * 1000) } });
    const r = await call('POST', '/api/wa-agent/book', { key: 'testkey1', body: GW_BOOK(tuesday, '15:00:00', 'Asia/Kolkata') });
    assert.strictEqual(r.status, 409);
    assert.strictEqual(r.json.reason, 'slot_taken');
  });

  await test('the quota record stores the ref and never a document id', async () => {
    const q = await WaAgentQuota.findOne({ wa_from: '919000000099', meeting_time: '15:15:00' }).lean();
    assert.match(q.ref, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
    assert.strictEqual(q.result.booking_ref, q.ref);
    assert.ok(!JSON.stringify(q.result).includes('_id'));
  });

  await test('a WhatsApp booking can be confirmed through the existing admin path (same document, same flow)', async () => {
    // Prove the record is a normal meeting: the admin controller's confirm
    // runs on it unchanged. Mount the admin router for this one test, with
    // the admin already authenticated the way production's gate does it.
    const adminApp = express();
    adminApp.use(express.json());
    adminApp.use('/admin/api/meetings', (req, _res, next) => { req.user = { _id: 'admin-test' }; next(); }, require('../src/routes/admin/meeting'));
    adminApp.use(require('../src/middleware/errorHandler'));
    const srv = http.createServer(adminApp);
    await new Promise((r) => srv.listen(0, '127.0.0.1', r));
    try {
      const d = await Meeting.findOne({ status: 'pending' }).lean();
      const res = await fetch(`http://127.0.0.1:${srv.address().port}/admin/api/meetings/${d._id}/confirm`, { method: 'PUT', headers: { 'content-type': 'application/json' } });
      assert.strictEqual(res.status, 200, await res.text());
      const after = await Meeting.findById(d._id).lean();
      assert.strictEqual(after.status, 'confirmed');
      assert.strictEqual(calendarCalls.length, 1, 'the Meet link is created here, and only here');
    } finally {
      srv.close();
    }
  });

  // Last, because it exhausts the gateway's shared hourly cap.
  await test(`the global cap trips: request ${GLOBAL_PER_HOUR + 1} within the hour → 429, even /health with a valid key`, async () => {
    globalLimiter.resetKey(GLOBAL_KEY);
    const before = await WaAgentQuota.countDocuments({});
    // Spend whatever this process has already used, then the remainder.
    let status = 200; let n = 0;
    while (status === 200 && n < GLOBAL_PER_HOUR + 5) { status = (await call('GET', '/api/wa-agent/health', { key: 'testkey1' })).status; n++; }
    assert.strictEqual(status, 429, `tripped after ${n} requests`);
    assert.strictEqual(n, GLOBAL_PER_HOUR + 1);
    const r = await call('POST', '/api/wa-agent/enquiry', { key: 'testkey1', body: ENQUIRY });
    assert.deepStrictEqual(r.json, { ok: false, reason: 'rate_limited', message: 'The service is busy right now. Please try again in a few minutes.' });
    assert.strictEqual(await WaAgentQuota.countDocuments({}), before, 'nothing written while capped');
    globalLimiter.resetKey(GLOBAL_KEY);
    assert.strictEqual((await call('GET', '/api/wa-agent/health', { key: 'testkey1' })).status, 200);
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
