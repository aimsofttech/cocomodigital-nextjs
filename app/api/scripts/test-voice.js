'use strict';

/**
 * Twilio Voice regression suite.
 *
 * Exercises the whole voice surface — TwiML generation, webhook handling, retry
 * policy, recording attachment and authorization — using genuine HMAC-SHA1
 * Twilio signatures, without placing a single billable call.
 *
 * Runs against a scratch database (default: a local mongod) and drops it on the
 * way in and out, so it never touches CRM data.
 *
 *   node scripts/test-voice.js
 *   TEST_MONGO_URI=mongodb://127.0.0.1:27017/voice_test node scripts/test-voice.js
 *
 * Exits non-zero if anything fails, so it can gate a deploy.
 */

require('dotenv').config();

const TEST_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/twilio_voice_test';
if (/cocomadigital|prod/i.test(TEST_URI)) {
  console.error('Refusing to run: TEST_MONGO_URI looks like a real database.');
  process.exit(1);
}
process.env.MONGO_URI = TEST_URI;

const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');

const PUBLIC = (process.env.API_PUBLIC_URL || 'https://example.test').replace(/\/+$/, '');
const AUTH = process.env.TWILIO_AUTH_TOKEN;
const PORT = Number(process.env.TEST_PORT || 5602);

if (!AUTH) {
  console.error('TWILIO_AUTH_TOKEN must be set — the suite signs requests exactly as Twilio does.');
  process.exit(1);
}

/** Reimplements Twilio's signing algorithm so the middleware is tested for real. */
const sign = (url, params) => crypto.createHmac('sha1', AUTH)
  .update(Buffer.from(Object.keys(params).sort().reduce((a, k) => a + k + params[k], url), 'utf-8'))
  .digest('base64');

