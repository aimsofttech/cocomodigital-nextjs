'use strict';

/**
 * Automation engine: Trigger event → Conditions → Actions.
 *
 * Events are queued through the Mongo scheduler; each active rule matching an
 * event is evaluated and its actions run sequentially. A 'wait' action stores
 * the remaining actions and resumes later via a delayed job — this is how
 * drip sequences work without Redis.
 *
 * Safety: max chain depth 3 (automation-triggered events can't loop forever),
 * per-entity daily action cap, and a full audit trail in crm_automation_runs.
 */

const {
  CrmAutomationRule, CrmAutomationRun, CrmLead, CrmContact, CrmDeal, CrmUser,
  CrmTask, CrmFollowUp, CrmCall, CrmRole,
} = require('../models');
const jobs = require('./jobs');
const timeline = require('./timeline');
const notify = require('./notify');
const settings = require('./settings');
const logger = require('../../utils/logger');

const MAX_DEPTH = 3;

/* ── event emission ─────────────────────────────────────────────────────── */

/**
 * @param {string} event e.g. 'lead.created'
 * @param {{entityKind:string, entityId:any, data?:object, depth?:number}} payload
 */
const emitEvent = async (event, payload) => {
  try {
    await jobs.schedule('automation:event', new Date(), {
      event,
      entityKind: payload.entityKind,
      entityId: String(payload.entityId),
      data: payload.data || {},
      depth: payload.depth || 0,
    }, { maxAttempts: 1 });
  } catch (err) {
    logger.error(`CRM emitEvent(${event}) failed: ${err.message}`);
  }
};

/* ── context + conditions ───────────────────────────────────────────────── */

const get = (obj, path) =>
  String(path).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

const buildContext = async (entityKind, entityId, eventData) => {
  const ctx = { event: eventData || {}, hoursSince: {}, counts: {} };
  if (entityKind === 'lead') ctx.lead = await CrmLead.findById(entityId).lean();
  if (entityKind === 'contact') ctx.contact = await CrmContact.findById(entityId).lean();
  if (entityKind === 'deal') {
    ctx.deal = await CrmDeal.findById(entityId).lean();
    if (ctx.deal && ctx.deal.contactId) ctx.contact = await CrmContact.findById(ctx.deal.contactId).lean();
    if (ctx.deal && ctx.deal.leadId) ctx.lead = await CrmLead.findById(ctx.deal.leadId).lean();
  }
  const person = ctx.lead || ctx.contact;
  if (person && person.lastActivityAt) {
    ctx.hoursSince.lastActivityAt = (Date.now() - new Date(person.lastActivityAt).getTime()) / 36e5;
  }
  if (ctx.lead) ctx.counts.callAttempts = ctx.lead.callAttempts || 0;
  return ctx;
};

const OPS = {
  eq: (a, b) => String(a) === String(b),
  ne: (a, b) => String(a) !== String(b),
  in: (a, b) => [].concat(b).map(String).includes(String(a)),
  nin: (a, b) => ![].concat(b).map(String).includes(String(a)),
  gt: (a, b) => Number(a) > Number(b),
  gte: (a, b) => Number(a) >= Number(b),
  lt: (a, b) => Number(a) < Number(b),
  lte: (a, b) => Number(a) <= Number(b),
  contains: (a, b) => Array.isArray(a) ? a.map(String).includes(String(b)) : String(a || '').includes(String(b)),
  exists: (a, b) => (b === false ? a === undefined || a === null : a !== undefined && a !== null),
};

const evalConditions = (conditions, ctx) => {
  for (const c of conditions || []) {
    if (!c || !c.field || !c.op) continue;
    const fn = OPS[c.op];
    if (!fn) return false;
    if (!fn(get(ctx, c.field), c.value)) return false;
  }
  return true;
};

/* ── trigger config matching ────────────────────────────────────────────── */

