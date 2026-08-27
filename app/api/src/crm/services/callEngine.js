'use strict';

/**
 * Call orchestration — the layer between HTTP routes / background jobs and the
 * raw Twilio wrapper.
 *
 * Routes and workers both need to "dial this lead", "retry that failure" and
 * "advance this campaign", and all three have to agree on quiet hours, opt-out,
 * attempt limits and how a failure is recorded. Putting the rules here means a
 * bulk campaign cannot accidentally bypass a check that click-to-call enforces.
 */

const {
  CrmCall, CrmCallCampaign, CrmLead, CrmContact, CrmUser,
} = require('../models');
const tw = require('./twilioVoice');
const settings = require('./settings');
const timeline = require('./timeline');
const automation = require('./automation');
const jobs = require('./jobs');
const notify = require('./notify');
const logger = require('../../utils/logger');
const realtime = require('../realtime');

/* ── Guards ─────────────────────────────────────────────────────────────── */

const parseHm = (hm, fallback) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hm || ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : fallback;
};

/** Minutes-since-midnight in the CRM's configured timezone. */
const minutesNowIn = (timezone) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === 'hour').value);
  const mi = Number(parts.find((p) => p.type === 'minute').value);
  return h * 60 + mi;
};

/**
 * Automated calls respect the CRM quiet hours; a human pressing "Call" does
 * not, because they are looking at the clock themselves and may have been asked
 * to call back at an odd hour.
 */
const isWithinWindow = async ({ windowStart, windowEnd } = {}) => {
  const s = await settings.getSettings();
  const start = parseHm(windowStart || s.callWindowStart || '10:00', 600);
  const end = parseHm(windowEnd || s.callWindowEnd || '19:00', 1140);
  const now = minutesNowIn(s.timezone);
  return start <= end ? (now >= start && now < end) : (now >= start || now < end);
};

/** Next moment inside the dialling window, for scheduling a deferred attempt. */
const nextWindowOpening = async ({ windowStart } = {}) => {
  const s = await settings.getSettings();
  const start = parseHm(windowStart || s.callWindowStart || '10:00', 600);
  const now = minutesNowIn(s.timezone);
  const deltaMin = now < start ? start - now : (24 * 60 - now) + start;
  return new Date(Date.now() + deltaMin * 60e3);
};

/** Resolve the person on the other end and their dialable number. */
const resolveTarget = async ({ leadId, contactId, phone }) => {
  const s = await settings.getSettings();
  let person = null;
  let kind = null;
  if (leadId) {
    person = await CrmLead.findById(leadId).select('name phone doNotCall deletedAt').lean();
    kind = 'lead';
  } else if (contactId) {
    person = await CrmContact.findById(contactId).select('firstName lastName phone doNotCall dnd').lean();
    kind = 'contact';
  }
  const raw = phone || (person && person.phone);
  const e164 = tw.toE164(raw, s.defaultCountryCode);
  return {
    person, kind, e164,
    // Honouring an explicit do-not-call flag is a legal requirement in most of
    // the markets this CRM targets, not a nicety. Contacts also carry a general
    // `dnd` flag, which covers voice as well.
    blocked: Boolean(person && (person.doNotCall || person.dnd)),
    deleted: Boolean(person && person.deletedAt),
  };
};

/* ── Dialling ───────────────────────────────────────────────────────────── */

/**
 * Refuse to dial when the call cannot possibly work.
 *
 * The reachability half matters as much as the credential half. Twilio fetches
 * the TwiML from API_PUBLIC_URL the instant the phone is answered — so with a
 * dead host (a `trycloudflare` tunnel that moved on restart is the usual case)
 * the call is placed, somebody's phone rings, and they get silence. Refusing up
 * front turns that into a message naming the actual problem instead of a
 * mystery call to a customer.
 */
