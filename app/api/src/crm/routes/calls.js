'use strict';

const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { CrmCall, CrmLead, CrmContact, CrmCallCampaign, CrmCallScript } = require('../models');
const { crmProtect, requirePermission, scopeFilter, audit } = require('../middleware/crmAuth');
const timeline = require('../services/timeline');
const automation = require('../services/automation');
const jobs = require('../services/jobs');
const settings = require('../services/settings');
const tw = require('../services/twilioVoice');
const engine = require('../services/callEngine');
const logger = require('../../utils/logger');
const { ok, created, bad, notFound, listOf } = require('./_helpers');

router.use(crmProtect, audit);

/**
 * Placing a call costs money and rings a real person's phone, so the dialling
 * routes get a tighter limit than the rest of the CRM API. This is per-IP on
 * top of the global limiter; the campaign concurrency cap handles volume.
 */
const dialLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  // Keyed per CRM user, not per IP. A sales floor sits behind one office NAT,
  // so an IP-keyed limit would let one busy agent throttle the whole team.
  keyGenerator: (req) => (req.crmUser ? String(req.crmUser._id) : req.ip),
  message: { status: 'error', message: 'Too many call attempts — slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Turn an engine/Twilio error into the right HTTP response. */
const failCall = (res, err, context) => {
  logger.error(`Call ${context} failed: ${err.message}`);
  return bad(res, err.userMessage || 'Call could not be placed', err.statusCode || 502);
};

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
  if (req.query.mode) filter.mode = { $in: String(req.query.mode).split(',') };
  if (req.query.direction) filter.direction = req.query.direction;
  if (req.query.campaignId) filter.campaignId = req.query.campaignId;
  if (req.query.hasRecording === 'true') filter.recordingUrl = { $nin: [null, ''] };
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

/* ── Literal paths must be declared before '/:id' or Express matches them as
 *    an id and every one of them 404s. ──────────────────────────────────── */

/**
 * GET /crm/api/calls/config
 * Tells the UI which calling modes are actually available, so the Call button
 * can say "click-to-call" or "open dialler" instead of failing at press time.
 */
router.get('/config', requirePermission('calls:read'), async (req, res) => {
  const r = tw.readiness();
  const s = await settings.getSettings();
  return ok(res, {
    voiceReady: r.ready,
    missing: r.missing,
    // Warnings are operational hints (non-HTTPS callback, validation disabled)
    // and are only worth showing to someone who could act on them.
    warnings: req.crmRole && req.crmRole.name === 'Admin' ? r.warnings : [],
    fromNumber: r.ready ? r.from : null,
    agentPhoneSet: Boolean(tw.toE164(req.crmUser.phone, s.defaultCountryCode)),
    recordingEnabled: tw.cfg().recordCalls,
    automatedCallingEnabled: Boolean(s.automatedCallingEnabled),
    callWindow: { start: s.callWindowStart, end: s.callWindowEnd },
  });
});

/**
 * GET /crm/api/calls/history?leadId=&contactId=
 * Every call ever placed to one person, newest first, including failed attempts
 * and retries. This is what the lead page renders.
 */
router.get('/history', requirePermission('calls:read'), async (req, res) => {
  const { leadId, contactId } = req.query;
  if (!leadId && !contactId) return bad(res, 'leadId or contactId is required');
  const filter = { ...scopeFilter(req) };
  if (leadId) filter.leadId = leadId;
  if (contactId) filter.contactId = contactId;
  return listOf(CrmCall, req, res, {
    filter,
    sort: { createdAt: -1 },
    populate: [{ path: 'ownerId', select: 'name' }],
  });
});

/**
 * GET /crm/api/calls/stats?from=&to=
 * Roll-up for the calls dashboard: volume, connect rate and talk time.
 */
router.get('/stats', requirePermission('calls:read'), async (req, res) => {
  const match = { ...scopeFilter(req) };
  if (req.query.from || req.query.to) {
    match.createdAt = {};
    if (req.query.from) match.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) match.createdAt.$lte = new Date(req.query.to);
  }
  const [byStatus] = await Promise.all([
    CrmCall.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalSec: { $sum: { $ifNull: ['$durationSec', 0] } },
        },
      },
    ]),
  ]);
  const total = byStatus.reduce((a, b) => a + b.count, 0);
  const completed = byStatus.find((b) => b._id === 'completed');
  return ok(res, {
    total,
    byStatus: byStatus.reduce((acc, b) => ({ ...acc, [b._id]: b.count }), {}),
    connected: completed ? completed.count : 0,
    connectRate: total ? Math.round(((completed ? completed.count : 0) / total) * 100) : 0,
    talkTimeSec: byStatus.reduce((a, b) => a + (b.totalSec || 0), 0),
  });
});

