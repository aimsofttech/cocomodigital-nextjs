'use strict';

const router = require('express').Router();
const { CrmMessage, CrmLead, CrmContact } = require('../models');
const { crmProtect, requirePermission, audit } = require('../middleware/crmAuth');
const messaging = require('../services/messaging');
const { ok, created, bad, notFound, listOf } = require('./_helpers');

router.use(crmProtect, audit);

// POST /crm/api/messages/send
router.post('/send', requirePermission('messages:send'), async (req, res) => {
  const { channel, leadId, contactId, dealId, templateId, subject, body, variables, scheduledFor } = req.body;
  try {
    const msg = await messaging.sendMessage({
      channel, leadId, contactId, dealId, templateId, subject, body, variables,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      sentBy: req.crmUser._id,
    });
    return created(res, msg, scheduledFor ? 'Message scheduled' : 'Message queued');
  } catch (err) {
    return bad(res, err.message);
  }
});

// POST /crm/api/messages/bulk  { channel, templateId, leadIds: [] }
router.post('/bulk', requirePermission('messages:send'), async (req, res) => {
  const { channel, templateId, leadIds, scheduledFor } = req.body;
  if (!templateId) return bad(res, 'templateId is required for bulk sends');
  if (!Array.isArray(leadIds) || !leadIds.length) return bad(res, 'leadIds[] is required');
  if (leadIds.length > 200) return bad(res, 'Max 200 recipients per bulk send');
  const results = { queued: 0, failed: 0, errors: [] };
  for (const leadId of leadIds) {
    try {
      await messaging.sendMessage({
        channel, leadId, templateId,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
        sentBy: req.crmUser._id,
      });
      results.queued++;
    } catch (err) {
      results.failed++;
      results.errors.push({ leadId, error: err.message });
    }
  }
  return ok(res, results);
});

// GET /crm/api/messages?channel=&status=&leadId=&contactId=
router.get('/', requirePermission('messages:read'), (req, res) => {
  const filter = {};
  if (req.query.channel) filter.channel = req.query.channel;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.direction) filter.direction = req.query.direction;
  if (req.query.leadId) filter.leadId = req.query.leadId;
  if (req.query.contactId) filter.contactId = req.query.contactId;
  return listOf(CrmMessage, req, res, {
    filter,
    searchFields: ['toAddress', 'subject', 'body'],
    populate: [
      { path: 'leadId', select: 'name' },
      { path: 'contactId', select: 'firstName lastName' },
      { path: 'sentBy', select: 'name' },
      { path: 'templateId', select: 'name' },
    ],
  });
});

// GET /crm/api/messages/inbox — conversation threads (latest message per counterpart)
router.get('/inbox', requirePermission('messages:read'), async (req, res) => {
  const match = {};
  if (req.query.channel) match.channel = req.query.channel;
  const threads = await CrmMessage.aggregate([
    { $match: match },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: {
          channel: '$channel',
          person: { $ifNull: ['$leadId', '$contactId'] },
        },
        lastMessage: { $first: '$$ROOT' },
        total: { $sum: 1 },
        unreadInbound: {
          $sum: { $cond: [{ $eq: ['$status', 'received'] }, 1, 0] },
        },
      },
    },
    { $sort: { 'lastMessage.createdAt': -1 } },
    { $limit: 100 },
  ]);
  // Hydrate person names.
  const leadIds = threads.map((t) => t.lastMessage.leadId).filter(Boolean);
  const contactIds = threads.map((t) => t.lastMessage.contactId).filter(Boolean);
  const [leads, contacts] = await Promise.all([
    CrmLead.find({ _id: { $in: leadIds } }).select('name phone email').lean(),
    CrmContact.find({ _id: { $in: contactIds } }).select('firstName lastName phone email').lean(),
  ]);
  const leadMap = Object.fromEntries(leads.map((l) => [String(l._id), l]));
  const contactMap = Object.fromEntries(contacts.map((c) => [String(c._id), c]));
  return ok(res, threads.map((t) => {
    const lm = t.lastMessage;
    const lead = lm.leadId && leadMap[String(lm.leadId)];
    const contact = lm.contactId && contactMap[String(lm.contactId)];
    return {
      channel: t._id.channel,
      leadId: lm.leadId || null,
      contactId: lm.contactId || null,
      name: (lead && lead.name) || (contact && `${contact.firstName} ${contact.lastName || ''}`.trim()) || lm.toAddress,
      lastMessage: { body: lm.body, direction: lm.direction, status: lm.status, createdAt: lm.createdAt },
      total: t.total,
      unreadInbound: t.unreadInbound,
    };
  }));
});

// GET /crm/api/messages/thread?leadId=|contactId=&channel=
router.get('/thread', requirePermission('messages:read'), async (req, res) => {
  const { leadId, contactId, channel } = req.query;
  if (!leadId && !contactId) return bad(res, 'leadId or contactId is required');
  const filter = leadId ? { leadId } : { contactId };
  if (channel) filter.channel = channel;
  const items = await CrmMessage.find(filter).sort({ createdAt: 1 }).limit(200).lean();
  // Mark inbound as read (replied → keeps 'replied'; 'received' → 'read').
  await CrmMessage.updateMany({ ...filter, status: 'received' }, { $set: { status: 'read' } });
  return ok(res, items);
});

// GET /crm/api/messages/:id
router.get('/:id', requirePermission('messages:read'), async (req, res) => {
  const msg = await CrmMessage.findById(req.params.id)
    .populate('leadId', 'name')
    .populate('contactId', 'firstName lastName')
    .lean();
  if (!msg) return notFound(res, 'Message');
  return ok(res, msg);
});

// PATCH /crm/api/messages/:id/mark-sent — for wa.me link mode: agent confirms they sent it
router.patch('/:id/mark-sent', requirePermission('messages:send'), async (req, res) => {
  const msg = await CrmMessage.findById(req.params.id);
  if (!msg) return notFound(res, 'Message');
  if (msg.status !== 'manual') return bad(res, 'Only manual (wa.me link) messages can be marked sent');
  msg.status = 'sent';
  msg.statusHistory.push({ status: 'sent', at: new Date(), raw: { via: 'agent-confirmed' } });
  await msg.save();
  return ok(res, msg);
});

module.exports = router;