const assertVoiceUsable = () => {
  if (!tw.isVoiceReady()) {
    const err = new Error('Twilio Voice is not configured');
    err.userMessage = `Twilio Voice is not ready: missing ${tw.readiness().missing.join(', ')}`;
    err.statusCode = 503;
    throw err;
  }
  const probe = tw.publicUrlHealth();
  // `null` means never probed — unknown must not block dialling.
  if (probe && !probe.ok) {
    const err = new Error(`API_PUBLIC_URL unreachable: ${probe.reason}`);
    err.userMessage = `Calls are disabled: Twilio cannot reach this server at ${probe.url || 'API_PUBLIC_URL'} `
      + `(${probe.reason}). It fetches the call audio from there, so the call would ring and then go silent. `
      + 'Start your tunnel and set API_PUBLIC_URL to its current URL, then restart the API.';
    err.statusCode = 503;
    throw err;
  }
};

/**
 * Bridged click-to-call: Twilio rings `agent` first, and only once they answer
 * does our TwiML dial the customer.
 *
 * Returns the updated CrmCall. Throws with `.userMessage` set when the failure
 * is something the agent can fix (bad number, unverified trial number, ...).
 */
const dialBridge = async ({ call, agentUser }) => {
  assertVoiceUsable();
  const s = await settings.getSettings();
  const agentNumber = tw.toE164(agentUser && agentUser.phone, s.defaultCountryCode);
  if (!agentNumber) {
    const err = new Error('Agent has no phone number');
    err.userMessage = 'Add your phone number to your CRM profile before using click-to-call.';
    err.statusCode = 400;
    throw err;
  }
  // Bridging a number to itself can never work: Twilio rings the agent, then
  // dials the customer — the same line — and the second leg lands on busy. Easy
  // to hit on a trial account, where the one verified number tends to get used
  // as both the agent's profile phone and the test lead's.
  if (call.toNumber && agentNumber === call.toNumber) {
    const err = new Error('Agent and customer are the same number');
    err.userMessage = 'Your profile phone is the same number as this contact. A bridged call would '
      + 'dial it twice and the second leg hits busy — use a different number on your profile.';
    err.statusCode = 400;
    throw err;
  }

  call.provider = 'twilio';
  call.mode = 'bridge';
  call.direction = 'outbound';
  call.fromNumber = tw.cfg().from;
  call.status = 'queued';
  call.errorCode = null;
  call.errorMessage = null;
  await call.save();
  realtime.emitCall(call);

  try {
    const tcall = await tw.placeCall({
      to: agentNumber,
      twimlUrl: tw.URLS.outboundTwiml(String(call._id)),
      statusCallback: tw.URLS.status(),
      // The customer leg is recorded by the <Dial> in the TwiML, so recording
      // here would capture the agent's hold music too.
      record: false,
    });
    call.providerCallSid = tcall.sid;
    call.status = tw.mapStatus(tcall.status) || 'queued';
    await call.save();
  realtime.emitCall(call);
    logger.info(`Twilio bridge call ${tcall.sid} queued: agent ${tw.maskPhone(agentNumber)} → ${tw.maskPhone(call.toNumber)}`);
    return call;
  } catch (err) {
    const info = tw.describeError(err);
    call.status = 'failed';
    call.errorCode = info.errorCode;
    call.errorMessage = info.errorMessage;
    call.endedAt = new Date();
    await call.save();
  realtime.emitCall(call);
    const wrapped = new Error(info.errorMessage);
    wrapped.userMessage = info.errorMessage;
    wrapped.statusCode = 502;
    throw wrapped;
  }
};

/**
 * Automated call: Twilio rings the customer directly and plays a script. No
 * agent is on the line unless the script transfers.
 */
