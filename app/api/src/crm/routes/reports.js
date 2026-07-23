'use strict';

const router = require('express').Router();
const XLSX = require('xlsx');
const { CrmLead, CrmDeal, CrmCall, CrmMessage, CrmTask, CrmFollowUp, CrmPipeline } = require('../models');
const { crmProtect, requirePermission } = require('../middleware/crmAuth');
const { ok, bad } = require('./_helpers');

router.use(crmProtect, requirePermission('reports:view'));

const rangeOf = (req) => {
  const to = req.query.to ? new Date(req.query.to) : new Date();
  const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 30 * 24 * 36e5);
  return { from, to };
};

const maybeCsv = (req, res, rows, name) => {
  if (req.query.format === 'csv') {
    const ws = XLSX.utils.json_to_sheet(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${name}.csv"`);
    return res.send(XLSX.utils.sheet_to_csv(ws));
  }
  return ok(res, rows);
};

// GET /crm/api/reports/lead-sources — leads by source × status, conversion %
router.get('/lead-sources', async (req, res) => {
  const { from, to } = rangeOf(req);
  const rows = await CrmLead.aggregate([
    { $match: { deletedAt: null, createdAt: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: '$source.channel',
        total: { $sum: 1 },
        won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
        lost: { $sum: { $cond: [{ $in: ['$status', ['lost', 'junk']] }, 1, 0] } },
        open: { $sum: { $cond: [{ $in: ['$status', ['new', 'contacted', 'qualified', 'proposal', 'negotiation']] }, 1, 0] } },
      },
    },
    { $sort: { total: -1 } },
  ]);
  return maybeCsv(req, res, rows.map((r) => ({
    source: r._id || 'unknown', total: r.total, open: r.open, won: r.won, lost: r.lost,
    conversionPct: r.total ? Math.round((r.won / r.total) * 100) : 0,
  })), 'lead-sources');
});

// GET /crm/api/reports/funnel — stage-by-stage counts
router.get('/funnel', async (req, res) => {
  const { from, to } = rangeOf(req);
  const order = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won'];
  const agg = await CrmLead.aggregate([
    { $match: { deletedAt: null, createdAt: { $gte: from, $lte: to } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const map = Object.fromEntries(agg.map((a) => [a._id, a.count]));
  const total = agg.reduce((s, a) => s + a.count, 0);
  return maybeCsv(req, res, order.map((s) => ({
    stage: s, count: map[s] || 0, pctOfTotal: total ? Math.round(((map[s] || 0) / total) * 100) : 0,
  })), 'funnel');
});

// GET /crm/api/reports/agent-activity — per-owner productivity
router.get('/agent-activity', async (req, res) => {
  const { from, to } = rangeOf(req);
  const match = { createdAt: { $gte: from, $lte: to } };
  const [leads, calls, messages, tasks, followups] = await Promise.all([
    CrmLead.aggregate([
      { $match: { ...match, deletedAt: null, ownerId: { $ne: null } } },
      { $group: { _id: '$ownerId', leads: { $sum: 1 }, won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } } } },
    ]),
    CrmCall.aggregate([
      { $match: { ...match, status: { $in: ['completed', 'no_answer', 'busy'] } } },
      { $group: { _id: '$ownerId', calls: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
    ]),
    CrmMessage.aggregate([
      { $match: { ...match, direction: 'outbound', sentBy: { $ne: null } } },
      { $group: { _id: '$sentBy', messages: { $sum: 1 } } },
    ]),
    CrmTask.aggregate([
      { $match: { completedAt: { $gte: from, $lte: to } } },
      { $group: { _id: '$completedBy', tasksDone: { $sum: 1 } } },
    ]),
    CrmFollowUp.aggregate([
      { $match: { doneAt: { $gte: from, $lte: to } } },
      { $group: { _id: '$ownerId', followupsDone: { $sum: 1 } } },
    ]),
  ]);
  const byUser = {};
  const mix = (arr, fields) => arr.forEach((r) => {
    if (!r._id) return;
    const k = String(r._id);
    byUser[k] = byUser[k] || {};
    for (const f of fields) byUser[k][f] = r[f] || 0;
  });
  mix(leads, ['leads', 'won']); mix(calls, ['calls', 'completed']);
  mix(messages, ['messages']); mix(tasks, ['tasksDone']); mix(followups, ['followupsDone']);
  const { CrmUser } = require('../models');
  const users = await CrmUser.find({ _id: { $in: Object.keys(byUser) } }).select('name').lean();
  const nameMap = Object.fromEntries(users.map((u) => [String(u._id), u.name]));
  return maybeCsv(req, res, Object.entries(byUser).map(([id, stats]) => ({
    agent: nameMap[id] || id, leads: stats.leads || 0, won: stats.won || 0,
    calls: stats.calls || 0, callsCompleted: stats.completed || 0,
    messages: stats.messages || 0, tasksDone: stats.tasksDone || 0, followupsDone: stats.followupsDone || 0,
  })), 'agent-activity');
});

// GET /crm/api/reports/deliverability — per channel: sent→delivered→read→replied
router.get('/deliverability', async (req, res) => {
  const { from, to } = rangeOf(req);
  const rows = await CrmMessage.aggregate([
    { $match: { direction: 'outbound', createdAt: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: '$channel',
        total: { $sum: 1 },
        sent: { $sum: { $cond: [{ $in: ['$status', ['sent', 'delivered', 'read', 'replied']] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $in: ['$status', ['delivered', 'read', 'replied']] }, 1, 0] } },
        read: { $sum: { $cond: [{ $in: ['$status', ['read', 'replied']] }, 1, 0] } },
        opened: { $sum: { $cond: [{ $ne: ['$openedAt', null] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $in: ['$status', ['failed', 'bounced']] }, 1, 0] } },
        manual: { $sum: { $cond: [{ $eq: ['$status', 'manual'] }, 1, 0] } },
      },
    },
  ]);
  return maybeCsv(req, res, rows.map((r) => ({ channel: r._id, ...r, _id: undefined })), 'deliverability');
});

// GET /crm/api/reports/forecast — open deals: Σ value × stage probability by month
router.get('/forecast', async (req, res) => {
  const pipelines = await CrmPipeline.find().lean();
  const probMap = {};
  for (const p of pipelines) for (const s of p.stages) probMap[`${p._id}:${s.key}`] = s.probability / 100;
  const deals = await CrmDeal.find({ deletedAt: null, wonAt: null, lostAt: null }).lean();
  const byMonth = {};
  for (const d of deals) {
    const month = d.expectedCloseDate
      ? new Date(d.expectedCloseDate).toISOString().slice(0, 7)
      : 'unscheduled';
    const weighted = (d.value || 0) * (probMap[`${d.pipelineId}:${d.stageKey}`] || 0);
    byMonth[month] = byMonth[month] || { month, deals: 0, totalValue: 0, weightedValue: 0 };
    byMonth[month].deals++;
    byMonth[month].totalValue += d.value || 0;
    byMonth[month].weightedValue += Math.round(weighted);
  }
  return maybeCsv(req, res, Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)), 'forecast');
});

// GET /crm/api/reports/idle-leads — no activity in N days
router.get('/idle-leads', async (req, res) => {
  const days = Number(req.query.days) || 7;
  const cutoff = new Date(Date.now() - days * 24 * 36e5);
  const leads = await CrmLead.find({
    deletedAt: null,
    status: { $in: ['new', 'contacted', 'qualified', 'proposal', 'negotiation'] },
    $or: [{ lastActivityAt: { $lt: cutoff } }, { lastActivityAt: null, createdAt: { $lt: cutoff } }],
  }).populate('ownerId', 'name').sort({ lastActivityAt: 1 }).limit(200).lean();
  return maybeCsv(req, res, leads.map((l) => ({
    name: l.name, email: l.email || '', phone: l.phone || '', status: l.status,
    owner: (l.ownerId && l.ownerId.name) || 'Unassigned',
    lastActivity: l.lastActivityAt ? new Date(l.lastActivityAt).toISOString() : 'never',
  })), 'idle-leads');
});

module.exports = router;