/**
 * POST /crm/api/calls/start
 * Dial a lead/contact immediately without pre-scheduling a call — this is the
 * "Call" button on the Leads module. Creates the CrmCall row and places the
 * Twilio call in one round trip.
 *
 * body: { leadId | contactId, mode?: 'bridge'|'auto', scriptId?, purpose?, notes? }
 */
router.post('/start', dialLimiter, requirePermission('calls:create'), async (req, res) => {
  const { leadId, contactId, dealId, mode = 'bridge', scriptId, purpose, notes } = req.body;
  if (!leadId && !contactId) return bad(res, 'leadId or contactId is required');
  if (!['bridge', 'auto'].includes(mode)) return bad(res, "mode must be 'bridge' or 'auto'");

  if (mode === 'auto') {
    const s = await settings.getSettings();
    if (!s.automatedCallingEnabled) {
      return bad(res, 'Automated calling is disabled. Enable it in CRM Settings first.', 409);
    }
    if (!scriptId) return bad(res, 'scriptId is required for an automated call');
  }

  // Without Twilio the honest answer is a tel: link, not a broken button.
  if (!tw.isVoiceReady()) {
    const target = await engine.resolveTarget({ leadId, contactId });
    if (!target.e164) return bad(res, 'No valid phone number on record');
    if (target.blocked) return bad(res, 'This person is marked Do Not Call', 409);
    return ok(res, { mode: 'manual', telLink: `tel:${target.e164}`, phone: target.e164 });
  }

  try {
    const call = await engine.startCall({
      leadId, contactId, dealId,
      ownerId: req.crmUser._id,
      agentUser: req.crmUser,
      mode, scriptId, purpose, notes,
    });
    await timeline.record({
      entity: leadId ? { kind: 'lead', id: leadId } : { kind: 'contact', id: contactId },
      type: 'call.started',
      title: mode === 'auto' ? 'Automated call started' : 'Click-to-call started — your phone is ringing',
      meta: { callId: call._id, callSid: call.providerCallSid },
      actor: { kind: 'user', userId: req.crmUser._id, label: req.crmUser.name },
    }).catch(() => {});
    return created(res, {
      mode: 'twilio',
      callId: call._id,
      sid: call.providerCallSid,
      status: call.status,
      to: call.toNumber,
    }, mode === 'auto' ? 'Automated call placed' : 'Calling your phone now — answer to be connected');
  } catch (err) {
    return failCall(res, err, 'start');
  }
});

/**
 * POST /crm/api/calls/bulk
 * Fire-and-forget bulk dialling. Creates a campaign so the work is throttled,
 * retried and observable rather than blasting N calls into Twilio at once.
 *
 * body: { name, leadIds[] | contactIds[], mode, scriptId?, startAt?, concurrency?, maxAttempts? }
 */
