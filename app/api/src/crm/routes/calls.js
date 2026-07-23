'use strict';

const router = require('express').Router();
const { CrmCall, CrmLead } = require('../models');
const { crmProtect, requirePermission, scopeFilter, audit } = require('../middleware/crmAuth');
const timeline = require('../services/timeline');
const automation = require('../services/automation');
const jobs = require('../services/jobs');
const messaging = require('../services/messaging');
const settings = require('../services/settings');
const { ok, created, bad, notFound, listOf } = require('./_helpers');

router.use(crmProtect, audit);

const entityOf = (call) =>
  call.leadId ? { kind: 'lead', id: call.leadId } : (call.contactId ? { kind: 'contact', id: call.contactId } : null);

const scheduleReminder = async (call) => {
  if (!call.scheduledAt) return;
  const at = new Date(new Date(call.scheduledAt).getTime() - (call.reminderMinutesBefore || 15) * 60e3);
  await jobs.schedule('call:reminder', at, { callId: String(call._id) }, { dedupeKey: `call:reminder:${call._id}` });
};

// GET /crm/api/calls?status=&ownerId=&leadId=&from=&to=
router.get('/', requirePermission('calls:read'), (req, res) => {
  const filter = { ...scopeFilter(req) };
  if (req.query.status) filter.status = { $in: String(req.query.status).split(',') };
  if (req.query.ownerId) filter.ownerId = req.query.ownerId;
  if (req.query.leadId) filter.leadId = req.query.leadId;
  if (req.query.contactId) filter.contactId = req.query.contactId;
  if (req.query.from || req.query.to) {
    filter.scheduledAt = {};
    if (req.query.from) filter.scheduledAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.scheduledAt.$lte = new Date(req.query.to);
  }
  return listOf(CrmCall, req, res, {
    filter,
    sort: { scheduledAt: 1, createdAt: -1 },
    populate: [
      { path: 'leadId', select: 'name phone company' },
      { path: 'contactId', select: 'firstName lastName phone' },
      { path: 'ownerId', select: 'name' },
    ],
  });
});

