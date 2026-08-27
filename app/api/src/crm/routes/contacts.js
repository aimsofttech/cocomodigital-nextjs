'use strict';

const router = require('express').Router();
const { CrmContact, CrmCompany } = require('../models');
const { crmProtect, requirePermission, scopeFilter, audit } = require('../middleware/crmAuth');
const timeline = require('../services/timeline');
const { ok, created, bad, notFound, listOf } = require('./_helpers');

router.use(crmProtect, audit);

// GET /crm/api/contacts
router.get('/', requirePermission('contacts:read'), (req, res) => {
  const filter = { deletedAt: null, ...scopeFilter(req) };
  if (req.query.lifecycle) filter.lifecycle = req.query.lifecycle;
  if (req.query.companyId) filter.companyId = req.query.companyId;
  if (req.query.tag) filter.tags = req.query.tag;
  return listOf(CrmContact, req, res, {
    filter,
    searchFields: ['firstName', 'lastName', 'email', 'phone'],
    populate: [
      { path: 'companyId', select: 'name' },
      { path: 'ownerId', select: 'name' },
    ],
  });
});

// POST /crm/api/contacts
router.post('/', requirePermission('contacts:create'), async (req, res) => {
  const { firstName, lastName, email, phone, altPhone, companyId, designation, lifecycle, tags, notes, address, ownerId } = req.body;
  if (!firstName) return bad(res, 'firstName is required');
  const contact = await CrmContact.create({
    firstName, lastName, email, phone, altPhone, companyId, designation,
    lifecycle: lifecycle || 'customer', tags: tags || [], notes, address,
    ownerId: ownerId || (req.crmRole && req.crmRole.ownScope ? req.crmUser._id : undefined),
  });
  await timeline.record({
    entity: { kind: 'contact', id: contact._id },
    type: 'contact.created',
    title: 'Contact created',
    actor: { kind: 'user', userId: req.crmUser._id, label: req.crmUser.name },
  });
  return created(res, contact, 'Contact created');
});

// GET /crm/api/contacts/:id
router.get('/:id', requirePermission('contacts:read'), async (req, res) => {
  const contact = await CrmContact.findOne({ _id: req.params.id, deletedAt: null, ...scopeFilter(req) })
    .populate('companyId', 'name website industry')
    .populate('ownerId', 'name email')
    .populate('originLeadId', 'name status source')
    .lean();
  if (!contact) return notFound(res, 'Contact');
  return ok(res, contact);
});

// GET /crm/api/contacts/:id/timeline (includes the origin lead's history)
router.get('/:id/timeline', requirePermission('contacts:read'), async (req, res) => {
  const data = await timeline.forEntity('contact', req.params.id, {
    page: req.query.page, limit: req.query.limit || 30,
  });
  return ok(res, data.items, { page: data.page, limit: data.limit, total: data.total });
});

// POST /crm/api/contacts/:id/notes
router.post('/:id/notes', requirePermission('contacts:update'), async (req, res) => {
  if (!req.body.note) return bad(res, 'Note text is required');
  const contact = await CrmContact.findOne({ _id: req.params.id, deletedAt: null });
  if (!contact) return notFound(res, 'Contact');
  const activity = await timeline.record({
    entity: { kind: 'contact', id: contact._id },
    type: 'note.added',
    title: req.body.note,
    actor: { kind: 'user', userId: req.crmUser._id, label: req.crmUser.name },
  });
  return created(res, activity, 'Note added');
});

// PUT /crm/api/contacts/:id
router.put('/:id', requirePermission('contacts:update'), async (req, res) => {
  const contact = await CrmContact.findOne({ _id: req.params.id, deletedAt: null, ...scopeFilter(req) });
  if (!contact) return notFound(res, 'Contact');
  const FIELDS = ['firstName', 'lastName', 'email', 'phone', 'altPhone', 'companyId',
    'designation', 'lifecycle', 'tags', 'notes', 'address', 'ownerId'];
  for (const f of FIELDS) if (req.body[f] !== undefined) contact[f] = req.body[f];
  await contact.save();
  return ok(res, contact);
});

// PATCH /crm/api/contacts/:id/consent
router.patch('/:id/consent', requirePermission('contacts:update'), async (req, res) => {
  const contact = await CrmContact.findOne({ _id: req.params.id, deletedAt: null });
  if (!contact) return notFound(res, 'Contact');
  const { whatsappOptIn, smsOptIn, emailOptIn, dnd, whatsappOptInSource } = req.body;
  if (whatsappOptIn !== undefined) {
    contact.whatsappOptIn = !!whatsappOptIn;
    // Stamp when and how consent was obtained — Meta expects a record, and an
    // opt-out has to clear it so a later re-tick can't inherit the old proof.
    if (whatsappOptIn) {
      contact.whatsappOptInAt = new Date();
      contact.whatsappOptInSource = whatsappOptInSource || 'agent';
    } else {
      contact.whatsappOptInAt = undefined;
      contact.whatsappOptInSource = undefined;
    }
  }
  if (smsOptIn !== undefined) contact.smsOptIn = !!smsOptIn;
  if (emailOptIn !== undefined) contact.emailOptIn = !!emailOptIn;
  if (dnd !== undefined) contact.dnd = !!dnd;
  await contact.save();
  await timeline.record({
    entity: { kind: 'contact', id: contact._id },
    type: 'contact.consent_changed',
    title: `Consent updated (WA:${contact.whatsappOptIn ? 'on' : 'off'} SMS:${contact.smsOptIn ? 'on' : 'off'} Email:${contact.emailOptIn ? 'on' : 'off'} DND:${contact.dnd ? 'on' : 'off'})`,
    actor: { kind: 'user', userId: req.crmUser._id, label: req.crmUser.name },
  });
  return ok(res, contact);
});

// DELETE /crm/api/contacts/:id
router.delete('/:id', requirePermission('contacts:delete'), async (req, res) => {
  const contact = await CrmContact.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    { $set: { deletedAt: new Date() } },
    { new: true }
  );
  if (!contact) return notFound(res, 'Contact');
  return ok(res, null);
});

module.exports = router;