const dialAuto = async ({ call }) => {
  assertVoiceUsable();
  const c = tw.cfg();
  call.provider = 'twilio';
  call.mode = 'auto';
  call.direction = 'outbound';
  call.fromNumber = c.from;
  call.status = 'queued';
  call.errorCode = null;
  call.errorMessage = null;
  await call.save();
  realtime.emitCall(call);

  try {
    const tcall = await tw.placeCall({
      to: call.toNumber,
      twimlUrl: tw.URLS.autoTwiml(String(call._id)),
      statusCallback: tw.URLS.status(),
      // Without AMD an automated script starts talking over a voicemail
      // greeting and the whole message lands mid-beep.
      machineDetection: c.machineDetection,
      record: c.recordCalls,
    });
    call.providerCallSid = tcall.sid;
    call.status = tw.mapStatus(tcall.status) || 'queued';
    await call.save();
  realtime.emitCall(call);
    logger.info(`Twilio auto call ${tcall.sid} queued → ${tw.maskPhone(call.toNumber)}`);
    return call;
  } catch (err) {
    const info = tw.describeError(err);
    call.status = 'failed';
    call.errorCode = info.errorCode;
    call.errorMessage = info.errorMessage;
    call.endedAt = new Date();
    await call.save();
  realtime.emitCall(call);
    const wrapped = new Error(info.errorMessage);
    wrapped.userMessage = info.errorMessage;
    wrapped.statusCode = 502;
    throw wrapped;
  }
};

/**
 * Create the CrmCall row and dial it in one step. Used by click-to-call,
 * campaigns and automation actions alike.
 */
const startCall = async ({
  leadId, contactId, dealId, ownerId, mode = 'bridge', scriptId, campaignId,
  purpose = 'follow_up', notes, agentUser, attemptNo = 1, retryOfId, existingCall,
}) => {
  const target = await resolveTarget({ leadId, contactId });
  if (!target.e164) {
    const err = new Error('No usable phone number');
    err.userMessage = 'No valid phone number on record for this contact.';
    err.statusCode = 400;
    throw err;
  }
  if (target.blocked) {
    const err = new Error('do-not-call');
    err.userMessage = 'This person is marked Do Not Call.';
    err.statusCode = 409;
    throw err;
  }

  const call = existingCall || await CrmCall.create({
    leadId, contactId, dealId,
    ownerId,
    purpose,
    notes,
    mode,
    scriptId,
    campaignId,
    attemptNo,
    retryOfId,
    direction: 'outbound',
    status: 'queued',
  });
  call.toNumber = target.e164;
  await call.save();
  realtime.emitCall(call);

  try {
    if (mode === 'auto') return await dialAuto({ call });
    const agent = agentUser || (ownerId ? await CrmUser.findById(ownerId) : null);
    return await dialBridge({ call, agentUser: agent });
  } catch (err) {
    // The pre-flight checks in dialBridge/dialAuto (no agent number, Twilio not
    // configured, self-bridge) reject *before* either function touches the row.
    // Without this the call created above stayed at "queued" forever, with no
    // SID and no reason recorded — the agent saw a call that looked pending and
    // the history never explained why nothing happened.
    if (call.status === 'queued' && !call.providerCallSid) {
      call.status = 'failed';
      call.errorMessage = err.userMessage || err.message;
      call.endedAt = new Date();
      await call.save().catch(() => {});
      realtime.emitCall(call);
    }
    throw err;
  }
};

/* ── Retries ────────────────────────────────────────────────────────────── */

const DEFAULT_MAX_ATTEMPTS = () => Number(process.env.TWILIO_MAX_CALL_ATTEMPTS || 3);
const DEFAULT_RETRY_DELAY_MIN = () => Number(process.env.TWILIO_RETRY_DELAY_MIN || 30);

/**
 * Decide whether a finished call deserves another attempt, and schedule it.
 *
 * A retry becomes its own CrmCall document (linked back via retryOfId) so the
 * history shows three attempts rather than one row that quietly changed status
 * three times.
 */