let pass = 0;
let fail = 0;
const failures = [];
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok    ${name}`); } else {
    fail++; failures.push(name);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
};
const section = (t) => console.log(`\n${t}`);

(async () => {
  await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 8000 });
  console.log(`Test database: ${mongoose.connection.name}`);
  await mongoose.connection.dropDatabase();

  const { CrmCall, CrmLead, CrmUser, CrmRole, CrmCallScript } = require('../src/crm/models');
  const tw = require('../src/crm/services/twilioVoice');

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/crm/api', require('../src/crm/routes'));
  const server = app.listen(PORT);
  const BASE = `http://127.0.0.1:${PORT}`;

  const post = async (path, body = {}, { signed = true } = {}) => {
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (signed) headers['X-Twilio-Signature'] = sign(PUBLIC + path, body);
    const res = await fetch(BASE + path, { method: 'POST', headers, body: new URLSearchParams(body).toString() });
    return { status: res.status, text: await res.text() };
  };
  // Webhooks ack immediately and finish their work asynchronously.
  const settle = (ms = 700) => new Promise((r) => setTimeout(r, ms));

  /* ── fixtures ─────────────────────────────────────────────────────────── */
  const role = await CrmRole.create({ name: 'Admin', permissions: ['*'], isSystem: true });
  const agent = await CrmUser.create({
    name: 'Test Agent', email: 'agent@test.local', password: 'x'.repeat(20),
    roleId: role._id, phone: '9770601469', isActive: true,
  });
  const lead = await CrmLead.create({ name: 'Ravi Kumar', phone: '09876543210', ownerId: agent._id });

  const mkCall = (sid, extra = {}) => CrmCall.create({
    leadId: lead._id, ownerId: agent._id, provider: 'twilio', mode: 'bridge',
    direction: 'outbound', status: 'ringing', toNumber: '+919876543210',
    providerCallSid: sid, attemptNo: 1, ...extra,
  });

  /* ── 1. signatures ────────────────────────────────────────────────────── */
  section('1. Webhook signature verification');
  check('unsigned request rejected',
    (await post('/crm/api/voice/inbound', { CallSid: 'CAx' }, { signed: false })).status === 403);
  const forged = await fetch(`${BASE}/crm/api/voice/fallback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Twilio-Signature': 'bogus' },
    body: 'CallSid=CAx',
  });
  check('forged signature rejected', forged.status === 403, `got ${forged.status}`);

  /* ── 2. outbound bridge TwiML ─────────────────────────────────────────── */
  section('2. Outbound bridge TwiML');
  const c0 = await mkCall('CAv01', { status: 'queued' });
  const bridge = await post(`/crm/api/voice/outbound/${c0._id}`, { CallSid: 'CAv01', CallStatus: 'in-progress' });
  check('returns 200', bridge.status === 200, `got ${bridge.status}`);
  check('dials the customer', bridge.text.includes('+919876543210'));
  check('uses a Twilio number as callerId', bridge.text.includes(`callerId="${tw.cfg().from}"`));
  check('records the conversation', bridge.text.includes('record-from-answer-dual'));
  check('plays the recording announcement', bridge.text.includes('<Say'));
  check('registers a customer-leg status callback', bridge.text.includes(`dial-status/${c0._id}`));
  check('cancelled call is not bridged',
    (await post(`/crm/api/voice/outbound/${(await mkCall('CAv02', { status: 'cancelled' }))._id}`,
      { CallSid: 'CAv02' })).text.includes('cancelled'));

  /* ── 3. status lifecycle ──────────────────────────────────────────────── */
  section('3. Call status lifecycle');
  const c1 = await mkCall('CAv10', { status: 'queued' });
  await post('/crm/api/webhooks/twilio/call-status', { CallSid: 'CAv10', CallStatus: 'ringing' });
  await settle(300);
  check('ringing recorded', (await CrmCall.findById(c1._id)).status === 'ringing');

  await post(`/crm/api/webhooks/twilio/dial-status/${c1._id}`,
    { CallSid: 'CAv10c', CallStatus: 'completed', DialCallStatus: 'completed', DialCallDuration: '95' });
  await settle();
  await post('/crm/api/webhooks/twilio/call-status', { CallSid: 'CAv10', CallStatus: 'completed', CallDuration: '140' });
  await settle();
  let f = await CrmCall.findById(c1._id);
  check('terminal status stored', f.status === 'completed', `got ${f.status}`);
  check('endedAt stamped', !!f.endedAt);
  // The agent leg (140s) includes ring + dial time; only the customer leg is talk time.
  check('talk time is the customer leg, not the agent leg', f.durationSec === 95, `got ${f.durationSec}`);
  check('lead callAttempts incremented', (await CrmLead.findById(lead._id)).callAttempts === 1);

  await post('/crm/api/webhooks/twilio/call-status', { CallSid: 'CAv10', CallStatus: 'completed', CallDuration: '140' });
  await settle();
  check('duplicate callback is idempotent', (await CrmLead.findById(lead._id)).callAttempts === 1);

  /* ── 4. leg precedence ────────────────────────────────────────────────── */
  section('4. Bridged-leg precedence');
  const c2 = await mkCall('CAv20');
  await post(`/crm/api/webhooks/twilio/dial-status/${c2._id}`,
    { CallSid: 'CAv20c', CallStatus: 'no-answer', DialCallStatus: 'no-answer', DialCallDuration: '0' });
  await settle();
  check('customer leg records no_answer', (await CrmCall.findById(c2._id)).status === 'no_answer');
  // The agent's own leg connected fine, so Twilio reports the parent "completed".
  await post('/crm/api/webhooks/twilio/call-status', { CallSid: 'CAv20', CallStatus: 'completed', CallDuration: '42' });
  await settle();
  check('parent leg cannot mark an unanswered call completed',
    (await CrmCall.findById(c2._id)).status === 'no_answer',
    'would inflate connect rate and suppress the retry');

  /* ── 5. failures and retries ──────────────────────────────────────────── */
  section('5. Failure capture and retry policy');
  const c3 = await mkCall('CAv30');
  await post('/crm/api/webhooks/twilio/call-status', { CallSid: 'CAv30', CallStatus: 'no-answer' });
  await settle(900);
  const retry = await CrmCall.findOne({ retryOfId: c3._id });
  check('unanswered call schedules a retry', !!retry);
  check('retry is attempt #2', retry && retry.attemptNo === 2, `got ${retry && retry.attemptNo}`);

  const c4 = await mkCall('CAv40');
  await post('/crm/api/webhooks/twilio/call-status', { CallSid: 'CAv40', CallStatus: 'failed', ErrorCode: '21211' });
  await settle(900);
  f = await CrmCall.findById(c4._id);
  check('Twilio error code stored', f.errorCode === '21211', `got ${f.errorCode}`);
  check('error translated for humans', /not a valid E\.164/.test(f.errorMessage || ''), f.errorMessage);
  check('permanently invalid number is never retried', !(await CrmCall.findOne({ retryOfId: c4._id })));

  const c5 = await mkCall('CAv50', { attemptNo: 3 });
  await post('/crm/api/webhooks/twilio/call-status', { CallSid: 'CAv50', CallStatus: 'busy' });
  await settle(900);
  check('retry cap honoured', !(await CrmCall.findOne({ retryOfId: c5._id })));

  /* ── 6. recordings ────────────────────────────────────────────────────── */
  section('6. Recording attachment');
  await post('/crm/api/webhooks/twilio/recording-status', {
    CallSid: 'CAv10', RecordingSid: 'REv01', RecordingStatus: 'completed',
    RecordingDuration: '95', RecordingUrl: 'https://api.twilio.com/rec/REv01',
  });
  await settle(400);
  f = await CrmCall.findById(c1._id);
  check('recordingSid stored', f.recordingSid === 'REv01', `got ${f.recordingSid}`);
  check('recordingUrl points at our authenticated proxy, not Twilio',
    (f.recordingUrl || '').includes(`/crm/api/calls/${c1._id}/recording`), f.recordingUrl);

  // A scheduled call has no providerCallSid. A stray callback must not land on it.
  await CrmCall.create({ ownerId: agent._id, leadId: lead._id, status: 'scheduled', scheduledAt: new Date() });
  await post('/crm/api/webhooks/twilio/recording-status', {
    CallSid: 'CAunknown', RecordingSid: 'REstray', RecordingStatus: 'completed', RecordingDuration: '10',
  });
  await settle(400);
  check('orphan recording is not attached to an unrelated call',
    !(await CrmCall.findOne({ recordingSid: 'REstray' })));

  /* ── 7. automated script calls ────────────────────────────────────────── */
  section('7. Automated script calls');
  const script = await CrmCallScript.create({
    name: 'Qualify',
    steps: [
      { kind: 'say', text: 'Hello {{firstName}}, calling from {{brand}}.' },
      { kind: 'gather', text: 'Press 1 if interested, 2 if not.', numDigits: 1, branches: { 1: 'interested', 2: 'not_interested' } },
    ],
    voicemailText: 'Sorry we missed you.',
  });
  const auto = await mkCall('CAv60', { mode: 'auto', status: 'queued', scriptId: script._id });
  const human = await post(`/crm/api/voice/auto/${auto._id}`, { CallSid: 'CAv60', AnsweredBy: 'human' });
  check('placeholders rendered', human.text.includes('Hello Ravi,'), human.text.slice(0, 120));
  check('gather posts back to the CRM', human.text.includes(`/voice/auto/${auto._id}/gather/1`));

  const machine = await post(`/crm/api/voice/auto/${auto._id}`, { CallSid: 'CAv60', AnsweredBy: 'machine_end_beep' });
  check('voicemail variant plays to an answering machine',
    machine.text.includes('Sorry we missed you') && !machine.text.includes('<Gather'));

  const gathered = await post(`/crm/api/voice/auto/${auto._id}/gather/1`, { CallSid: 'CAv60', Digits: '1' });
  await settle(300);
  const ac = await CrmCall.findById(auto._id);
  check('keypress maps to a CRM outcome', ac.outcome === 'interested', `got ${ac.outcome}`);
  check('keypress recorded in responses', ac.responses.length === 1 && ac.responses[0].digits === '1');
  check('gather returns valid TwiML', gathered.status === 200 && gathered.text.startsWith('<?xml'));

  /* ── 8. inbound ───────────────────────────────────────────────────────── */
  section('8. Inbound calls');
  const inbound = await post('/crm/api/voice/inbound',
    { From: '+919876543210', To: tw.cfg().from, CallSid: 'CAin01' });
  const inCall = await CrmCall.findOne({ providerCallSid: 'CAin01' });
  check('returns TwiML', inbound.status === 200 && inbound.text.includes('<Response>'));
  check('rings the owning agent', inbound.text.includes('+919770601469'), inbound.text.slice(0, 200));
  check('matched to the lead', inCall && String(inCall.leadId) === String(lead._id) && inCall.direction === 'inbound');

  const act = /<Dial[^>]*\saction="([^"]+)"/.exec(inbound.text);
  check('dial hands off to a TwiML action endpoint', !!act);
  check('action targets dial-result', !!act && act[1].includes(`/voice/inbound/${inCall._id}/dial-result`), act && act[1]);

  const answered = await post(`/crm/api/voice/inbound/${inCall._id}/dial-result`,
    { CallSid: 'CAin01', DialCallStatus: 'completed', DialCallDuration: '75' });
  check('answered inbound returns TwiML, never an empty 200', answered.text.startsWith('<?xml'));
  check('answered inbound is not sent to voicemail', !answered.text.includes('<Record'),
    'caller would be told nobody was available after a real conversation');
  await settle(300);
  check('inbound talk time captured', (await CrmCall.findById(inCall._id)).durationSec === 75);

  const missed = await post(`/crm/api/voice/inbound/${inCall._id}/dial-result`,
    { CallSid: 'CAin01', DialCallStatus: 'no-answer', DialCallDuration: '0' });
  check('unanswered inbound falls through to voicemail', missed.text.includes('<Record'));

  /* ── 9. fallback ──────────────────────────────────────────────────────── */
  section('9. Fallback endpoint');
  const fb = await post('/crm/api/voice/fallback', { CallSid: 'CAx', ErrorCode: '11200' });
  check('fallback speaks rather than dropping the caller',
    fb.status === 200 && fb.text.includes('<Say'));

  /* ── 10. phone normalisation ──────────────────────────────────────────── */
  section('10. E.164 normalisation');
  for (const [input, want] of [
    ['9770601469', '+919770601469'],
    ['09770601469', '+919770601469'],
    ['+91-97706 01469', '+919770601469'],
    ['(977) 060-1469', '+919770601469'],
    ['0091 9770601469', '+919770601469'],
    ['+1 785 555 0134', '+17855550134'],
  ]) check(`normalises ${JSON.stringify(input)}`, tw.toE164(input, '91') === want, `got ${tw.toE164(input, '91')}`);
  check('rejects too-short input', tw.toE164('123', '91') === null);
  check('rejects empty input', tw.toE164('', '91') === null);

  /* ── 11. authorization ────────────────────────────────────────────────── */
  section('11. Authorization');
  const src = require('fs').readFileSync(require('path').join(__dirname, '../src/crm/routes/calls.js'), 'utf8');
  const between = (a, b) => src.slice(src.indexOf(a), src.indexOf(b));
  check('/:id/dial is scope-filtered',
    between("router.post('/:id/dial'", "router.post('/:id/hangup'").includes('scopeFilter(req)'),
    'an agent could dial another agent\'s call');
  check('/:id/hangup is scope-filtered',
    between("router.post('/:id/hangup'", "router.post('/:id/retry'").includes('scopeFilter(req)'));
  check('/:id/recording is scope-filtered',
    between("router.get('/:id/recording'", 'PUT /crm/api/calls/:id').includes('scopeFilter(req)'));
  check('bulk dialling needs its own permission', src.includes("requirePermission('calls:bulk')"));

  /* ── done ─────────────────────────────────────────────────────────────── */
  console.log(`\n${'='.repeat(52)}`);
  console.log(`  ${pass} passed, ${fail} failed`);
  if (fail) console.log(`\n  Failures:\n${failures.map((n) => `    - ${n}`).join('\n')}`);
  console.log(`${'='.repeat(52)}\n`);

  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server.close();
  process.exit(fail ? 1 : 0);
})().catch((err) => { console.error('Harness error:', err); process.exit(1); });
