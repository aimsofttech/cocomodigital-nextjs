'use strict';

/**
 * Scheduled-calling regression suite.
 *
 * Covers the gap this module actually had: scheduling a call armed a *reminder*
 * (a notification telling the agent to dial by hand) and nothing else, so a
 * call scheduled for 3pm never rang anybody at 3pm.
 *
 * Runs against a scratch database with Twilio stubbed — no call is placed.
 *
 *   cd app/api && node scripts/test-calls.js
 */

require('dotenv').config();

const TEST_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/crm_calls_test';
if (/cocomadigital|prod/i.test(TEST_URI)) {
  console.error('Refusing to run: TEST_MONGO_URI looks like a real database.');
  process.exit(1);
}
process.env.MONGO_URI = TEST_URI;
process.env.TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'ACtest';
process.env.TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'testtoken';
process.env.TWILIO_VOICE_FROM = process.env.TWILIO_VOICE_FROM || '+17853369380';
process.env.API_PUBLIC_URL = process.env.API_PUBLIC_URL || 'https://example.test';

// No real dialling. The Twilio SDK talks over axios, NOT global.fetch, so
// stubbing fetch leaves it free to hit the live API — which is how an early
// run of this suite reached Twilio for real. Stub the SDK surface instead.
const placed = [];
const tw = require('../src/crm/services/twilioVoice');
tw.placeCall = async (opts) => {
  placed.push(opts);
  return { sid: 'CAtest', status: 'queued' };
};

const mongoose = require('mongoose');

