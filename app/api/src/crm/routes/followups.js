'use strict';

const router = require('express').Router();
const { CrmFollowUp, CrmLead } = require('../models');
const { crmProtect, requirePermission, scopeFilter, audit } = require('../middleware/crmAuth');
const timeline = require('../services/timeline');
const jobs = require('../services/jobs');
const { ok, created, bad, notFound, listOf } = require('./_helpers');

router.use(crmProtect, audit, requirePermission('followups:manage'));

const entityOf = (fu) =>
  fu.leadId ? { kind: 'lead', id: fu.leadId } : (fu.contactId ? { kind: 'contact', id: fu.contactId } : null);

const syncLeadNextFollowUp = async (leadId) => {
  if (!leadId) return;
  const next = await CrmFollowUp.findOne({ leadId, status: { $in: ['pending', 'snoozed'] } })
    .sort({ dueAt: 1 }).lean();
  await CrmLead.updateOne({ _id: leadId }, { $set: { nextFollowUpAt: next ? next.dueAt : null } });
};

// GET /crm/api/followups?due=today|overdue|upcoming
router.get('/', (req, res) => {
  const filter = { ...scopeFilter(req) };
  if (req.query.ownerId) filter.ownerId = req.query.ownerId === 'me' ? req.crmUser._id : req.query.ownerId;
  if (req.query.leadId) filter.leadId = req.query.leadId;
  if (req.query.status) filter.status = { $in: String(req.query.status).split(',') };
  else filter.status = { $in: ['pending', 'snoozed'] };
  const now = new Date();
  if (req.query.due === 'today') {
    const end = new Date(); end.setHours(23, 59, 59, 999);
    filter.dueAt = { $lte: end };
  } else if (req.query.due === 'overdue') {
    filter.dueAt = { $lt: now };
  } else if (req.query.due === 'upcoming') {
    filter.dueAt = { $gt: now };
  }
  return listOf(CrmFollowUp, req, res, {
    filter,
    sort: { dueAt: 1 },
    populate: [
      { path: 'ownerId', select: 'name' },
      { path: 'leadId', select: 'name phone status' },
      { path: 'contactId', select: 'firstName lastName phone' },
    ],
  });
});

// POST /crm/api/followups
router.post('/', async (req, res) => {
  const { leadId, contactId, dealId, dueAt, note, channelHint, ownerId } = req.body;
  if (!leadId && !contactId) return bad(res, 'leadId or contactId is required');
  if (!dueAt) return bad(res, 'dueAt is required');
  const fu = await CrmFollowUp.create({
    leadId, contactId, dealId,
    ownerId: ownerId || req.crmUser._id,
    dueAt: new Date(dueAt),
    note, channelHint: channelHint || 'any',
  });
  await jobs.schedule('followup:reminder', fu.dueAt, { followUpId: String(fu._id) },
    { dedupeKey: `followup:reminder:${fu._id}` });
  await syncLeadNextFollowUp(leadId);
  const ent = entityOf(fu);
  if (ent) {
    await timeline.record({
      entity: ent, type: 'followup.created',
      title: `Follow-up set for ${new Date(fu.dueAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}${note ? ` — ${note}` : ''}`,
      meta: { followUpId: fu._id },
      actor: { kind: 'user', userId: req.crmUser._id, label: req.crmUser.name },
    });
  }
  return created(res, fu, 'Follow-up created');
});

// PATCH /crm/api/followups/:id/done
router.patch('/:id/done', async (req, res) => {
  const fu = await CrmFollowUp.findOne({ _id: req.params.id, ...scopeFilter(req) });
  if (!fu) return notFound(res, 'Follow-up');
  fu.status = 'done';
  fu.doneAt = new Date();
  await fu.save();
  await jobs.cancelByKey(`followup:reminder:${fu._id}`);
  await syncLeadNextFollowUp(fu.leadId);
  const ent = entityOf(fu);
  if (ent) {
    await timeline.record({
      entity: ent, type: 'followup.done', title: `Follow-up completed${fu.note ? `: ${fu.note}` : ''}`,
      actor: { kind: 'user', userId: req.crmUser._id, label: req.crmUser.name },
    });
  }
  return ok(res, fu);
});

// PATCH /crm/api/followups/:id/snooze  { until }
router.patch('/:id/snooze', async (req, res) => {
  const { until } = req.body;
  if (!until) return bad(res, 'until (datetime) is required');
  const fu = await CrmFollowUp.findOne({ _id: req.params.id, ...scopeFilter(req) });
  if (!fu) return notFound(res, 'Follow-up');
  fu.status = 'snoozed';
  fu.snoozedUntil = new Date(until);
  fu.dueAt = new Date(until);
  fu.escalatedAt = null;
  await fu.save();
  await jobs.schedule('followup:reminder', fu.dueAt, { followUpId: String(fu._id) },
    { dedupeKey: `followup:reminder:${fu._id}` });
  await syncLeadNextFollowUp(fu.leadId);
  return ok(res, fu);
});

// PATCH /crm/api/followups/:id/cancel
router.patch('/:id/cancel', async (req, res) => {
  const fu = await CrmFollowUp.findOne({ _id: req.params.id, ...scopeFilter(req) });
  if (!fu) return notFound(res, 'Follow-up');
  fu.status = 'cancelled';
  await fu.save();
  await jobs.cancelByKey(`followup:reminder:${fu._id}`);
  await syncLeadNextFollowUp(fu.leadId);
  return ok(res, fu);
});

// PUT /crm/api/followups/:id
router.put('/:id', async (req, res) => {
  const fu = await CrmFollowUp.findOne({ _id: req.params.id, ...scopeFilter(req) });
  if (!fu) return notFound(res, 'Follow-up');
  const FIELDS = ['note', 'channelHint', 'ownerId'];
  for (const f of FIELDS) if (req.body[f] !== undefined) fu[f] = req.body[f];
  if (req.body.dueAt) {
    fu.dueAt = new Date(req.body.dueAt);
    fu.status = 'pending';
    await jobs.schedule('followup:reminder', fu.dueAt, { followUpId: String(fu._id) },
      { dedupeKey: `followup:reminder:${fu._id}` });
  }
  await fu.save();
  await syncLeadNextFollowUp(fu.leadId);
  return ok(res, fu);
});

module.exports = router;
