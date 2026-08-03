'use strict';

/**
 * Registers all CRM job handlers + repeatable jobs and starts the Mongo
 * scheduler. Called once from server.js at boot.
 */

const jobs = require('./jobs');
const messaging = require('./messaging');
const automation = require('./automation');
const notify = require('./notify');
const timeline = require('./timeline');
const settings = require('./settings');
const twilioVoice = require('./twilioVoice');
const callEngine = require('./callEngine');
const {
  CrmCall, CrmFollowUp, CrmTask, CrmLead, CrmUser, CrmSetting,
} = require('../models');
const mailer = require('../../services/mailer');
const logger = require('../../utils/logger');

const init = () => {
  /* ── one-off job handlers ─────────────────────────────────────────────── */

  jobs.define('message:send', messaging.deliver);

  /**
   * Pull in customer replies the inbound webhook never delivered.
   *
   * The webhook remains the fast path — this only catches what it missed, and
   * recordInbound dedupes on the Twilio SID so the two never double up. It is
   * what keeps the inbox correct when the sandbox URL is unset, when a tunnel
   * URL has changed, or during any webhook outage.
   */
  jobs.define('messages:reconcile', async () => {
    const { checked, imported } = await messaging.reconcileInboundWhatsapp();
    if (imported) logger.warn(`Inbound reconcile: recovered ${imported} of ${checked} replies missed by the webhook.`);
  });
  jobs.define('automation:event', automation.handleEvent);
  jobs.define('automation:actions', automation.resumeActions);

  jobs.define('call:reminder', async ({ callId }) => {
    const call = await CrmCall.findById(callId).populate('leadId', 'name').populate('contactId', 'firstName').lean();
    if (!call || call.status !== 'scheduled' || !call.ownerId) return;
    const who = (call.leadId && call.leadId.name) || (call.contactId && call.contactId.firstName) || 'lead';
    await notify.notify(call.ownerId, {
      type: 'call.reminder',
      title: `Call with ${who} at ${new Date(call.scheduledAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}`,
      entity: call.leadId ? { kind: 'lead', id: call.leadId._id } : { kind: 'contact', id: call.contactId && call.contactId._id },
    });
  });

  /* ── Voice ────────────────────────────────────────────────────────────── */

  // Places a call that was queued earlier: a scheduled retry, an automation
  // action, or a campaign target. Runs on the scheduler rather than in the
  // request so a failure retries with backoff instead of 500-ing an agent.
  jobs.define('call:auto-dial', async ({ callId }) => {
    const call = await CrmCall.findById(callId);
    if (!call) return;
    // The lead may have been reached, cancelled or deleted while this waited.
    if (!['scheduled', 'queued'].includes(call.status)) {
      logger.info(`Skipping auto-dial for call ${callId}: status is ${call.status}`);
      return;
    }
    if (!twilioVoice.isVoiceReady()) {
      logger.warn(`Skipping auto-dial for call ${callId}: Twilio Voice is not configured`);
      return;
    }
    // Never wake someone at 3am because a retry timer happened to fire then.
    if (!(await callEngine.isWithinWindow())) {
      const at = await callEngine.nextWindowOpening();
      await jobs.schedule('call:auto-dial', at, { callId: String(call._id) }, {
        dedupeKey: `call:auto-dial:${call._id}`,
      });
      return;
    }
    const owner = call.ownerId ? await CrmUser.findById(call.ownerId) : null;
    await callEngine.startCall({
      leadId: call.leadId,
      contactId: call.contactId,
      dealId: call.dealId,
      ownerId: call.ownerId,
      agentUser: owner,
      mode: call.mode === 'auto' ? 'auto' : 'bridge',
      scriptId: call.scriptId,
      campaignId: call.campaignId,
      attemptNo: call.attemptNo,
      retryOfId: call.retryOfId,
      existingCall: call,
    });
  });

  // Advances one campaign by up to `concurrency` calls, then re-arms itself.
  jobs.define('campaign:run', async ({ campaignId }) => {
    await callEngine.runCampaign(campaignId);
  });

  /**
   * Reconciles calls that Twilio never sent a terminal callback for — a dropped
   * webhook, a deploy mid-call, or a network blip would otherwise leave a row
   * stuck at "ringing" forever and hold a campaign slot open.
   */
  jobs.define('calls:reconcile', async () => {
    if (!twilioVoice.isVoiceReady()) return;
    const stuck = await CrmCall.find({
      provider: 'twilio',
      providerCallSid: { $nin: [null, ''] },
      status: { $in: ['queued', 'initiated', 'ringing', 'in_progress'] },
      // Twilio caps a call at TWILIO_MAX_CALL_SEC; anything older than an hour
      // beyond that is definitely over.
      updatedAt: { $lt: new Date(Date.now() - 15 * 60e3) },
    }).limit(25);

    for (const call of stuck) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const remote = await twilioVoice.fetchCall(call.providerCallSid);
        const mapped = twilioVoice.mapStatus(remote.status);
        if (!mapped || !twilioVoice.TERMINAL_STATUSES.has(mapped)) continue;
        call.status = mapped;
        call.endedAt = remote.endTime || new Date();
        call.durationSec = Number(remote.duration) || call.durationSec || 0;
        if (remote.answeredBy) call.answeredBy = remote.answeredBy;
        // eslint-disable-next-line no-await-in-loop
        await call.save();
        logger.warn(`Reconciled call ${call._id} to "${mapped}" — no webhook was received. Check API_PUBLIC_URL reachability.`);
        // eslint-disable-next-line no-await-in-loop
        await callEngine.finalizeCall(call);
      } catch (err) {
        logger.error(`Call reconcile failed for ${call._id}: ${err.message}`);
      }
    }
  });

  jobs.define('followup:reminder', async ({ followUpId }) => {
    const fu = await CrmFollowUp.findById(followUpId).populate('leadId', 'name').populate('contactId', 'firstName').lean();
    if (!fu || fu.status !== 'pending') return;
    const who = (fu.leadId && fu.leadId.name) || (fu.contactId && fu.contactId.firstName) || '';
    await notify.notify(fu.ownerId, {
      type: 'followup.due',
      title: `Follow-up due${who ? `: ${who}` : ''}`,
      body: fu.note || '',
      entity: fu.leadId ? { kind: 'lead', id: fu.leadId._id } : (fu.contactId ? { kind: 'contact', id: fu.contactId._id } : undefined),
    });
  });

  jobs.define('task:reminder', async ({ taskId }) => {
    const task = await CrmTask.findById(taskId).lean();
    if (!task || !['open', 'in_progress'].includes(task.status)) return;
    await notify.notify(task.assigneeId, {
      type: 'task.reminder',
      title: `Task due soon: ${task.title}`,
      entity: task.leadId ? { kind: 'lead', id: task.leadId } : undefined,
    });
  });

  /* ── repeatable scans ─────────────────────────────────────────────────── */

  // Overdue follow-up escalation (every 30 min).
  jobs.define('followups:escalate', async () => {
    const s = await settings.getSettings();
    const cutoff = new Date(Date.now() - (s.followupEscalateHours || 4) * 36e5);
    const overdue = await CrmFollowUp.find({
      status: 'pending', dueAt: { $lt: cutoff }, escalatedAt: null,
    }).limit(50);
    for (const fu of overdue) {
      fu.escalatedAt = new Date();
      await fu.save();
      await notify.notify(fu.ownerId, {
        type: 'followup.overdue',
        title: 'Follow-up is overdue',
        body: fu.note || '',
        entity: fu.leadId ? { kind: 'lead', id: fu.leadId } : undefined,
      });
      await notify.notifyRole(['Manager', 'Admin'], {
        type: 'followup.overdue',
        title: 'A follow-up crossed the escalation window',
        entity: fu.leadId ? { kind: 'lead', id: fu.leadId } : undefined,
      });
    }
  });

  // Idle lead scan (hourly) → emits lead.idle for automations.
  jobs.define('leads:idle-scan', async () => {
    const s = await settings.getSettings();
    const cutoff = new Date(Date.now() - (s.idleLeadDays || 7) * 24 * 36e5);
    const idle = await CrmLead.find({
      deletedAt: null,
      status: { $in: ['new', 'contacted', 'qualified'] },
      lastActivityAt: { $lt: cutoff },
      $or: [{ idleNotifiedAt: null }, { idleNotifiedAt: { $lt: cutoff } }],
    }).limit(50);
    for (const lead of idle) {
      lead.idleNotifiedAt = new Date();
      await lead.save();
      await automation.emitEvent('lead.idle', {
        entityKind: 'lead', entityId: lead._id, data: { idleDays: s.idleLeadDays },
      });
      if (lead.ownerId) {
        await notify.notify(lead.ownerId, {
          type: 'lead.idle',
          title: `Lead idle for ${s.idleLeadDays}+ days: ${lead.name}`,
          entity: { kind: 'lead', id: lead._id },
        });
      }
    }
  });

  // Missed calls + overdue tasks (hourly).
  jobs.define('calls:missed-scan', async () => {
    const stale = await CrmCall.find({
      status: 'scheduled', scheduledAt: { $lt: new Date(Date.now() - 2 * 36e5) },
    }).limit(50);
    for (const call of stale) {
      call.status = 'missed';
      await call.save();
      if (call.ownerId) {
        await notify.notify(call.ownerId, {
          type: 'call.missed',
          title: 'A scheduled call was not logged (marked missed)',
          entity: call.leadId ? { kind: 'lead', id: call.leadId } : undefined,
        });
      }
    }
    const overdueTasks = await CrmTask.find({
      status: { $in: ['open', 'in_progress'] },
      dueAt: { $lt: new Date() },
      overdueNotifiedAt: null,
    }).limit(50);
    for (const task of overdueTasks) {
      task.overdueNotifiedAt = new Date();
      await task.save();
      await notify.notify(task.assigneeId, {
        type: 'task.overdue',
        title: `Task overdue: ${task.title}`,
        entity: task.leadId ? { kind: 'lead', id: task.leadId } : undefined,
      });
    }
  });

  // Daily agent digest email — runs hourly, fires once per day at ~08:30 IST.
  jobs.define('digest:daily', async () => {
    const s = await settings.getSettings();
    const nowIst = new Intl.DateTimeFormat('en-GB', {
      timeZone: s.timezone, hour: '2-digit', hour12: false,
    }).format(new Date());
    if (Number(nowIst) < 8) return;
    const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: s.timezone }).format(new Date());
    const marker = await CrmSetting.findOne({ key: 'lastDigestDate' }).lean();
    if (marker && marker.value === todayKey) return;
    await CrmSetting.findOneAndUpdate({ key: 'lastDigestDate' }, { $set: { value: todayKey } }, { upsert: true });

    if (!mailer.isConfigured()) return;
    const users = await CrmUser.find({ isActive: true }).lean();
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
    for (const user of users) {
      const [calls, followups, tasks] = await Promise.all([
        CrmCall.countDocuments({ ownerId: user._id, status: 'scheduled', scheduledAt: { $lte: endOfDay } }),
        CrmFollowUp.countDocuments({ ownerId: user._id, status: 'pending', dueAt: { $lte: endOfDay } }),
        CrmTask.countDocuments({ assigneeId: user._id, status: { $in: ['open', 'in_progress'] }, dueAt: { $lte: endOfDay } }),
      ]);
      if (!calls && !followups && !tasks) continue;
      mailer.sendMail({
        to: user.email,
        subject: `[Cocoma CRM] Your day: ${calls} calls, ${followups} follow-ups, ${tasks} tasks`,
        html: `<p>Good morning ${user.name},</p>
               <ul>
                 <li><b>${calls}</b> call(s) scheduled today</li>
                 <li><b>${followups}</b> follow-up(s) due</li>
                 <li><b>${tasks}</b> task(s) due</li>
               </ul>
               <p>Open the CRM to see details.</p>`,
      }).catch(() => {});
    }
  });

  /* ── start ────────────────────────────────────────────────────────────── */

  jobs.start();

  // Repeatable registration writes to Mongo, but init() runs from the listen
  // callback while connectDB() is still in flight — so every boot logged
  // "Client must be connected before running operations" and the periodic scans
  // (escalation, idle leads, stuck-call reconcile) never registered at all.
  // Waiting for the connection is what makes them actually start.
  const mongoose = require('mongoose');
  const whenConnected = mongoose.connection.readyState === 1
    ? Promise.resolve()
    : new Promise((resolve) => mongoose.connection.once('connected', resolve));

  whenConnected.then(() => Promise.all([
    jobs.every('followups:escalate', 30 * 60e3),
    jobs.every('leads:idle-scan', 60 * 60e3),
    jobs.every('calls:missed-scan', 60 * 60e3),
    jobs.every('digest:daily', 60 * 60e3),
    // Frequent, because a stuck call blocks a campaign slot and shows the agent
    // a call that looks live when it ended twenty minutes ago.
    jobs.every('calls:reconcile', 10 * 60e3),
    // Frequent: this is the only thing standing between a broken webhook and a
    // customer reply nobody ever sees. One Twilio API call per run.
    jobs.every('messages:reconcile', Number(process.env.WHATSAPP_RECONCILE_MS) || 30e3),
  ]))
    .then(() => logger.info('CRM workers: repeatable jobs registered.'))
    .catch((err) => logger.error(`CRM repeatable registration failed: ${err.message}`));

  const voice = twilioVoice.readiness();
  if (voice.ready) {
    logger.info(`CRM voice: Twilio ready (from ${voice.from}, callbacks → ${voice.publicUrl}).`);
  } else {
    logger.warn(`CRM voice: Twilio NOT ready — missing ${voice.missing.join(', ')}. Calls fall back to tel: links.`);
  }
  for (const w of voice.warnings) logger.warn(`CRM voice: ${w}`);

  logger.info('CRM workers: handlers registered.');
};

module.exports = { init };
