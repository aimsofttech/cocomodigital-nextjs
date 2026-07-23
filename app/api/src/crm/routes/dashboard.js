'use strict';

const router = require('express').Router();
const {
  CrmLead, CrmContact, CrmDeal, CrmCall, CrmTask, CrmFollowUp, CrmMessage,
} = require('../models');
const { crmProtect, requirePermission, scopeFilter } = require('../middleware/crmAuth');
const { ok } = require('./_helpers');

router.use(crmProtect, requirePermission('dashboard:view'));

// GET /crm/api/dashboard — role-aware widgets in one call
router.get('/', async (req, res) => {
  const own = scopeFilter(req);                       // {} for admin/manager
  const ownAssignee = scopeFilter(req, 'assigneeId');
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
  const weekAgo = new Date(Date.now() - 7 * 24 * 36e5);

  const [
    leadsByStatus, newLeadsThisWeek, totalContacts,
    callsToday, followupsDue, followupsOverdue, tasksDue,
    dealsOpen, dealsWonThisMonth, messages7d, recentLeads, unreadReplies,
  ] = await Promise.all([
    CrmLead.aggregate([
      { $match: { deletedAt: null, ...own } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    CrmLead.countDocuments({ deletedAt: null, createdAt: { $gte: weekAgo }, ...own }),
    CrmContact.countDocuments({ deletedAt: null, ...own }),
    CrmCall.find({ status: 'scheduled', scheduledAt: { $gte: startOfDay, $lte: endOfDay }, ...own })
      .populate('leadId', 'name').populate('contactId', 'firstName lastName').sort({ scheduledAt: 1 }).limit(10).lean(),
    CrmFollowUp.countDocuments({ status: { $in: ['pending', 'snoozed'] }, dueAt: { $lte: endOfDay }, ...own }),
    CrmFollowUp.countDocuments({ status: { $in: ['pending', 'snoozed'] }, dueAt: { $lt: new Date() }, ...own }),
    CrmTask.countDocuments({ status: { $in: ['open', 'in_progress'] }, dueAt: { $lte: endOfDay }, ...ownAssignee }),
    CrmDeal.aggregate([
      { $match: { deletedAt: null, wonAt: null, lostAt: null, ...(own.ownerId ? { ownerId: own.ownerId } : {}) } },
      { $group: { _id: '$stageKey', count: { $sum: 1 }, value: { $sum: '$value' } } },
    ]),
    CrmDeal.aggregate([
      { $match: { wonAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } },
      { $group: { _id: null, count: { $sum: 1 }, value: { $sum: '$value' } } },
    ]),
    CrmMessage.aggregate([
      { $match: { createdAt: { $gte: weekAgo }, direction: 'outbound' } },
      { $group: { _id: '$channel', count: { $sum: 1 } } },
    ]),
    CrmLead.find({ deletedAt: null, ...own }).sort({ createdAt: -1 }).limit(8)
      .select('name status source.channel rating createdAt ownerId')
      .populate('ownerId', 'name').lean(),
    CrmMessage.countDocuments({ direction: 'inbound', status: 'received' }),
  ]);

  return ok(res, {
    leads: {
      byStatus: Object.fromEntries(leadsByStatus.map((s) => [s._id, s.count])),
      newThisWeek: newLeadsThisWeek,
    },
    contacts: { total: totalContacts },
    today: {
      calls: callsToday,
      followupsDue,
      followupsOverdue,
      tasksDue,
      unreadReplies,
    },
    deals: {
      openByStage: dealsOpen,
      wonThisMonth: dealsWonThisMonth[0] || { count: 0, value: 0 },
    },
    messages7d: Object.fromEntries(messages7d.map((m) => [m._id, m.count])),
    recentLeads,
  });
});

module.exports = router;