const matchesTriggerConfig = (rule, eventData) => {
  const cfg = (rule.trigger && rule.trigger.config) || {};
  if (rule.trigger.event === 'lead.status_changed') {
    if (cfg.from && String(cfg.from) !== String(eventData.from)) return false;
    if (cfg.to && String(cfg.to) !== String(eventData.to)) return false;
  }
  if (rule.trigger.event === 'deal.stage_changed') {
    if (cfg.to && String(cfg.to) !== String(eventData.to)) return false;
  }
  if (rule.trigger.event === 'message.failed' || rule.trigger.event === 'message.replied') {
    if (cfg.channel && String(cfg.channel) !== String(eventData.channel)) return false;
  }
  return true;
};

/* ── event handler (job worker) ─────────────────────────────────────────── */

const handleEvent = async ({ event, entityKind, entityId, data, depth }) => {
  if ((depth || 0) > MAX_DEPTH) return;
  const rules = await CrmAutomationRule.find({ isActive: true, 'trigger.event': event }).lean();
  if (!rules.length) return;

  const s = await settings.getSettings();
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const todayRuns = await CrmAutomationRun.countDocuments({
    'entity.id': entityId, createdAt: { $gte: startOfDay },
  });
  if (todayRuns >= (s.automationDailyCapPerEntity || 10)) {
    logger.warn(`CRM automation: daily cap reached for ${entityKind} ${entityId}`);
    return;
  }

  const ctx = await buildContext(entityKind, entityId, data);
  for (const rule of rules) {
    try {
      if (!matchesTriggerConfig(rule, data || {})) continue;

      // Idempotency: skip if this rule already ran for this entity+event recently.
      const dup = await CrmAutomationRun.findOne({
        ruleId: rule._id,
        'entity.id': entityId,
        triggerEvent: event,
        createdAt: { $gte: new Date(Date.now() - 60e3) },
      }).lean();
      if (dup) continue;

      const run = await CrmAutomationRun.create({
        ruleId: rule._id,
        ruleName: rule.name,
        triggerEvent: event,
        eventData: data,
        entity: { kind: entityKind, id: entityId },
        status: 'running',
        depth: depth || 0,
        steps: [],
      });

      if (!evalConditions(rule.conditions, ctx)) {
        run.status = 'skipped';
        run.skippedReason = 'Conditions not met';
        await run.save();
        continue;
      }

      await CrmAutomationRule.updateOne(
        { _id: rule._id },
        { $set: { lastRunAt: new Date() }, $inc: { runCount: 1 } }
      );
      await executeActions(run._id, rule.actions || [], 0, { entityKind, entityId, depth: depth || 0 });
    } catch (err) {
      logger.error(`CRM automation rule "${rule.name}" failed: ${err.message}`);
    }
  }
};

/* ── action execution ───────────────────────────────────────────────────── */

const executeActions = async (runId, actions, startIdx, meta) => {
  const run = await CrmAutomationRun.findById(runId);
  if (!run) return;
  const rule = await CrmAutomationRule.findById(run.ruleId).lean();
  if (!rule || !rule.isActive) {
    run.status = 'skipped';
    run.skippedReason = 'Rule deactivated';
    return run.save();
  }

  const ctx = await buildContext(meta.entityKind, meta.entityId, run.eventData);

  for (let i = startIdx; i < actions.length; i++) {
    const action = actions[i];
    try {
      if (action.type === 'wait') {
        const cfg = action.config || {};
        const ms = ((cfg.days || 0) * 24 * 60 + (cfg.hours || 0) * 60 + (cfg.minutes || 0)) * 60e3;
        run.steps.push({ actionType: 'wait', status: 'waiting', at: new Date(), output: { resumeInMs: ms } });
        run.status = 'waiting';
        await run.save();
        await jobs.schedule('automation:actions', new Date(Date.now() + Math.max(ms, 60e3)), {
          runId: String(run._id),
          actions: actions.slice(i + 1),
          entityKind: meta.entityKind,
          entityId: meta.entityId,
          depth: meta.depth,
        }, { maxAttempts: 1 });
        return;
      }
      const output = await runAction(action, ctx, meta, run);
      run.steps.push({ actionType: action.type, status: 'ok', output, at: new Date() });
    } catch (err) {
      run.steps.push({ actionType: action.type, status: 'failed', error: err.message, at: new Date() });
      logger.error(`CRM automation action ${action.type} failed: ${err.message}`);
    }
  }
  run.status = run.steps.some((st) => st.status === 'failed') ? 'failed' : 'completed';
  await run.save();
  if (run.status === 'failed') {
    notify.notifyRole(['Admin'], {
      type: 'automation.failed',
      title: `Automation "${run.ruleName}" had failing steps`,
      entity: run.entity,
    }).catch(() => {});
  }
};

