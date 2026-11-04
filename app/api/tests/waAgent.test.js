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

require('express-async-errors');
const express = require('express');
const mongoose = require('mongoose');
const ContactUs = require('../src/models/ContactUs');

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

  await test('a valid /book body passes validation (501 stub until step 5)', async () => {
    const r = await call('POST', '/api/wa-agent/book', { key: 'testkey1', body: BOOK });
    assert.strictEqual(r.status, 501, JSON.stringify(r.json));
    assert.strictEqual(r.json.reason, 'not_implemented');
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

  const reset = async () => { sent.length = 0; crmCalls.length = 0; await ContactUs.deleteMany({}); };
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
