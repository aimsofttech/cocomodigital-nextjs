'use strict';

/**
 * TwiML endpoints — PUBLIC (no JWT). Twilio fetches these mid-call to find out
 * what to do next, so every response is XML and every route is
 * signature-verified: an unsigned POST here could bridge a stranger's call
 * through our number or read back lead data over the phone.
 *
 * Latency matters: Twilio gives a TwiML endpoint 15 seconds before it gives up
 * and plays an error to the caller, so these handlers do the minimum work
 * needed to produce XML and push everything else onto the job queue.
 */

const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { CrmCall, CrmCallScript, CrmLead, CrmContact, CrmUser } = require('../models');
const { verifyTwilioSignature } = require('../middleware/twilioSignature');
const tw = require('../services/twilioVoice');
const settings = require('../services/settings');
const timeline = require('../services/timeline');
const logger = require('../../utils/logger');

// Same reasoning as the webhook limiter: these are public, database-touching
// routes. A live campaign of 500 calls produces a few thousand hits an hour, so
// the ceiling sits well above legitimate traffic.
router.use(rateLimit({ windowMs: 60 * 1000, max: 1200, message: 'Too many voice requests' }));

const xml = (res, twiml) => res.type('text/xml').status(200).send(twiml);

/** Anything unexpected must still return valid TwiML or the caller hears an error tone. */
const safeXml = (res, err, context) => {
  logger.error(`Voice TwiML error (${context}): ${err.message}`);
  return xml(res, tw.sayTwiml('Sorry, we are unable to complete this call right now. Goodbye.'));
};

/* ── Outbound leg 1: the agent picked up ────────────────────────────────────
 * Twilio rang the agent first. Now bridge them to the customer. Doing it this
 * way (rather than ringing the customer first) means the customer never hears
 * dead air waiting for an agent, and the agent's personal number is never
 * exposed — the caller ID on the customer's phone is the Twilio number. */
router.post('/outbound/:callId', verifyTwilioSignature, async (req, res) => {
  try {
    const call = await CrmCall.findById(req.params.callId).lean();
    if (!call || !call.toNumber) {
      return xml(res, tw.sayTwiml('This call is no longer available. Goodbye.'));
    }
    // The agent may have hung up, or an operator cancelled the call while it rang.
    if (call.status === 'cancelled') {
      return xml(res, tw.sayTwiml('This call was cancelled. Goodbye.'));
    }
    const c = tw.cfg();
    return xml(res, tw.bridgeTwiml({
      toNumber: call.toNumber,
      callId: String(call._id),
      record: c.recordCalls,
      announcement: c.recordCalls ? c.recordingAnnouncement : null,
    }));
  } catch (err) {
    return safeXml(res, err, 'outbound');
  }
});

/* ── Automated call: play the script ────────────────────────────────────── */

/** Placeholder values available to a script's {{...}} tokens. */
const scriptVars = async (call) => {
  const s = await settings.getSettings();
  let person = null;
  if (call.leadId) person = await CrmLead.findById(call.leadId).select('name company').lean();
  else if (call.contactId) person = await CrmContact.findById(call.contactId).select('firstName lastName company').lean();
  const owner = call.ownerId ? await CrmUser.findById(call.ownerId).select('name').lean() : null;
  const name = person
    ? (person.name || [person.firstName, person.lastName].filter(Boolean).join(' '))
    : 'there';
  return {
    name,
    firstName: String(name).split(' ')[0],
    company: (person && person.company) || '',
    agent: (owner && owner.name) || 'our team',
    brand: process.env.CRM_BRAND_NAME || 'Cocoma Digital',
    timezone: s.timezone,
  };
};

router.post('/auto/:callId', verifyTwilioSignature, async (req, res) => {
  try {
    const call = await CrmCall.findById(req.params.callId);
    if (!call) return xml(res, tw.sayTwiml('Goodbye.'));
    if (call.status === 'cancelled') return xml(res, tw.sayTwiml('Goodbye.'));

    // Twilio posts AnsweredBy on the TwiML request when synchronous AMD is on.
    const answeredBy = req.body.AnsweredBy || null;
    if (answeredBy) {
      call.answeredBy = answeredBy;
      await call.save();
    }

    const script = call.scriptId ? await CrmCallScript.findById(call.scriptId).lean() : null;
    if (!script || !script.steps || !script.steps.length) {
      return xml(res, tw.sayTwiml('Thank you for taking our call. Goodbye.'));
    }
    const vars = await scriptVars(call);
    return xml(res, tw.scriptTwiml({ script, callId: String(call._id), vars, answeredBy }));
  } catch (err) {
    return safeXml(res, err, 'auto');
  }
});

/**
 * DTMF / recording result for step N. Records what the callee pressed, maps it
 * to a CRM outcome via the step's `branches`, then continues the script.
 */