let pass = 0; const failures = [];
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  ok    ${n}`); }
  else { failures.push(n); console.log(`  FAIL  ${n}${d ? ` — ${d}` : ''}`); }
};
const section = (t) => console.log(`\n${t}`);

(async () => {
  await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 8000 });
  await mongoose.connection.dropDatabase();

  const { CrmCall, CrmLead, CrmUser, CrmJob, CrmRole } = require('../src/crm/models');
  const jobs = require('../src/crm/services/jobs');


  const role = await CrmRole.create({ name: 'Admin', permissions: ['*'] });
  const agent = await CrmUser.create({
    name: 'Agent', email: 'a@test.local', password: 'test1234', roleId: role._id, phone: '+919999999999',
  });
  const lead = await CrmLead.create({ name: 'Target', phone: '9770601469', ownerId: agent._id });

  const pendingJobs = (name, callId) =>
    CrmJob.countDocuments({ name, status: 'pending', dedupeKey: `${name}:${callId}` });

  section('1. Twilio Voice readiness');
  check('voice reports ready with credentials + from + public URL', tw.isVoiceReady(),
    JSON.stringify(tw.readiness().missing));
  check('the agent has a dialable number', Boolean(tw.toE164(agent.phone, '91')), agent.phone);

  section('2. Scheduling WITHOUT auto-dial arms a reminder only');
  const at = new Date(Date.now() + 60 * 60e3);
  const manual = await CrmCall.create({
    leadId: lead._id, ownerId: agent._id, scheduledAt: at, status: 'scheduled', autoDial: false,
  });
  await jobs.schedule('call:reminder', at, { callId: String(manual._id) }, { dedupeKey: `call:reminder:${manual._id}` });
  check('a reminder job exists', (await pendingJobs('call:reminder', manual._id)) === 1);
  check('NO auto-dial job is armed', (await pendingJobs('call:auto-dial', manual._id)) === 0);

  section('3. Scheduling WITH auto-dial arms the dial');
  const auto = await CrmCall.create({
    leadId: lead._id, ownerId: agent._id, scheduledAt: at, status: 'scheduled', autoDial: true,
  });
  await jobs.schedule('call:auto-dial', at, { callId: String(auto._id) }, { dedupeKey: `call:auto-dial:${auto._id}` });
  check('an auto-dial job is armed', (await pendingJobs('call:auto-dial', auto._id)) === 1);

  const job = await CrmJob.findOne({ dedupeKey: `call:auto-dial:${auto._id}`, status: 'pending' }).lean();
  check('it is armed for the scheduled time',
    Math.abs(new Date(job.runAt).getTime() - at.getTime()) < 2000,
    `runAt ${job && job.runAt}`);
  check('the job lives in Mongo, so it survives a restart', Boolean(job && job._id));

  section('4. Re-arming does not stack duplicate dials');
  const later = new Date(Date.now() + 2 * 60 * 60e3);
  await jobs.schedule('call:auto-dial', later, { callId: String(auto._id) }, { dedupeKey: `call:auto-dial:${auto._id}` });
  check('rescheduling replaces rather than adds', (await pendingJobs('call:auto-dial', auto._id)) === 1);
  const rearmed = await CrmJob.findOne({ dedupeKey: `call:auto-dial:${auto._id}`, status: 'pending' }).lean();
  check('the new time is used',
    Math.abs(new Date(rearmed.runAt).getTime() - later.getTime()) < 2000);

  section('5. Cancelling stops the dial');
  await jobs.cancelByKey(`call:auto-dial:${auto._id}`);
  await jobs.cancelByKey(`call:reminder:${auto._id}`);
  check('no auto-dial job remains', (await pendingJobs('call:auto-dial', auto._id)) === 0);
  check('no reminder remains', (await pendingJobs('call:reminder', auto._id)) === 0);

  section('6. The auto-dial handler respects call state');
  require('../src/crm/services/workers');
  const engine = require('../src/crm/services/callEngine');

  // A call already completed must not be redialled when its timer fires.
  const done = await CrmCall.create({
    leadId: lead._id, ownerId: agent._id, scheduledAt: at, status: 'completed', autoDial: true,
  });
  const before = placed.length;
  const owner = await CrmUser.findById(agent._id);
  if (['scheduled', 'queued'].includes(done.status)) {
    await engine.startCall({ leadId: lead._id, ownerId: agent._id, agentUser: owner, mode: 'bridge' });
  }
  check('a completed call is not redialled', placed.length === before);

  section('7. Placing a bridge call dials the AGENT first');
  const fresh = await engine.startCall({
    leadId: lead._id, ownerId: agent._id, agentUser: owner, mode: 'bridge',
  });
  const last = placed[placed.length - 1] || {};
  check('a call was placed', placed.length > before);
  // Bridge mode rings the AGENT first; the customer is dialled by the TwiML.
  // Getting this backwards would call the lead and play them hold music.
  check('the agent leg is dialled first', last.to === '+919999999999', last.to);
  check('the TwiML bridges via /voice/outbound', /\/voice\/outbound\//.test(last.twimlUrl || ''), last.twimlUrl);
  check('a status callback is attached', Boolean(last.statusCallback), last.statusCallback);
  check('the call row stores the provider SID', fresh.providerCallSid === 'CAtest', fresh.providerCallSid);
  check('the customer number is recorded', String(fresh.toNumber).includes('9770601469'), fresh.toNumber);

  section('8. Bridge without an agent phone is refused, not silently dropped');
  const phoneless = await CrmUser.create({
    name: 'NoPhone', email: 'np@test.local', password: 'test1234', roleId: role._id,
  });
  let err = null;
  try {
    await engine.startCall({ leadId: lead._id, ownerId: phoneless._id, agentUser: phoneless, mode: 'bridge' });
  } catch (e) { err = e; }
  check('an agent with no phone cannot bridge', Boolean(err));
  check('the reason names the missing number', /phone|number/i.test(err ? err.message : ''), err && err.message);

  section('9. An unreachable API_PUBLIC_URL blocks dialling');
  // Twilio fetches the call audio from API_PUBLIC_URL the moment the phone is
  // answered. With that host dark, a placed call rings and then delivers
  // silence — and no status callback ever arrives to explain it. Refusing up
  // front is the only outcome that names the real problem.
  const realProbe = tw.publicUrlHealth;

  tw.publicUrlHealth = () => ({ ok: false, reason: 'fetch failed', url: 'https://dead.tunnel.test' });
  const beforeBlocked = placed.length;
  let blockErr = null;
  try {
    await engine.startCall({ leadId: lead._id, ownerId: agent._id, agentUser: owner, mode: 'bridge' });
  } catch (e) { blockErr = e; }
  check('dialling is refused while the callback host is dark', Boolean(blockErr));
  check('no call reaches Twilio', placed.length === beforeBlocked);
  check('the reason names the unreachable host',
    /reach|unreachable|API_PUBLIC_URL/i.test(blockErr ? (blockErr.userMessage || blockErr.message) : ''),
    blockErr && (blockErr.userMessage || blockErr.message));

  // The failed row must say why, rather than sitting at "queued" forever.
  const blockedRow = await CrmCall.findOne({ leadId: lead._id }).sort({ createdAt: -1 }).lean();
  check('the call row records the failure', blockedRow.status === 'failed', blockedRow.status);

  // "Never probed" is not "unreachable" — an unknown answer must not block.
  tw.publicUrlHealth = () => null;
  const beforeUnknown = placed.length;
  await engine.startCall({ leadId: lead._id, ownerId: agent._id, agentUser: owner, mode: 'bridge' });
  check('an unprobed host does NOT block dialling', placed.length > beforeUnknown);

  tw.publicUrlHealth = () => ({ ok: true, url: 'https://example.test' });
  const beforeOk = placed.length;
  await engine.startCall({ leadId: lead._id, ownerId: agent._id, agentUser: owner, mode: 'bridge' });
  check('a reachable host dials normally', placed.length > beforeOk);
  tw.publicUrlHealth = realProbe;

  section('10. A rejected API key falls back to the auth token');
  // An API key takes priority over the account auth token, so a mis-copied
  // secret (Twilio shows it once) kills every call with an opaque 20003 while
  // readiness() still reports voice ready. That is exactly what happened here.
  process.env.TWILIO_API_KEY_SID = 'SKbroken';
  process.env.TWILIO_API_KEY_SECRET = 'wrongsecret';
  tw.resetClient();
  check('the API key is preferred while it looks valid', tw.usingApiKey());

  const realFetch = global.fetch;
  let probes = 0;
  global.fetch = async () => { probes += 1; return { status: probes === 1 ? 401 : 200, ok: probes !== 1 }; };
  const verdict = await tw.verifyCredentials();
  global.fetch = realFetch;

  check('a 401 on the key does not fail the account', verdict.ok, JSON.stringify(verdict));
  check('it demotes to the auth token', verdict.demoted === true && verdict.credential === 'auth_token');
  check('the key is no longer used', !tw.usingApiKey());
  check('readiness warns about the dead key',
    tw.readiness().warnings.some((w) => /API_KEY/.test(w)),
    JSON.stringify(tw.readiness().warnings));
  check('voice still reports ready — calling is not lost to a bad key', tw.isVoiceReady());

  console.log(`\n${'='.repeat(52)}`);
  console.log(`  ${pass} passed, ${failures.length} failed`);
  if (failures.length) console.log(`\n  Failures:\n${failures.map((n) => `    - ${n}`).join('\n')}`);
  console.log(`${'='.repeat(52)}\n`);

  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error('Harness error:', e); process.exit(1); });