/** Resume actions after a 'wait' (job worker). */
const resumeActions = async ({ runId, actions, entityKind, entityId, depth }) => {
  await executeActions(runId, actions || [], 0, { entityKind, entityId, depth: depth || 0 });
};

/* ── individual actions ─────────────────────────────────────────────────── */

const pickAssignee = async (strategy) => {
  if (strategy && strategy.startsWith('fixed:')) return strategy.slice(6);
  const agentRole = await CrmRole.findOne({ name: 'Sales Agent' }).lean();
  const roleIds = agentRole ? [agentRole._id] : [];
  const users = await CrmUser.find(
    roleIds.length ? { roleId: { $in: roleIds }, isActive: true } : { isActive: true }
  ).select('_id').sort({ createdAt: 1 }).lean();
  if (!users.length) {
    const anyone = await CrmUser.findOne({ isActive: true }).select('_id').lean();
    return anyone && anyone._id;
  }
  if (strategy === 'load_balanced') {
    let best = null; let bestCount = Infinity;
    for (const u of users) {
      const count = await CrmLead.countDocuments({
        ownerId: u._id, status: { $nin: ['won', 'lost', 'junk'] }, deletedAt: null,
      });
      if (count < bestCount) { best = u._id; bestCount = count; }
    }
    return best;
  }
  // round_robin: rotate on a settings counter
  const s = await settings.getSettings();
  const idx = (s.rrCounter || 0) % users.length;
  await settings.updateSettings({ rrCounter: (s.rrCounter || 0) + 1 });
  return users[idx]._id;
};

