'use strict';

/**
 * End-to-end proof that a customer's WhatsApp reply reaches an open CRM inbox
 * with no polling and no refresh.
 *
 * Exercises the real path: Twilio webhook → recordInbound → Mongo → Socket.IO
 * → subscribed client. Also covers auth rejection, thread-room scoping,
 * outbound echo, and duplicate-webhook suppression.
 *
 * Runs against a scratch database on a spare port, so it never touches the
 * live CRM. Nothing is sent to Twilio.
 *
 *   cd app/api && node scripts/test-realtime.js
 */

require('dotenv').config();

const PORT = Number(process.env.REALTIME_TEST_PORT || 5055);
const TEST_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/crm_realtime_test';
if (/cocomadigital|prod/i.test(TEST_URI)) {
  console.error('Refusing to run: TEST_MONGO_URI looks like a real database.');
  process.exit(1);
}

// Must be set before anything reads them.
process.env.MONGO_URI = TEST_URI;
process.env.PORT = String(PORT);
process.env.NODE_ENV = 'test';
// The signature is computed over the public URL, which a loopback POST cannot
// reproduce. Signature validation itself is covered by check-whatsapp.js,
// which asserts the deployed endpoint returns 403 to an unsigned request.
process.env.TWILIO_VALIDATE_WEBHOOKS = 'false';

const GREEN = '\x1b[32m'; const RED = '\x1b[31m'; const DIM = '\x1b[2m'; const OFF = '\x1b[0m';
let pass = 0; const failures = [];
const check = (name, cond, detail) => {
  if (cond) { pass++; console.log(`  ${GREEN}ok${OFF}    ${name}`); }
  else { failures.push(name); console.log(`  ${RED}FAIL${OFF}  ${name}${detail ? `\n        ${DIM}${detail}${OFF}` : ''}`); }
};

const jwt = require('jsonwebtoken');
const http = require('http');
const mongoose = require('mongoose');
const { io: ioClient } = require('socket.io-client');

/** Wait for one event, or resolve null on timeout. */
const waitFor = (socket, event, ms = 5000) => new Promise((resolve) => {
  const timer = setTimeout(() => { socket.off(event, on); resolve(null); }, ms);
  function on(payload) { clearTimeout(timer); socket.off(event, on); resolve(payload); }
  socket.on(event, on);
});

const postForm = (path, form) => new Promise((resolve, reject) => {
  const body = new URLSearchParams(form).toString();
  const req = http.request({
    host: '127.0.0.1', port: PORT, path, method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
  }, (res) => {
    let out = ''; res.on('data', (d) => { out += d; });
    res.on('end', () => resolve({ status: res.statusCode, body: out }));
  });
  req.on('error', reject);
  req.end(body);
});