router.post('/bulk', requirePermission('calls:bulk'), async (req, res) => {
  const {
    name, leadIds = [], contactIds = [], mode = 'auto', scriptId,
    startAt, concurrency, maxAttempts, retryDelayMin, windowStart, windowEnd,
  } = req.body;
  if (!leadIds.length && !contactIds.length) return bad(res, 'leadIds or contactIds is required');

  const s = await settings.getSettings();
  if (mode === 'auto') {
    if (!s.automatedCallingEnabled) return bad(res, 'Automated calling is disabled. Enable it in CRM Settings first.', 409);
    if (!scriptId) return bad(res, 'scriptId is required for automated campaigns');
    const script = await CrmCallScript.findById(scriptId).lean();
    if (!script) return notFound(res, 'Call script');
  }
  if (!tw.isVoiceReady()) return bad(res, `Twilio Voice is not ready: missing ${tw.readiness().missing.join(', ')}`, 503);

  const MAX_TARGETS = Number(process.env.CRM_MAX_CAMPAIGN_TARGETS || 2000);
  if (leadIds.length + contactIds.length > MAX_TARGETS) {
    return bad(res, `A campaign may contain at most ${MAX_TARGETS} targets`);
  }

  // Resolve and validate every target up front: a campaign that discovers half
  // its numbers are unusable an hour in is far harder to reason about.
  const targets = [];
  const skipped = [];
  for (const leadId of leadIds) {
    const t = await engine.resolveTarget({ leadId });
    if (!t.e164) { skipped.push({ leadId, reason: 'no valid phone number' }); continue; }
    if (t.blocked) { skipped.push({ leadId, reason: 'do not call' }); continue; }
    if (t.deleted) { skipped.push({ leadId, reason: 'deleted' }); continue; }
    targets.push({ leadId, phone: t.e164, status: 'pending' });
  }
  for (const contactId of contactIds) {
    const t = await engine.resolveTarget({ contactId });
    if (!t.e164) { skipped.push({ contactId, reason: 'no valid phone number' }); continue; }
    if (t.blocked) { skipped.push({ contactId, reason: 'do not call' }); continue; }
    targets.push({ contactId, phone: t.e164, status: 'pending' });
  }
  if (!targets.length) return bad(res, 'None of the selected records have a callable phone number');

  const when = startAt ? new Date(startAt) : new Date();
  const campaign = await CrmCallCampaign.create({
    name: name || `Bulk call ${new Date().toISOString().slice(0, 16)}`,
    mode,
    scriptId: mode === 'auto' ? scriptId : undefined,
    ownerId: req.crmUser._id,
    createdBy: req.crmUser._id,
    targets,
    status: when > new Date() ? 'scheduled' : 'running',
    startAt: when,
    startedAt: when > new Date() ? undefined : new Date(),
    // A bridged campaign rings the owning agent for every target. More than one
    // at a time means their phone rings again while they are mid-conversation,
    // so concurrency is meaningful only for automated campaigns.
    concurrency: mode === 'bridge'
      ? 1
      : Math.min(Number(concurrency) || 1, Number(process.env.TWILIO_MAX_CONCURRENCY || 5)),
    maxAttempts: Number(maxAttempts) || 2,
    retryDelayMin: Number(retryDelayMin) || 60,
    windowStart: windowStart || s.callWindowStart,
    windowEnd: windowEnd || s.callWindowEnd,
    stats: { total: targets.length, dialed: 0, completed: 0, failed: 0, answered: 0, machine: 0 },
  });

  await jobs.schedule('campaign:run', when, { campaignId: String(campaign._id) }, {
    dedupeKey: `campaign:run:${campaign._id}`,
  });

  return created(res, { campaign, skipped }, `Campaign queued with ${targets.length} target(s)${skipped.length ? `, ${skipped.length} skipped` : ''}`);
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

/**
 * POST /crm/api/calls/:id/dial — click-to-call on an already-scheduled call.
 *
 * Without Twilio configured this returns a tel: link so the agent dials from
 * their own handset (the free mode). With Twilio it rings the agent first, then
 * bridges to the lead, recording and logging the whole thing.
 */
router.post('/:id/dial', dialLimiter, requirePermission('calls:update'), async (req, res) => {
  // scopeFilter matters here specifically: without it a Sales Agent could dial
  // a call owned by another agent, and the resulting conversation would be
  // logged against someone else's lead.
  const call = await CrmCall.findOne({ _id: req.params.id, ...scopeFilter(req) })
    .populate('leadId', 'name phone doNotCall')
    .populate('contactId', 'firstName phone doNotCall dnd');
  if (!call) return notFound(res, 'Call');
  const person = call.leadId || call.contactId;
  const s = await settings.getSettings();
  const toNumber = tw.toE164(person && person.phone, s.defaultCountryCode);
  if (!toNumber) return bad(res, 'No valid phone number on record');
  if (person && (person.doNotCall || person.dnd)) return bad(res, 'This person is marked Do Not Call', 409);

  if (!tw.isVoiceReady()) {
    // FREE mode: the agent dials from their own phone.
    return ok(res, { mode: 'manual', telLink: `tel:${toNumber}`, phone: toNumber });
  }

  call.toNumber = toNumber;
  try {
    await engine.dialBridge({ call, agentUser: req.crmUser });
    return ok(res, {
      mode: 'twilio',
      callId: call._id,
      sid: call.providerCallSid,
      status: call.status,
      to: call.toNumber,
    });
  } catch (err) {
    return failCall(res, err, 'dial');
  }
});

/**
 * POST /crm/api/calls/:id/hangup — end a call that is still ringing or live.
 * Also used by the UI's "Cancel" button on an in-flight click-to-call.
 */
router.post('/:id/hangup', requirePermission('calls:update'), async (req, res) => {
  const call = await CrmCall.findOne({ _id: req.params.id, ...scopeFilter(req) });
  if (!call) return notFound(res, 'Call');
  if (!call.providerCallSid) return bad(res, 'This call was not placed through Twilio');
  try {
    await tw.endCall(call.providerCallSid);
    // Leave the final status to the webhook — Twilio is the source of truth for
    // whether the call had already connected when we asked it to stop.
    return ok(res, { callId: call._id, requested: true });
  } catch (err) {
    return failCall(res, err, 'hangup');
  }
});

/**
 * POST /crm/api/calls/:id/retry — dial a failed call again.
 * body: { now?: boolean, delayMin?: number }
 * `now: true` places the call immediately; otherwise it is queued.
 */
router.post('/:id/retry', dialLimiter, requirePermission('calls:create'), async (req, res) => {
  const call = await CrmCall.findOne({ _id: req.params.id, ...scopeFilter(req) });
  if (!call) return notFound(res, 'Call');
  if (!['no_answer', 'busy', 'failed', 'cancelled', 'missed'].includes(call.status)) {
    return bad(res, 'Only a failed or unanswered call can be retried');
  }
  if (!tw.isVoiceReady()) return bad(res, `Twilio Voice is not ready: missing ${tw.readiness().missing.join(', ')}`, 503);

  if (req.body.now) {
    try {
      const fresh = await engine.startCall({
        leadId: call.leadId,
        contactId: call.contactId,
        dealId: call.dealId,
        ownerId: call.ownerId || req.crmUser._id,
        agentUser: req.crmUser,
        mode: call.mode === 'auto' ? 'auto' : 'bridge',
        scriptId: call.scriptId,
        purpose: call.purpose,
        notes: call.notes,
        attemptNo: (call.attemptNo || 1) + 1,
        retryOfId: call._id,
      });
      return created(res, { callId: fresh._id, sid: fresh.providerCallSid, status: fresh.status }, 'Retrying now');
    } catch (err) {
      return failCall(res, err, 'retry');
    }
  }

  // `force` because the operator explicitly asked — skip the "is this worth
  // retrying" heuristics that the automatic path applies.
  const retry = await engine.scheduleRetry(call, {
    force: true,
    delayMin: Number(req.body.delayMin) || undefined,
  });
  if (!retry) return bad(res, 'Retry could not be scheduled');
  return created(res, retry, `Retry scheduled for ${retry.scheduledAt.toISOString()}`);
});

/**
 * GET /crm/api/calls/:id/recording — stream the recording through the API.
 *
 * Twilio's recording URLs need HTTP basic auth, so they cannot be handed to an
 * <audio> tag directly. Proxying keeps the account credentials on the server
 * and puts recording access behind the normal CRM permission check.
 */
router.get('/:id/recording', requirePermission('calls:recordings'), async (req, res) => {
  const call = await CrmCall.findOne({ _id: req.params.id, ...scopeFilter(req) }).lean();
  if (!call) return notFound(res, 'Call');
  if (!call.recordingSid) return notFound(res, 'Recording');
  try {
    const upstream = await tw.fetchRecordingStream(call.recordingSid);
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'private, max-age=3600');
    res.set('Content-Disposition', `inline; filename="call-${call._id}.mp3"`);
    if (upstream.headers.get('content-length')) {
      res.set('Content-Length', upstream.headers.get('content-length'));
    }
    // Stream rather than buffer: recordings run to tens of megabytes and the
    // API process should not hold one in memory per listener.
    const { Readable } = require('stream');
    return Readable.fromWeb(upstream.body).pipe(res);
  } catch (err) {
    logger.error(`Recording proxy failed for call ${call._id}: ${err.message}`);
    return bad(res, 'Recording is not available', 502);
  }
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
  await jobs.cancelByKey(`call:auto-dial:${call._id}`);
  // Customer audio should not outlive the record that justified keeping it —
  // deleting the row without the recording leaves orphaned PII in Twilio.
  if (call.recordingSid) tw.deleteRecording(call.recordingSid).catch(() => {});
  return ok(res, null);
});

/* ══ Call scripts (automated calling) ═══════════════════════════════════════
 * Editable by anyone who can create calls; what the robot says is business
 * copy, not configuration. */

router.get('/scripts/list', requirePermission('calls:read'), (req, res) =>
  listOf(CrmCallScript, req, res, { filter: {}, searchFields: ['name'], sort: { createdAt: -1 } }));

router.post('/scripts', requirePermission('calls:create'), async (req, res) => {
  const { name, steps, language, voice, voicemailText, description } = req.body;
  if (!name) return bad(res, 'name is required');
  if (!Array.isArray(steps) || !steps.length) return bad(res, 'steps must be a non-empty array');
  const VALID = ['say', 'play', 'gather', 'record', 'dial', 'hangup'];
  for (const s of steps) {
    if (!VALID.includes(s.kind)) return bad(res, `Invalid step kind: ${s.kind}`);
    if (s.kind === 'say' && !s.text) return bad(res, 'A "say" step needs text');
    if (s.kind === 'gather' && !s.text) return bad(res, 'A "gather" step needs a prompt');
    if (s.kind === 'dial' && !tw.toE164(s.transferTo)) return bad(res, 'A "dial" step needs a valid transferTo number');
  }
  const script = await CrmCallScript.create({
    name, steps, language, voice, voicemailText, description, createdBy: req.crmUser._id,
  });
  return created(res, script, 'Script created');
});

router.put('/scripts/:id', requirePermission('calls:update'), async (req, res) => {
  const script = await CrmCallScript.findById(req.params.id);
  if (!script) return notFound(res, 'Script');
  for (const f of ['name', 'description', 'steps', 'language', 'voice', 'voicemailText', 'isActive']) {
    if (req.body[f] !== undefined) script[f] = req.body[f];
  }
  await script.save();
  return ok(res, script);
});

router.delete('/scripts/:id', requirePermission('calls:delete'), async (req, res) => {
  const inUse = await CrmCallCampaign.countDocuments({
    scriptId: req.params.id, status: { $in: ['scheduled', 'running', 'paused'] },
  });
  if (inUse) return bad(res, 'This script is used by an active campaign');
  const script = await CrmCallScript.findByIdAndDelete(req.params.id);
  if (!script) return notFound(res, 'Script');
  return ok(res, null);
});

/* ══ Campaigns (bulk + scheduled outbound) ══════════════════════════════════ */

router.get('/campaigns/list', requirePermission('calls:read'), (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = { $in: String(req.query.status).split(',') };
  return listOf(CrmCallCampaign, req, res, {
    filter,
    searchFields: ['name'],
    sort: { createdAt: -1 },
    populate: [{ path: 'ownerId', select: 'name' }, { path: 'scriptId', select: 'name' }],
  });
});

router.get('/campaigns/:id', requirePermission('calls:read'), async (req, res) => {
  const camp = await CrmCallCampaign.findById(req.params.id)
    .populate('ownerId', 'name')
    .populate('scriptId', 'name')
    .populate('targets.leadId', 'name phone')
    .populate('targets.contactId', 'firstName lastName phone')
    .lean();
  if (!camp) return notFound(res, 'Campaign');
  return ok(res, camp);
});

/** Pause / resume / cancel. Cancelling also hangs up anything still in flight. */
router.patch('/campaigns/:id/:action', requirePermission('calls:bulk'), async (req, res) => {
  const { action } = req.params;
  if (!['pause', 'resume', 'cancel'].includes(action)) return bad(res, 'Unknown action');
  const camp = await CrmCallCampaign.findById(req.params.id);
  if (!camp) return notFound(res, 'Campaign');

  if (action === 'pause') {
    if (!['running', 'scheduled'].includes(camp.status)) return bad(res, 'Campaign is not running');
    camp.status = 'paused';
    await jobs.cancelByKey(`campaign:run:${camp._id}`);
  } else if (action === 'resume') {
    if (camp.status !== 'paused') return bad(res, 'Campaign is not paused');
    camp.status = 'running';
    if (!camp.startedAt) camp.startedAt = new Date();
    await jobs.schedule('campaign:run', new Date(), { campaignId: String(camp._id) }, {
      dedupeKey: `campaign:run:${camp._id}`,
    });
  } else {
    camp.status = 'cancelled';
    camp.finishedAt = new Date();
    await jobs.cancelByKey(`campaign:run:${camp._id}`);
    const live = await CrmCall.find({
      campaignId: camp._id,
      status: { $in: ['queued', 'initiated', 'ringing', 'in_progress'] },
    }).select('providerCallSid').lean();
    for (const c of live) {
      if (c.providerCallSid) tw.endCall(c.providerCallSid).catch(() => {});
    }
    for (const t of camp.targets) if (t.status === 'pending') t.status = 'skipped';
  }
  await camp.save();
  return ok(res, camp);
});

module.exports = router;