const scheduleRetry = async (call, { force = false, delayMin, maxAttempts } = {}) => {
  const cap = maxAttempts || DEFAULT_MAX_ATTEMPTS();
  if (!force) {
    if (!['no_answer', 'busy', 'failed'].includes(call.status)) return null;
    if ((call.attemptNo || 1) >= cap) return null;
    // A number that does not exist, is not a phone number, or is barred will
    // fail identically forever — retrying just burns money and reputation.
    const permanent = ['21211', '21214', '21217', '21219', '13223', '13225', '21215'];
    if (call.errorCode && permanent.includes(String(call.errorCode))) return null;
  }
  const wait = delayMin || DEFAULT_RETRY_DELAY_MIN();
  let runAt = new Date(Date.now() + wait * 60e3);
  if (!(await isWithinWindow())) runAt = await nextWindowOpening();

  const retry = await CrmCall.create({
    leadId: call.leadId,
    contactId: call.contactId,
    dealId: call.dealId,
    ownerId: call.ownerId,
    purpose: call.purpose,
    mode: call.mode,
    scriptId: call.scriptId,
    campaignId: call.campaignId,
    direction: 'outbound',
    status: 'scheduled',
    scheduledAt: runAt,
    retryScheduledAt: runAt,
    attemptNo: (call.attemptNo || 1) + 1,
    retryOfId: call._id,
    notes: call.notes,
  });
  await jobs.schedule('call:auto-dial', runAt, { callId: String(retry._id) }, {
    dedupeKey: `call:auto-dial:${retry._id}`,
    maxAttempts: 2,
  });
  logger.info(`Scheduled retry #${retry.attemptNo} for call ${call._id} at ${runAt.toISOString()}`);
  return retry;
};

/* ── Post-call bookkeeping ──────────────────────────────────────────────────
 * Called from the status webhook once a call reaches a terminal state. Kept
 * here (not in the route) so an automated call, a bridged call and a retry all
 * produce the same timeline entries and fire the same automation events. */
const finalizeCall = async (call) => {
  const entityKind = call.leadId ? 'lead' : (call.contactId ? 'contact' : null);
  const entityId = call.leadId || call.contactId;

  if (call.leadId && call.direction === 'outbound') {
    await CrmLead.updateOne({ _id: call.leadId }, {
      $inc: { callAttempts: 1 },
      $set: { lastActivityAt: new Date() },
    });
  }

  if (entityId) {
    const mins = Math.floor((call.durationSec || 0) / 60);
    const secs = (call.durationSec || 0) % 60;
    const label = call.status === 'completed'
      ? `Call completed (${mins}m ${secs}s)${call.answeredBy && call.answeredBy.startsWith('machine') ? ' — voicemail' : ''}`
      : `Call ${String(call.status).replace('_', ' ')}${call.errorMessage ? ` — ${call.errorMessage}` : ''}`;
    await timeline.record({
      entity: { kind: entityKind, id: entityId },
      type: 'call.logged',
      title: label,
      meta: {
        callId: call._id,
        recordingUrl: call.recordingUrl,
        durationSec: call.durationSec,
        attemptNo: call.attemptNo,
        errorCode: call.errorCode,
      },
      actor: { kind: 'system', label: 'Twilio' },
    }).catch((e) => logger.error(`Timeline write failed for call ${call._id}: ${e.message}`));

    await automation.emitEvent(
      call.status === 'completed' ? 'call.completed' : 'call.no_answer',
      {
        entityKind,
        entityId,
        data: {
          callId: String(call._id),
          outcome: call.outcome || '',
          durationSec: String(call.durationSec || 0),
          answeredBy: call.answeredBy || '',
        },
      }
    ).catch((e) => logger.error(`Automation emit failed for call ${call._id}: ${e.message}`));
  }

  // Tell the agent when their click-to-call never reached the customer — they
  // hung up their own phone and would otherwise assume it went through.
  if (call.status !== 'completed' && call.ownerId && call.mode === 'bridge') {
    notify.notify(call.ownerId, {
      type: 'call.failed',
      title: `Call ${String(call.status).replace('_', ' ')}${call.errorMessage ? `: ${call.errorMessage}` : ''}`,
      entity: entityId ? { kind: entityKind, id: entityId } : undefined,
    }).catch(() => {});
  }

  if (call.campaignId) await onCampaignCallFinished(call);
};

/* ── Campaigns ──────────────────────────────────────────────────────────── */