// POST /crm/api/calls — schedule a call
router.post('/', requirePermission('calls:create'), async (req, res) => {
  const { leadId, contactId, dealId, scheduledAt, purpose, durationPlannedMin, reminderMinutesBefore, notes, ownerId } = req.body;
  if (!leadId && !contactId) return bad(res, 'leadId or contactId is required');
  if (!scheduledAt) return bad(res, 'scheduledAt is required');
  const call = await CrmCall.create({
    leadId, contactId, dealId,
    ownerId: ownerId || req.crmUser._id,
    purpose: purpose || 'follow_up',
    scheduledAt: new Date(scheduledAt),
    durationPlannedMin: durationPlannedMin || 15,
    reminderMinutesBefore: reminderMinutesBefore === undefined ? 15 : reminderMinutesBefore,
    notes,
    status: 'scheduled',
  });
  await scheduleReminder(call);
  await timeline.record({
    entity: entityOf(call),
    type: 'call.scheduled',
    title: `Call scheduled for ${new Date(call.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
    meta: { callId: call._id },
    actor: { kind: 'user', userId: req.crmUser._id, label: req.crmUser.name },
  });
  return created(res, call, 'Call scheduled');
});

// POST /crm/api/calls/log — log an already-made call (manual dialing is the free mode)
router.post('/log', requirePermission('calls:create'), async (req, res) => {
  const { leadId, contactId, dealId, direction, status, outcome, durationSec, notes } = req.body;
  if (!leadId && !contactId) return bad(res, 'leadId or contactId is required');
  if (!['completed', 'no_answer', 'busy'].includes(status)) return bad(res, 'status must be completed | no_answer | busy');
  const call = await CrmCall.create({
    leadId, contactId, dealId,
    ownerId: req.crmUser._id,
    direction: direction || 'outbound',
    status,
    outcome: outcome || null,
    durationSec: Number(durationSec) || 0,
    startedAt: new Date(Date.now() - (Number(durationSec) || 0) * 1000),
    endedAt: new Date(),
    notes,
    provider: 'manual',
  });
  if (leadId) await CrmLead.updateOne({ _id: leadId }, { $inc: { callAttempts: 1 } });
  await timeline.record({
    entity: entityOf(call),
    type: 'call.logged',
    title: status === 'completed'
      ? `Call completed${outcome ? ` — ${outcome.replace('_', ' ')}` : ''}${durationSec ? ` (${Math.round(durationSec / 60)}m ${durationSec % 60}s)` : ''}`
      : `Call attempt — ${status.replace('_', ' ')}`,
    meta: { callId: call._id, outcome, durationSec },
    actor: { kind: 'user', userId: req.crmUser._id, label: req.crmUser.name },
  });
  const ent = entityOf(call);
  await automation.emitEvent(status === 'completed' ? 'call.completed' : 'call.no_answer', {
    entityKind: ent.kind, entityId: ent.id, data: { outcome: outcome || '', callId: String(call._id) },
  });
  return created(res, call, 'Call logged');
});

// GET /crm/api/calls/:id
router.get('/:id', requirePermission('calls:read'), async (req, res) => {
  const call = await CrmCall.findOne({ _id: req.params.id, ...scopeFilter(req) })
    .populate('leadId', 'name phone company')
    .populate('contactId', 'firstName lastName phone')
    .populate('ownerId', 'name')
    .lean();
  if (!call) return notFound(res, 'Call');
  return ok(res, call);
});

// POST /crm/api/calls/:id/dial — click-to-call. Free mode returns a tel: link;
// with Twilio Voice configured it bridges agent → lead and records.
router.post('/:id/dial', requirePermission('calls:update'), async (req, res) => {
  const call = await CrmCall.findOne({ _id: req.params.id })
    .populate('leadId', 'name phone')
    .populate('contactId', 'firstName phone');
  if (!call) return notFound(res, 'Call');
  const person = call.leadId || call.contactId;
  const s = await settings.getSettings();
  const toNumber = messaging.normalizePhone(person && person.phone, s.defaultCountryCode);
  if (!toNumber) return bad(res, 'No phone number on record');

  const voiceReady = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VOICE_FROM);
  if (!voiceReady) {
    // FREE mode: the agent dials from their own phone.
    return ok(res, { mode: 'manual', telLink: `tel:+${toNumber}`, phone: `+${toNumber}` });
  }

  const agentNumber = messaging.normalizePhone(req.crmUser.phone, s.defaultCountryCode);
  if (!agentNumber) return bad(res, 'Add your phone number to your CRM profile first');
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const params = new URLSearchParams({
    To: `+${agentNumber}`,
    From: process.env.TWILIO_VOICE_FROM,
    Twiml: `<Response><Dial record="record-from-answer">+${toNumber}</Dial></Response>`,
  });
  const twRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const data = await twRes.json().catch(() => ({}));
  if (!twRes.ok) return bad(res, data.message || 'Twilio call failed', 502);
  call.provider = 'twilio';
  call.providerCallSid = data.sid;
  call.fromNumber = process.env.TWILIO_VOICE_FROM;
  call.toNumber = `+${toNumber}`;
  await call.save();
  return ok(res, { mode: 'twilio', sid: data.sid });
});

// PUT /crm/api/calls/:id — edit notes / outcome / mark completed
router.put('/:id', requirePermission('calls:update'), async (req, res) => {
  const call = await CrmCall.findOne({ _id: req.params.id, ...scopeFilter(req) });
  if (!call) return notFound(res, 'Call');
  const FIELDS = ['notes', 'outcome', 'purpose', 'durationSec'];
  for (const f of FIELDS) if (req.body[f] !== undefined) call[f] = req.body[f];
  if (req.body.status && ['completed', 'no_answer', 'busy', 'cancelled'].includes(req.body.status) && call.status === 'scheduled') {
    call.status = req.body.status;
    call.endedAt = new Date();
    await jobs.cancelByKey(`call:reminder:${call._id}`);
    if (call.leadId && req.body.status !== 'cancelled') {
      await CrmLead.updateOne({ _id: call.leadId }, { $inc: { callAttempts: 1 } });
    }
    const ent = entityOf(call);
    if (ent && req.body.status !== 'cancelled') {
      await timeline.record({
        entity: ent,
        type: 'call.logged',
        title: call.status === 'completed'
          ? `Call completed${call.outcome ? ` — ${call.outcome.replace('_', ' ')}` : ''}`
          : `Call attempt — ${call.status.replace('_', ' ')}`,
        meta: { callId: call._id },
        actor: { kind: 'user', userId: req.crmUser._id, label: req.crmUser.name },
      });
      await automation.emitEvent(call.status === 'completed' ? 'call.completed' : 'call.no_answer', {
        entityKind: ent.kind, entityId: ent.id, data: { outcome: call.outcome || '', callId: String(call._id) },
      });
    }
  }
  await call.save();
  return ok(res, call);
});

// PATCH /crm/api/calls/:id/reschedule
router.patch('/:id/reschedule', requirePermission('calls:update'), async (req, res) => {
  const { scheduledAt } = req.body;
  if (!scheduledAt) return bad(res, 'scheduledAt is required');
  const old = await CrmCall.findOne({ _id: req.params.id, ...scopeFilter(req) });
  if (!old) return notFound(res, 'Call');
  old.status = 'rescheduled';
  await old.save();
  await jobs.cancelByKey(`call:reminder:${old._id}`);
  const fresh = await CrmCall.create({
    leadId: old.leadId, contactId: old.contactId, dealId: old.dealId,
    ownerId: old.ownerId, purpose: old.purpose,
    scheduledAt: new Date(scheduledAt),
    durationPlannedMin: old.durationPlannedMin,
    reminderMinutesBefore: old.reminderMinutesBefore,
    notes: old.notes, status: 'scheduled', rescheduledFromId: old._id,
  });
  await scheduleReminder(fresh);
  await timeline.record({
    entity: entityOf(fresh),
    type: 'call.scheduled',
    title: `Call rescheduled to ${new Date(scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
    meta: { callId: fresh._id, rescheduledFromId: old._id },
    actor: { kind: 'user', userId: req.crmUser._id, label: req.crmUser.name },
  });
  return ok(res, fresh);
});

// PATCH /crm/api/calls/:id/cancel
router.patch('/:id/cancel', requirePermission('calls:update'), async (req, res) => {
  const call = await CrmCall.findOne({ _id: req.params.id, ...scopeFilter(req) });
  if (!call) return notFound(res, 'Call');
  if (call.status !== 'scheduled') return bad(res, 'Only scheduled calls can be cancelled');
  call.status = 'cancelled';
  await call.save();
  await jobs.cancelByKey(`call:reminder:${call._id}`);
  return ok(res, call);
});

router.delete('/:id', requirePermission('calls:delete'), async (req, res) => {
  const call = await CrmCall.findByIdAndDelete(req.params.id);
  if (!call) return notFound(res, 'Call');
  await jobs.cancelByKey(`call:reminder:${call._id}`);
  return ok(res, null);
});

module.exports = router;