const runAction = async (action, ctx, meta, run) => {
  const cfg = action.config || {};
  const messaging = require('./messaging');
  const lead = ctx.lead;
  const contact = ctx.contact;
  const person = lead || contact;
  const personRef = lead ? { leadId: lead._id } : (contact ? { contactId: contact._id } : {});
  const entity = { kind: meta.entityKind, id: meta.entityId };
  const ownerId = person && person.ownerId;

  switch (action.type) {
    case 'send_email':
    case 'send_whatsapp':
    case 'send_sms': {
      const channel = action.type.replace('send_', '');
      const msg = await messaging.sendMessage({
        channel,
        ...personRef,
        templateId: cfg.templateId,
        subject: cfg.subject,
        body: cfg.body,
        automationRunId: run._id,
      });
      return { messageId: msg._id };
    }

    case 'schedule_call': {
      const at = cfg.at ? new Date(cfg.at)
        : new Date(Date.now() + (cfg.offsetMinutes || 60) * 60e3);
      const call = await CrmCall.create({
        ...personRef,
        ownerId: cfg.assigneeId || ownerId || (await pickAssignee('round_robin')),
        purpose: cfg.purpose || 'follow_up',
        scheduledAt: at,
        reminderMinutesBefore: cfg.reminderMinutesBefore || 15,
        status: 'scheduled',
        createdByAutomation: true,
        notes: cfg.notes,
      });
      await jobs.schedule('call:reminder',
        new Date(at.getTime() - (call.reminderMinutesBefore) * 60e3),
        { callId: String(call._id) }, { dedupeKey: `call:reminder:${call._id}` });
      await timeline.record({
        entity, type: 'call.scheduled',
        title: `Call auto-scheduled for ${at.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
        meta: { callId: call._id }, actor: { kind: 'automation', label: run.ruleName },
      });
      return { callId: call._id };
    }

    case 'create_task': {
      const assigneeId = cfg.assigneeId || ownerId || (await pickAssignee(cfg.assigneeStrategy || 'round_robin'));
      const task = await CrmTask.create({
        title: require('./messaging').renderTemplate(cfg.title || 'Follow up', await require('./messaging').buildVars({ lead, contact })),
        description: cfg.description,
        type: cfg.taskType || 'todo',
        ...personRef,
        assigneeId,
        dueAt: new Date(Date.now() + (cfg.dueOffsetHours || 24) * 36e5),
        priority: cfg.priority || 'medium',
        automationRunId: run._id,
      });
      await notify.notify(assigneeId, {
        type: 'task.assigned', title: `New task: ${task.title}`, entity,
      });
      await timeline.record({
        entity, type: 'task.created', title: `Task auto-created: ${task.title}`,
        meta: { taskId: task._id }, actor: { kind: 'automation', label: run.ruleName },
      });
      return { taskId: task._id };
    }

    case 'create_followup': {
      const fOwner = cfg.assigneeId || ownerId || (await pickAssignee('round_robin'));
      const dueAt = new Date(Date.now() + (cfg.dueOffsetHours || 24) * 36e5);
      const fu = await CrmFollowUp.create({
        ...personRef, ownerId: fOwner, dueAt,
        note: cfg.note || 'Automated follow-up',
        channelHint: cfg.channelHint || 'any',
        automationRunId: run._id,
      });
      await jobs.schedule('followup:reminder', dueAt, { followUpId: String(fu._id) },
        { dedupeKey: `followup:reminder:${fu._id}` });
      if (lead) await CrmLead.updateOne({ _id: lead._id }, { $set: { nextFollowUpAt: dueAt } });
      await timeline.record({
        entity, type: 'followup.created', title: `Follow-up auto-created (due ${dueAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })})`,
        meta: { followUpId: fu._id }, actor: { kind: 'automation', label: run.ruleName },
      });
      return { followUpId: fu._id };
    }

    case 'assign_owner': {
      if (!lead) throw new Error('assign_owner only applies to leads');
      if (lead.ownerId && !cfg.reassign) return { skipped: 'already assigned' };
      const newOwner = await pickAssignee(cfg.strategy || 'round_robin');
      if (!newOwner) throw new Error('No active user available to assign');
      await CrmLead.updateOne({ _id: lead._id }, {
        $set: { ownerId: newOwner, assignedAt: new Date() },
      });
      await notify.notify(newOwner, {
        type: 'lead.assigned', title: `Lead assigned to you: ${lead.name}`, entity,
      });
      await timeline.record({
        entity, type: 'lead.assigned', title: 'Lead auto-assigned',
        meta: { ownerId: newOwner }, actor: { kind: 'automation', label: run.ruleName },
      });
      await emitEvent('lead.assigned', {
        entityKind: 'lead', entityId: lead._id, data: { ownerId: String(newOwner) }, depth: (meta.depth || 0) + 1,
      });
      return { ownerId: newOwner };
    }

    case 'update_field': {
      const ALLOWED = ['status', 'rating', 'serviceInterest', 'score'];
      if (!ALLOWED.includes(cfg.field)) throw new Error(`Field not allowed: ${cfg.field}`);
      const Model = lead ? CrmLead : CrmContact;
      await Model.updateOne({ _id: person._id }, { $set: { [cfg.field]: cfg.value } });
      return { [cfg.field]: cfg.value };
    }

    case 'add_tag': {
      const Model = lead ? CrmLead : CrmContact;
      await Model.updateOne({ _id: person._id }, { $addToSet: { tags: cfg.tag } });
      return { tag: cfg.tag };
    }
    case 'remove_tag': {
      const Model = lead ? CrmLead : CrmContact;
      await Model.updateOne({ _id: person._id }, { $pull: { tags: cfg.tag } });
      return { tag: cfg.tag };
    }

    case 'notify_user': {
      let targets = [];
      if (cfg.who === 'owner' && ownerId) targets = [ownerId];
      else if (cfg.who === 'managers') return notify.notifyRole(['Admin', 'Manager'], {
        type: 'automation.notice', title: cfg.message || `Automation: ${run.ruleName}`, entity,
      });
      else if (cfg.who && cfg.who.startsWith('user:')) targets = [cfg.who.slice(5)];
      await notify.notify(targets, {
        type: 'automation.notice',
        title: require('./messaging').renderTemplate(cfg.message || `Automation: ${run.ruleName}`,
          await require('./messaging').buildVars({ lead, contact })),
        entity,
      });
      return { notified: targets.length };
    }

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
};

module.exports = { emitEvent, handleEvent, resumeActions, evalConditions, buildContext, pickAssignee };
