'use strict';

const router = require('express').Router();
const { CrmDeal, CrmPipeline } = require('../models');
const { crmProtect, requirePermission, scopeFilter, audit } = require('../middleware/crmAuth');
const timeline = require('../services/timeline');
const automation = require('../services/automation');
const { ok, created, bad, notFound, listOf } = require('./_helpers');

router.use(crmProtect, audit);

/* ── Pipelines ──────────────────────────────────────────────────────────── */

router.get('/pipelines', requirePermission('deals:read'), async (req, res) => {
  const pipelines = await CrmPipeline.find().sort({ createdAt: 1 }).lean();
  return ok(res, pipelines);
});

router.post('/pipelines', requirePermission('pipelines:manage'), async (req, res) => {
  const { name, stages, isDefault } = req.body;
  if (!name || !Array.isArray(stages) || !stages.length) return bad(res, 'name and stages[] are required');
  if (isDefault) await CrmPipeline.updateMany({}, { $set: { isDefault: false } });
  const pipeline = await CrmPipeline.create({ name, stages, isDefault: !!isDefault });
  return created(res, pipeline, 'Pipeline created');
});

router.put('/pipelines/:id', requirePermission('pipelines:manage'), async (req, res) => {
  const pipeline = await CrmPipeline.findById(req.params.id);
  if (!pipeline) return notFound(res, 'Pipeline');
  if (req.body.name !== undefined) pipeline.name = req.body.name;
  if (req.body.stages !== undefined) pipeline.stages = req.body.stages;
  if (req.body.isDefault) {
    await CrmPipeline.updateMany({ _id: { $ne: pipeline._id } }, { $set: { isDefault: false } });
    pipeline.isDefault = true;
  }
  await pipeline.save();
  return ok(res, pipeline);
});

/* ── Deals ──────────────────────────────────────────────────────────────── */

router.get('/', requirePermission('deals:read'), (req, res) => {
  const filter = { deletedAt: null, ...scopeFilter(req) };
  if (req.query.stageKey) filter.stageKey = req.query.stageKey;
  if (req.query.pipelineId) filter.pipelineId = req.query.pipelineId;
  if (req.query.contactId) filter.contactId = req.query.contactId;
  return listOf(CrmDeal, req, res, {
    filter,
    searchFields: ['title'],
    populate: [
      { path: 'contactId', select: 'firstName lastName' },
      { path: 'companyId', select: 'name' },
      { path: 'ownerId', select: 'name' },
    ],
  });
});

// Kanban payload: all open deals grouped by stage for one pipeline.
router.get('/board', requirePermission('deals:read'), async (req, res) => {
  const pipeline = await CrmPipeline.findOne(
    req.query.pipelineId ? { _id: req.query.pipelineId } : { isDefault: true }
  ).lean();
  if (!pipeline) return bad(res, 'No pipeline found — create one first');
  const deals = await CrmDeal.find({ pipelineId: pipeline._id, deletedAt: null, ...scopeFilter(req) })
    .populate('contactId', 'firstName lastName')
    .populate('companyId', 'name')
    .populate('ownerId', 'name')
    .sort({ updatedAt: -1 })
    .lean();
  const columns = pipeline.stages
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      ...s,
      deals: deals.filter((d) => d.stageKey === s.key),
      totalValue: deals.filter((d) => d.stageKey === s.key).reduce((sum, d) => sum + (d.value || 0), 0),
    }));
  return ok(res, { pipeline: { _id: pipeline._id, name: pipeline.name }, columns });
});

router.post('/', requirePermission('deals:create'), async (req, res) => {
  const { title, contactId, companyId, leadId, pipelineId, stageKey, value, currency, expectedCloseDate, ownerId } = req.body;
  if (!title) return bad(res, 'Deal title is required');
  const pipeline = await CrmPipeline.findOne(pipelineId ? { _id: pipelineId } : { isDefault: true }).lean();
  if (!pipeline) return bad(res, 'No pipeline found — create one first');
  const stage = stageKey || (pipeline.stages[0] && pipeline.stages[0].key);
  const deal = await CrmDeal.create({
    title, contactId, companyId, leadId,
    pipelineId: pipeline._id,
    stageKey: stage,
    value: Number(value) || 0,
    currency: currency || 'INR',
    expectedCloseDate,
    ownerId: ownerId || req.crmUser._id,
    stageHistory: [{ stageKey: stage, enteredAt: new Date(), byUserId: req.crmUser._id }],
  });
  if (contactId) {
    await timeline.record({
      entity: { kind: 'contact', id: contactId },
      also: [{ kind: 'deal', id: deal._id }],
      type: 'deal.created',
      title: `Deal created: ${title}`,
      actor: { kind: 'user', userId: req.crmUser._id, label: req.crmUser.name },
    });
  }
  return created(res, deal, 'Deal created');
});