router.post('/auto/:callId/gather/:step', verifyTwilioSignature, async (req, res) => {
  try {
    const call = await CrmCall.findById(req.params.callId);
    if (!call) return xml(res, tw.sayTwiml('Goodbye.'));

    const stepIndex = Number(req.params.step) || 0;
    const digits = req.body.Digits || '';
    const speech = req.body.SpeechResult || '';
    call.responses.push({ at: new Date(), digits, speech, step: String(stepIndex) });

    const script = call.scriptId ? await CrmCallScript.findById(call.scriptId).lean() : null;
    const step = script && script.steps && script.steps[stepIndex];
    const branches = (step && step.branches) || {};
    const branch = digits ? branches[digits] : null;

    // A branch value that names a valid CRM outcome is recorded as one; that is
    // the whole point of an automated qualification call.
    const OUTCOMES = ['interested', 'not_interested', 'callback_requested', 'converted', 'wrong_number', 'voicemail'];
    if (branch && OUTCOMES.includes(branch)) call.outcome = branch;
    await call.save();

    if (branch === 'transfer' && step && step.transferTo) {
      const vr = tw.scriptTwiml({
        script: { ...script, steps: [{ kind: 'say', text: 'Connecting you to an agent now.' }, { kind: 'dial', transferTo: step.transferTo }] },
        callId: String(call._id),
        vars: await scriptVars(call),
      });
      return xml(res, vr);
    }
    if (branch === 'hangup' || branch === 'not_interested') {
      return xml(res, tw.sayTwiml('Thank you for your time. Goodbye.'));
    }

    // Otherwise fall through to the next step in the script.
    const vars = await scriptVars(call);
    return xml(res, tw.scriptTwiml({ script, callId: String(call._id), vars, fromStep: stepIndex + 1 }));
  } catch (err) {
    return safeXml(res, err, 'gather');
  }
});

/* ── Inbound calls ──────────────────────────────────────────────────────────
 * Configured as the "A CALL COMES IN" Voice URL on the Twilio number. Matches
 * the caller to an existing lead/contact, logs the call, and rings the owning
 * agent (falling back to any active agent with a phone number on file). */
router.post('/inbound', verifyTwilioSignature, async (req, res) => {
  try {
    const s = await settings.getSettings();
    const from = req.body.From || '';
    const callSid = req.body.CallSid;
    const tail = String(from).replace(/[^\d]/g, '').slice(-10);
    const rx = tail ? new RegExp(`${tail}$`) : null;

    const lead = rx ? await CrmLead.findOne({ phone: rx, deletedAt: null }).select('_id name ownerId').lean() : null;
    const contact = !lead && rx ? await CrmContact.findOne({ phone: rx }).select('_id firstName ownerId').lean() : null;

    // Ring the record owner first; if the caller is unknown or unowned, ring
    // every active agent who has a phone number so the call is not lost.
    let agents = [];
    const ownerId = (lead && lead.ownerId) || (contact && contact.ownerId);
    if (ownerId) {
      const owner = await CrmUser.findById(ownerId).select('phone').lean();
      if (owner && owner.phone) agents = [owner.phone];
    }
    if (!agents.length) {
      const all = await CrmUser.find({ isActive: true, phone: { $nin: [null, ''] } }).select('phone').limit(5).lean();
      agents = all.map((u) => u.phone);
    }
    const numbers = agents
      .map((p) => tw.toE164(p, s.defaultCountryCode))
      .filter(Boolean);

    const call = await CrmCall.create({
      leadId: lead ? lead._id : undefined,
      contactId: contact ? contact._id : undefined,
      ownerId: ownerId || undefined,
      direction: 'inbound',
      mode: 'inbound',
      provider: 'twilio',
      providerCallSid: callSid,
      fromNumber: from,
      toNumber: req.body.To,
      status: 'in_progress',
      startedAt: new Date(),
      purpose: 'other',
    });

    if (lead || contact) {
      timeline.record({
        entity: lead ? { kind: 'lead', id: lead._id } : { kind: 'contact', id: contact._id },
        type: 'call.logged',
        title: `Inbound call from ${tw.maskPhone(from)}`,
        meta: { callId: call._id },
        actor: { kind: 'system', label: 'Twilio' },
      }).catch(() => {});
    }

    const c = tw.cfg();
    return xml(res, tw.inboundTwiml({
      greeting: process.env.TWILIO_INBOUND_GREETING
        || `Thank you for calling ${process.env.CRM_BRAND_NAME || 'Cocoma Digital'}. Please hold while we connect you.`,
      agentNumbers: numbers,
      callId: String(call._id),
      record: c.recordCalls,
    }));
  } catch (err) {
    return safeXml(res, err, 'inbound');
  }
});

/**
 * Result of the <Dial> on an inbound call. Twilio executes whatever TwiML this
 * returns, so it must never answer with a bare 200 — that ends the call.
 *
 * DialCallStatus tells us whether an agent actually picked up. Only when the
 * dial failed does the caller get voicemail; after a real conversation we hang
 * up, because the caller is still on the line and would otherwise be told that
 * nobody was available.
 */
router.post('/inbound/:callId/dial-result', verifyTwilioSignature, async (req, res) => {
  try {
    const status = req.body.DialCallStatus;
    const call = await CrmCall.findById(req.params.callId);

    if (call) {
      const mapped = tw.mapStatus(status);
      if (mapped) {
        call.status = mapped;
        call.childReportedAt = new Date();
        const dur = Number(req.body.DialCallDuration) || 0;
        if (dur) call.durationSec = dur;
        if (mapped === 'completed') call.endedAt = new Date();
        await call.save();
      }
    }

    if (status === 'completed') return xml(res, tw.sayTwiml('Thank you for calling. Goodbye.'));
    return xml(res, tw.voicemailTwiml(process.env.TWILIO_VOICEMAIL_PROMPT));
  } catch (err) {
    return safeXml(res, err, 'inbound-dial-result');
  }
});

/* ── Fallback ───────────────────────────────────────────────────────────────
 * Set as FallbackUrl on every outbound call and on the number's Voice config.
 * Twilio hits it when the primary TwiML URL errors or times out; without it the
 * caller just hears Twilio's generic failure message. */
router.post('/fallback', verifyTwilioSignature, (req, res) => {
  logger.error(`Twilio voice fallback hit: CallSid=${req.body.CallSid} ErrorCode=${req.body.ErrorCode} ErrorUrl=${req.body.ErrorUrl}`);
  return xml(res, tw.sayTwiml('We are experiencing a technical problem. Please try again shortly. Goodbye.'));
});

module.exports = router;
