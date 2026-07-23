'use strict';

const router = require('express').Router();
const { CrmAutomationRule, CrmAutomationRun, CrmLead } = require('../models');
const { crmProtect, requirePermission, audit } = require('../middleware/crmAuth');
const automation = require('../services/automation');
const { ok, created, bad, notFound, listOf, parsePaging } = require('./_helpers');

router.use(crmProtect, audit, requirePermission('automations:manage'));

const TRIGGER_EVENTS = [
  'lead.created', 'lead.re_enquired', 'lead.status_changed', 'lead.assigned',
  'lead.converted', 'lead.idle', 'call.completed', 'call.no_answer',
  'deal.stage_changed', 'deal.won', 'deal.lost', 'message.replied', 'message.failed',
];

// GET /crm/api/automations/meta — options for the rule builder UI
router.get('/meta', (req, res) => ok(res, {
  events: TRIGGER_EVENTS,
  actions: ['send_email', 'send_whatsapp', 'send_sms', 'schedule_call', 'create_task',
    'create_followup', 'assign_owner', 'update_field', 'add_tag', 'remove_tag', 'notify_user', 'wait'],
  ops: ['eq', 'ne', 'in', 'nin', 'gt', 'gte', 'lt', 'lte', 'contains', 'exists'],
  fields: ['lead.status', 'lead.rating', 'lead.score', 'lead.serviceInterest', 'lead.budget',
    'lead.source.channel', 'lead.tags', 'counts.callAttempts', 'hoursSince.lastActivityAt',
    'event.channel', 'event.outcome', 'event.to', 'event.from'],
}));

router.get('/', (req, res) =>
  listOf(CrmAutomationRule, req, res, { searchFields: ['name'], sort: { createdAt: -1 } }));

router.post('/', async (req, res) => {
  const { name, description, trigger, conditions, actions, isActive, respectQuietHours } = req.body;
  if (!name || !trigger || !trigger.event) return bad(res, 'name and trigger.event are required');
  if (!TRIGGER_EVENTS.includes(trigger.event)) return bad(res, 'Unknown trigger event');
  if (!Array.isArray(actions) || !actions.length) return bad(res, 'At least one action is required');
  const rule = await CrmAutomationRule.create({
    name, description, trigger, conditions: conditions || [], actions,
    isActive: isActive !== false, respectQuietHours: respectQuietHours !== false,
    createdBy: req.crmUser._id,
  });
  return created(res, rule, 'Automation rule created');
});

router.get('/:id', async (req, res) => {
  const rule = await CrmAutomationRule.findById(req.params.id).lean();
  if (!rule) return notFound(res, 'Rule');
  return ok(res, rule);
});

router.put('/:id', async (req, res) => {
  const rule = await CrmAutomationRule.findById(req.params.id);
  if (!rule) return notFound(res, 'Rule');
  const FIELDS = ['name', 'description', 'trigger', 'conditions', 'actions', 'respectQuietHours'];
  for (const f of FIELDS) if (req.body[f] !== undefined) rule[f] = req.body[f];
  await rule.save();
  return ok(res, rule);
});

// PATCH /crm/api/automations/:id/toggle
router.patch('/:id/toggle', async (req, res) => {
  const rule = await CrmAutomationRule.findById(req.params.id);
  if (!rule) return notFound(res, 'Rule');
  rule.isActive = !rule.isActive;
  await rule.save();
  return ok(res, rule);
});

// POST /crm/api/automations/:id/test  { leadId? } — dry run: evaluates conditions only
router.post('/:id/test', async (req, res) => {
  const rule = await CrmAutomationRule.findById(req.params.id).lean();
  if (!rule) return notFound(res, 'Rule');
  const lead = req.body.leadId
    ? await CrmLead.findById(req.body.leadId).lean()
    : await CrmLead.findOne({ deletedAt: null }).sort({ createdAt: -1 }).lean();
  if (!lead) return bad(res, 'No lead available to test against');
  const ctx = await automation.buildContext('lead', lead._id, req.body.eventData || {});
  const passes = automation.evalConditions(rule.conditions, ctx);
  return ok(res, {
    lead: { id: lead._id, name: lead.name, status: lead.status },
    conditionsPass: passes,
    wouldRunActions: passes ? rule.actions.map((a) => a.type) : [],
  });
});

// GET /crm/api/automations/:id/runs
router.get('/:id/runs', async (req, res) => {
  const { page, limit, skip } = parsePaging(req);
  const [items, total] = await Promise.all([
    CrmAutomationRun.find({ ruleId: req.params.id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    CrmAutomationRun.countDocuments({ ruleId: req.params.id }),
  ]);
  return ok(res, items, { page, limit, total });
});

router.delete('/:id', async (req, res) => {
  const rule = await CrmAutomationRule.findByIdAndDelete(req.params.id);
  if (!rule) return notFound(res, 'Rule');
  return ok(res, null);
});

module.exports = router;