(async () => {
  console.log('\n=== CRM realtime end-to-end ===\n');

  await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 8000 });
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();

  // Boot the real server exactly as production does. Requiring it starts the
  // listener and attaches Socket.IO — creating another here would double-bind
  // the port and test a server that is not the one under test.
  const app = require('../src/server');
  const server = app.httpServer;
  await new Promise((r) => setTimeout(r, 2500));   // let it listen + Mongo connect

  const { CrmLead, CrmMessage } = require('../src/crm/models');
  const lead = await CrmLead.create({ name: 'Realtime Test', phone: '9770601469' });
  const key = `whatsapp:${lead._id}`;
  const url = `http://127.0.0.1:${PORT}`;

  /* ── 1. auth ──────────────────────────────────────────────────────────── */
  console.log('1. Socket authentication');

  const anon = ioClient(url, { path: '/crm/socket.io', transports: ['websocket'], reconnection: false });
  const anonErr = await waitFor(anon, 'connect_error', 4000);
  check('a socket with no token is rejected', Boolean(anonErr), anonErr ? '' : 'it connected!');
  anon.close();

  const adminToken = jwt.sign({ id: String(lead._id), kind: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const wrongKind = ioClient(url, { path: '/crm/socket.io', auth: { token: adminToken }, transports: ['websocket'], reconnection: false });
  const wrongErr = await waitFor(wrongKind, 'connect_error', 4000);
  check('an admin-panel token cannot open a CRM socket', Boolean(wrongErr));
  wrongKind.close();

  const token = jwt.sign({ id: String(lead._id), kind: 'crm' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const agent = ioClient(url, { path: '/crm/socket.io', auth: { token }, transports: ['websocket'], reconnection: false });
  const connected = await waitFor(agent, 'connect', 5000);
  check('a valid CRM token connects', agent.connected, connected === null ? 'timed out' : '');

  /* ── 2. inbound reply appears live ────────────────────────────────────── */
  console.log('\n2. Customer replies on WhatsApp → CRM updates instantly');

  agent.emit('thread:join', key);
  await new Promise((r) => setTimeout(r, 300));

  const inboundPromise = waitFor(agent, 'message:new', 6000);
  const sid = 'SM' + '1'.repeat(32);
  const res = await postForm('/crm/api/webhooks/twilio/whatsapp-inbound', {
    From: 'whatsapp:+919770601469', To: 'whatsapp:+14155238886',
    Body: 'Yes, I am interested', MessageSid: sid, NumMedia: '0',
  });
  check('webhook acknowledges immediately', res.status === 200, `got ${res.status}`);

  const inbound = await inboundPromise;
  check('the reply arrives over the socket', Boolean(inbound), 'no message:new within 6s');
  check('it carries the message body', inbound && inbound.message.body === 'Yes, I am interested',
    inbound && JSON.stringify(inbound.message.body));
  check('it is tagged inbound', inbound && inbound.message.direction === 'inbound');
  check('it is routed to the right conversation', inbound && inbound.key === key,
    inbound && `got ${inbound.key}, expected ${key}`);

  /* ── 3. it is durable, not just a broadcast ───────────────────────────── */
  console.log('\n3. Stored in the database');
  const stored = await CrmMessage.findOne({ providerMessageId: sid });
  check('the inbound message is persisted', Boolean(stored));
  check('status is "received"', stored && stored.status === 'received');
  check('the Twilio SID is recorded', stored && stored.providerMessageId === sid);

  /* ── 4. duplicate webhook delivery ────────────────────────────────────── */
  console.log('\n4. Duplicate webhook (providers retry on slow acks)');
  await postForm('/crm/api/webhooks/twilio/whatsapp-inbound', {
    From: 'whatsapp:+919770601469', To: 'whatsapp:+14155238886',
    Body: 'Yes, I am interested', MessageSid: sid, NumMedia: '0',
  });
  await new Promise((r) => setTimeout(r, 800));
  const dupes = await CrmMessage.countDocuments({ providerMessageId: sid });
  check('the same SID is not stored twice', dupes === 1, `found ${dupes} copies`);

  /* ── 5. media ─────────────────────────────────────────────────────────── */
  console.log('\n5. Inbound media');
  const mediaSid = 'SM' + '2'.repeat(32);
  const mediaPromise = waitFor(agent, 'message:new', 6000);
  await postForm('/crm/api/webhooks/twilio/whatsapp-inbound', {
    From: 'whatsapp:+919770601469', To: 'whatsapp:+14155238886',
    Body: 'here is the brief', MessageSid: mediaSid, NumMedia: '2',
    MediaUrl0: 'https://api.twilio.com/media/A', MediaUrl1: 'https://api.twilio.com/media/B',
  });
  const withMedia = await mediaPromise;
  check('attachments are captured', withMedia && (withMedia.message.mediaUrls || []).length === 2,
    withMedia && JSON.stringify(withMedia.message.mediaUrls));

  /* ── 5b. every inbound message type ───────────────────────────────────── */
  console.log('\n5b. Non-text replies (photo, voice, location, button tap)');
  let n = 5;
  const inboundOf = async (label, form, expect) => {
    n++;
    const p = waitFor(agent, 'message:new', 6000);
    await postForm('/crm/api/webhooks/twilio/whatsapp-inbound', {
      From: 'whatsapp:+919770601469', To: 'whatsapp:+14155238886',
      // Distinct prefix per case. Repeating a digit to 32 chars collides with
      // the fixed SIDs used above, and the duplicate guard then swallows the
      // event — a green test that proved nothing.
      MessageSid: `SM${`type${n}`.padEnd(32, '0')}`, ...form,
    });
    const got = await p;
    check(label, Boolean(got) && expect(got.message.body),
      got ? `body was ${JSON.stringify(got.message.body)}` : 'no event');
  };

  await inboundOf('a photo with no caption is described',
    { NumMedia: '1', MediaUrl0: 'https://api.twilio.com/m/p', MediaContentType0: 'image/jpeg' },
    (b) => /Photo/.test(b));
  await inboundOf('a voice note is described',
    { NumMedia: '1', MediaUrl0: 'https://api.twilio.com/m/v', MediaContentType0: 'audio/ogg' },
    (b) => /Voice message/.test(b));
  await inboundOf('a PDF is described',
    { NumMedia: '1', MediaUrl0: 'https://api.twilio.com/m/d', MediaContentType0: 'application/pdf' },
    (b) => /PDF/.test(b));
  await inboundOf('a shared location becomes a maps link',
    { Latitude: '28.6139', Longitude: '77.2090', Label: 'Office' },
    (b) => /Location/.test(b) && /maps\.google\.com/.test(b));
  await inboundOf('a quick-reply button tap is recorded',
    { ButtonText: 'Confirm' },
    (b) => /Confirm/.test(b));
  await inboundOf('a photo WITH a caption keeps the caption',
    { Body: 'here is my logo', NumMedia: '1', MediaUrl0: 'https://api.twilio.com/m/c', MediaContentType0: 'image/png' },
    (b) => b === 'here is my logo');

  /* ── 6. room scoping ──────────────────────────────────────────────────── */
  console.log('\n6. Only subscribed conversations receive traffic');
  agent.emit('thread:leave', key);
  await new Promise((r) => setTimeout(r, 300));
  const afterLeave = waitFor(agent, 'message:new', 2500);
  await postForm('/crm/api/webhooks/twilio/whatsapp-inbound', {
    From: 'whatsapp:+919770601469', To: 'whatsapp:+14155238886',
    Body: 'after leaving', MessageSid: 'SM' + '3'.repeat(32), NumMedia: '0',
  });
  check('no thread traffic after leaving the room', (await afterLeave) === null);

  // ...but the conversation list still updates, so the unread badge moves.
  agent.emit('thread:join', key);
  await new Promise((r) => setTimeout(r, 300));
  const listPromise = waitFor(agent, 'thread:update', 6000);
  await postForm('/crm/api/webhooks/twilio/whatsapp-inbound', {
    From: 'whatsapp:+919770601469', To: 'whatsapp:+14155238886',
    Body: 'bump the list', MessageSid: 'SM' + '4'.repeat(32), NumMedia: '0',
  });
  check('the conversation list is notified', Boolean(await listPromise));

  /* ── 7. outbound echo ─────────────────────────────────────────────────── */
  console.log('\n7. Agent sends from the CRM → own tabs update');
  const messaging = require('../src/crm/services/messaging');
  const outPromise = waitFor(agent, 'message:new', 6000);
  await messaging.sendMessage({ channel: 'whatsapp', leadId: lead._id, body: 'Thanks for confirming!' });
  const out = await outPromise;
  check('the outbound message is echoed live', Boolean(out));
  check('it is tagged outbound', out && out.message.direction === 'outbound');
  check('queued status is visible immediately', out && out.message.status === 'queued', out && out.message.status);

  /* ── summary ──────────────────────────────────────────────────────────── */
  console.log(`\n${'='.repeat(52)}`);
  console.log(`  ${pass} passed, ${failures.length} failed`);
  if (failures.length) console.log(`\n  Failures:\n${failures.map((n) => `    - ${n}`).join('\n')}`);
  console.log(`${'='.repeat(52)}\n`);

  agent.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server.close();
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error('Harness error:', e); process.exit(1); });