router.get('/:id', requirePermission('deals:read'), async (req, res) => {
  const deal = await CrmDeal.findOne({ _id: req.params.id, deletedAt: null, ...scopeFilter(req) })
    .populate('contactId', 'firstName lastName email phone')
    .populate('companyId', 'name')
    .populate('ownerId', 'name email')
    .populate('pipelineId', 'name stages')
    .lean();
  if (!deal) return notFound(res, 'Deal');
  return ok(res, deal);
});

router.get('/:id/timeline', requirePermission('deals:read'), async (req, res) => {
  const data = await timeline.forEntity('deal', req.params.id, { page: req.query.page, limit: req.query.limit || 30 });
  return ok(res, data.items, { page: data.page, limit: data.limit, total: data.total });
});

router.put('/:id', requirePermission('deals:update'), async (req, res) => {
  const deal = await CrmDeal.findOne({ _id: req.params.id, deletedAt: null, ...scopeFilter(req) });
  if (!deal) return notFound(res, 'Deal');
  const FIELDS = ['title', 'value', 'currency', 'expectedCloseDate', 'tags', 'ownerId', 'contactId', 'companyId'];
  for (const f of FIELDS) if (req.body[f] !== undefined) deal[f] = req.body[f];
  await deal.save();
  return ok(res, deal);
});

// PATCH /crm/api/deals/:id/stage  { stageKey, lostReason?, value? }
router.patch('/:id/stage', requirePermission('deals:update'), async (req, res) => {
  const { stageKey, lostReason, value } = req.body;
  const deal = await CrmDeal.findOne({ _id: req.params.id, deletedAt: null, ...scopeFilter(req) });
  if (!deal) return notFound(res, 'Deal');
  const pipeline = await CrmPipeline.findById(deal.pipelineId).lean();
  const stage = pipeline && pipeline.stages.find((s) => s.key === stageKey);
  if (!stage) return bad(res, 'Invalid stage for this pipeline');
  const from = deal.stageKey;
  if (from === stageKey) return ok(res, deal);

  deal.stageKey = stageKey;
  deal.stageHistory.push({ stageKey, enteredAt: new Date(), byUserId: req.crmUser._id });
  if (value !== undefined) deal.value = Number(value) || deal.value;
  const isWon = stage.probability >= 100 || stageKey === 'won';
  const isLost = stageKey === 'lost';
  if (isWon) deal.wonAt = new Date();
  if (isLost) {
    if (!lostReason) return bad(res, 'lostReason is required when marking a deal lost');
    deal.lostAt = new Date();
    deal.lostReason = lostReason;
  }
  await deal.save();

  const entity = deal.contactId ? { kind: 'contact', id: deal.contactId } : { kind: 'deal', id: deal._id };
  await timeline.record({
    entity,
    also: [{ kind: 'deal', id: deal._id }],
    type: 'deal.stage_changed',
    title: `Deal "${deal.title}": ${from} → ${stageKey}`,
    meta: { from, to: stageKey },
    actor: { kind: 'user', userId: req.crmUser._id, label: req.crmUser.name },
  });
  await automation.emitEvent('deal.stage_changed', {
    entityKind: 'deal', entityId: deal._id, data: { from, to: stageKey },
  });
  if (isWon) await automation.emitEvent('deal.won', { entityKind: 'deal', entityId: deal._id, data: {} });
  if (isLost) await automation.emitEvent('deal.lost', { entityKind: 'deal', entityId: deal._id, data: { lostReason } });
  return ok(res, deal);
});

router.delete('/:id', requirePermission('deals:delete'), async (req, res) => {
  const deal = await CrmDeal.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    { $set: { deletedAt: new Date() } },
    { new: true }
  );
  if (!deal) return notFound(res, 'Deal');
  return ok(res, null);
});

module.exports = router;