/**
 * Advance a campaign: dial as many pending targets as the concurrency cap
 * allows, then re-arm the runner. Called on a timer and after every campaign
 * call finishes, so a campaign drains itself without a busy loop.
 */
const runCampaign = async (campaignId) => {
  const camp = await CrmCallCampaign.findById(campaignId);
  if (!camp || camp.status !== 'running') return;

  if (!(await isWithinWindow({ windowStart: camp.windowStart, windowEnd: camp.windowEnd }))) {
    const at = await nextWindowOpening({ windowStart: camp.windowStart });
    await jobs.schedule('campaign:run', at, { campaignId: String(camp._id) }, {
      dedupeKey: `campaign:run:${camp._id}`,
    });
    logger.info(`Campaign ${camp._id} outside dialling window — resuming ${at.toISOString()}`);
    return;
  }

  const live = camp.targets.filter((t) => t.status === 'dialing').length;
  const slots = Math.max(0, (camp.concurrency || 1) - live);
  const pending = camp.targets.filter((t) => t.status === 'pending').slice(0, slots);

  if (!pending.length && !live) {
    camp.status = 'completed';
    camp.finishedAt = new Date();
    await camp.save();
    logger.info(`Campaign ${camp._id} completed: ${camp.stats.completed}/${camp.stats.total}`);
    return;
  }

  const owner = camp.ownerId ? await CrmUser.findById(camp.ownerId) : null;
  for (const t of pending) {
    t.status = 'dialing';
    t.attempts = (t.attempts || 0) + 1;
    try {
      // eslint-disable-next-line no-await-in-loop
      const call = await startCall({
        leadId: t.leadId,
        contactId: t.contactId,
        ownerId: camp.ownerId,
        mode: camp.mode,
        scriptId: camp.scriptId,
        campaignId: camp._id,
        purpose: 'follow_up',
        agentUser: owner,
        attemptNo: t.attempts,
      });
      t.callId = call._id;
      camp.stats.dialed += 1;
    } catch (err) {
      t.status = 'failed';
      t.lastError = err.userMessage || err.message;
      camp.stats.failed += 1;
      logger.error(`Campaign ${camp._id} target failed: ${t.lastError}`);
    }
  }
  await camp.save();

  // Poll again shortly: some targets will have finished by then and freed a slot.
  await jobs.schedule('campaign:run', new Date(Date.now() + 30e3), { campaignId: String(camp._id) }, {
    dedupeKey: `campaign:run:${camp._id}`,
  });
};

/** Update campaign counters when one of its calls reaches a terminal state. */
const onCampaignCallFinished = async (call) => {
  const camp = await CrmCallCampaign.findById(call.campaignId);
  if (!camp) return;
  const t = camp.targets.find((x) => x.callId && String(x.callId) === String(call._id));
  if (t) {
    const exhausted = (t.attempts || 1) >= (camp.maxAttempts || 2);
    if (call.status === 'completed') {
      t.status = 'done';
    } else if (exhausted) {
      t.status = 'failed';
      t.lastError = call.errorMessage || call.status;
    } else {
      // Put it back in the queue; runCampaign will pick it up next pass.
      t.status = 'pending';
      t.lastError = call.errorMessage || call.status;
    }
  }
  if (call.status === 'completed') camp.stats.completed += 1;
  else camp.stats.failed += 1;
  if (call.answeredBy && call.answeredBy.startsWith('machine')) camp.stats.machine += 1;
  else if (call.status === 'completed') camp.stats.answered += 1;
  await camp.save();

  if (camp.status === 'running') {
    await jobs.schedule('campaign:run', new Date(Date.now() + 5e3), { campaignId: String(camp._id) }, {
      dedupeKey: `campaign:run:${camp._id}`,
    });
  }
};

module.exports = {
  isWithinWindow,
  nextWindowOpening,
  resolveTarget,
  assertVoiceUsable,
  dialBridge,
  dialAuto,
  startCall,
  scheduleRetry,
  finalizeCall,
  runCampaign,
  onCampaignCallFinished,
};
