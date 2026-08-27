'use strict';

const router = require('express').Router();
const multer = require('multer');
const XLSX = require('xlsx');
const {
  CrmLead, CrmCompany, CrmContact, CrmDeal, CrmPipeline, CrmUser,
  CrmTask, CrmFollowUp, CrmDocument, CrmCall, CrmMessage,
} = require('../models');
const { crmProtect, requirePermission, scopeFilter, audit } = require('../middleware/crmAuth');
const timeline = require('../services/timeline');
const automation = require('../services/automation');
const notify = require('../services/notify');
const { ok, created, bad, notFound, listOf, parsePaging } = require('./_helpers');

const memUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(crmProtect, audit);

const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'junk'];

const buildFilter = (req) => {
  const filter = { deletedAt: null, ...scopeFilter(req) };
  if (req.query.status) filter.status = { $in: String(req.query.status).split(',') };
  if (req.query.ownerId) filter.ownerId = req.query.ownerId === 'unassigned' ? null : req.query.ownerId;
  if (req.query.source) filter['source.channel'] = { $in: String(req.query.source).split(',') };
  if (req.query.rating) filter.rating = req.query.rating;
  if (req.query.tag) filter.tags = req.query.tag;
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }
  return filter;
};

// GET /crm/api/leads
router.get('/', requirePermission('leads:read'), (req, res) =>
  listOf(CrmLead, req, res, {
    filter: buildFilter(req),
    searchFields: ['name', 'email', 'phone', 'company'],
    sort: req.query.sort === 'activity' ? { lastActivityAt: -1 } : { createdAt: -1 },
    populate: [{ path: 'ownerId', select: 'name email' }],
  }));

// GET /crm/api/leads/export  (CSV of current filter)
router.get('/export', requirePermission('leads:export'), async (req, res) => {
  const leads = await CrmLead.find(buildFilter(req))
    .sort({ createdAt: -1 }).limit(5000)
    .populate('ownerId', 'name').lean();
  const rows = leads.map((l) => ({
    Name: l.name, Email: l.email || '', Phone: l.phone || '', Company: l.company || '',
    Status: l.status, Rating: l.rating, Score: l.score,
    Source: (l.source && l.source.channel) || '', Service: l.serviceInterest || '',
    Budget: l.budget || '', Owner: (l.ownerId && l.ownerId.name) || '',
    Created: l.createdAt ? new Date(l.createdAt).toISOString() : '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
  return res.send(csv);
});

// POST /crm/api/leads/import  (CSV/XLSX; columns: name,email,phone,company,message,service,budget)
router.post('/import', requirePermission('leads:import'), memUpload.single('file'), async (req, res) => {
  if (!req.file) return bad(res, 'Upload a CSV/XLSX file in the "file" field');
  const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  const results = { imported: 0, skipped: 0, errors: [] };
  const leadIngest = require('../services/leadIngest');
  for (const row of rows) {
    const name = row.name || row.Name;
    if (!name) { results.skipped++; continue; }
    const lead = await leadIngest.ingest({
      channel: 'import',
      name,
      email: row.email || row.Email,
      phone: String(row.phone || row.Phone || ''),
      company: row.company || row.Company,
      message: row.message || row.Message,
      serviceInterest: row.service || row.Service,
      budget: String(row.budget || row.Budget || ''),
      raw: row,
    });
    if (lead) results.imported++; else results.skipped++;
  }
  return ok(res, results);
});

// POST /crm/api/leads
router.post('/', requirePermission('leads:create'), async (req, res) => {
  const { name, email, phone, company, designation, message, serviceInterest, budget, tags, ownerId } = req.body;
  if (!name) return bad(res, 'Name is required');
  const lead = await CrmLead.create({
    name, email, phone, company, designation, message, serviceInterest, budget,
    tags: tags || [],
    ownerId: ownerId || (req.crmRole && req.crmRole.ownScope ? req.crmUser._id : undefined),
    source: { channel: 'manual' },
  });
  await timeline.record({
    entity: { kind: 'lead', id: lead._id },
    type: 'lead.created',
    title: 'Lead created manually',
    actor: { kind: 'user', userId: req.crmUser._id, label: req.crmUser.name },
  });
  await automation.emitEvent('lead.created', {
    entityKind: 'lead', entityId: lead._id, data: { channel: 'manual', serviceInterest: serviceInterest || '' },
  });
  return created(res, lead, 'Lead created');
});

// GET /crm/api/leads/:id
router.get('/:id', requirePermission('leads:read'), async (req, res) => {
  const lead = await CrmLead.findOne({ _id: req.params.id, deletedAt: null, ...scopeFilter(req) })
    .populate('ownerId', 'name email')
    .populate('convertedContactId', 'firstName lastName')
    .populate('convertedDealId', 'title stageKey value')
    .lean();
  if (!lead) return notFound(res, 'Lead');
  const [openTasks, pendingFollowUps, upcomingCalls, messages, documents] = await Promise.all([
    CrmTask.find({ leadId: lead._id, status: { $in: ['open', 'in_progress'] } }).sort({ dueAt: 1 }).limit(10).lean(),
    CrmFollowUp.find({ leadId: lead._id, status: { $in: ['pending', 'snoozed'] } }).sort({ dueAt: 1 }).limit(10).lean(),
    CrmCall.find({ leadId: lead._id, status: 'scheduled' }).sort({ scheduledAt: 1 }).limit(10).lean(),
    CrmMessage.find({ leadId: lead._id }).sort({ createdAt: -1 }).limit(10).lean(),
    CrmDocument.find({ 'entity.kind': 'lead', 'entity.id': lead._id, deletedAt: null }).sort({ createdAt: -1 }).lean(),
  ]);
  return ok(res, { ...lead, openTasks, pendingFollowUps, upcomingCalls, recentMessages: messages, documents });
});

// GET /crm/api/leads/:id/timeline
router.get('/:id/timeline', requirePermission('leads:read'), async (req, res) => {
  const data = await timeline.forEntity('lead', req.params.id, {
    page: req.query.page, limit: req.query.limit || 30,
    types: req.query.types ? String(req.query.types).split(',') : undefined,
  });
  return ok(res, data.items, { page: data.page, limit: data.limit, total: data.total });
});

// POST /crm/api/leads/:id/notes
router.post('/:id/notes', requirePermission('leads:update'), async (req, res) => {
  const { note } = req.body;
  if (!note) return bad(res, 'Note text is required');
  const lead = await CrmLead.findOne({ _id: req.params.id, deletedAt: null });
  if (!lead) return notFound(res, 'Lead');
  const activity = await timeline.record({
    entity: { kind: 'lead', id: lead._id },
    type: 'note.added',
    title: note,
    actor: { kind: 'user', userId: req.crmUser._id, label: req.crmUser.name },
  });
  return created(res, activity, 'Note added');
});

// PUT /crm/api/leads/:id
router.put('/:id', requirePermission('leads:update'), async (req, res) => {
  const lead = await CrmLead.findOne({ _id: req.params.id, deletedAt: null, ...scopeFilter(req) });
  if (!lead) return notFound(res, 'Lead');
  const FIELDS = ['name', 'email', 'phone', 'company', 'designation', 'message',
    'serviceInterest', 'budget', 'tags', 'rating'];
  for (const f of FIELDS) if (req.body[f] !== undefined) lead[f] = req.body[f];
  await lead.save();
  return ok(res, lead);
});

// PATCH /crm/api/leads/:id/status
router.patch('/:id/status', requirePermission('leads:update'), async (req, res) => {
  const { status, lostReason } = req.body;
  if (!LEAD_STATUSES.includes(status)) return bad(res, 'Invalid status');
  if (status === 'won') return bad(res, 'Use the convert endpoint to mark a lead as won');
  if (['lost', 'junk'].includes(status) && !lostReason) return bad(res, 'A reason is required when marking lost/junk');
  const lead = await CrmLead.findOne({ _id: req.params.id, deletedAt: null, ...scopeFilter(req) });
  if (!lead) return notFound(res, 'Lead');
  const from = lead.status;
  if (from === status) return ok(res, lead);
  lead.status = status;
  if (lostReason) lead.lostReason = lostReason;
  await lead.save();
  await timeline.record({
    entity: { kind: 'lead', id: lead._id },
    type: 'lead.status_changed',
    title: `Status changed: ${from} → ${status}${lostReason ? ` (${lostReason})` : ''}`,
    meta: { from, to: status },
    actor: { kind: 'user', userId: req.crmUser._id, label: req.crmUser.name },
  });
  await automation.emitEvent('lead.status_changed', {
    entityKind: 'lead', entityId: lead._id, data: { from, to: status },
  });
  return ok(res, lead);
});

// PATCH /crm/api/leads/:id/assign
router.patch('/:id/assign', requirePermission('leads:assign'), async (req, res) => {
  const { ownerId } = req.body;
  const lead = await CrmLead.findOne({ _id: req.params.id, deletedAt: null });
  if (!lead) return notFound(res, 'Lead');
  const owner = ownerId ? await CrmUser.findById(ownerId).lean() : null;
  if (ownerId && !owner) return bad(res, 'User not found');
  lead.ownerId = ownerId || null;
  lead.assignedAt = new Date();
  lead.assignedBy = req.crmUser._id;
  await lead.save();
  await timeline.record({
    entity: { kind: 'lead', id: lead._id },
    type: 'lead.assigned',
    title: owner ? `Assigned to ${owner.name}` : 'Unassigned',
    meta: { ownerId },
    actor: { kind: 'user', userId: req.crmUser._id, label: req.crmUser.name },
  });
  if (owner) {
    await notify.notify(owner._id, {
      type: 'lead.assigned',
      title: `Lead assigned to you: ${lead.name}`,
      entity: { kind: 'lead', id: lead._id },
    });
    await automation.emitEvent('lead.assigned', {
      entityKind: 'lead', entityId: lead._id, data: { ownerId: String(owner._id) },
    });
  }
  return ok(res, lead);
});

// POST /crm/api/leads/:id/convert  { company?: {name...}, deal?: {title, value, expectedCloseDate} }
router.post('/:id/convert', requirePermission('leads:convert'), async (req, res) => {
  const lead = await CrmLead.findOne({ _id: req.params.id, deletedAt: null, ...scopeFilter(req) });
  if (!lead) return notFound(res, 'Lead');
  if (lead.convertedContactId) return bad(res, 'Lead is already converted');

  // 1) Company (optional)
  let company = null;
  const companyName = (req.body.company && req.body.company.name) || lead.company;
  if (companyName) {
    company = await CrmCompany.findOne({ name: companyName, deletedAt: null });
    if (!company) {
      company = await CrmCompany.create({
        name: companyName, ownerId: lead.ownerId,
        ...(req.body.company || {}),
      });
    }
  }

  // 2) Contact
  const [firstName, ...rest] = String(lead.name).trim().split(/\s+/);
  const contact = await CrmContact.create({
    firstName, lastName: rest.join(' '),
    email: lead.email, phone: lead.phone,
    companyId: company ? company._id : undefined,
    designation: lead.designation,
    lifecycle: 'customer',
    originLeadId: lead._id,
    ownerId: lead.ownerId,
    tags: lead.tags,
  });

  // 3) Deal (optional)
  let deal = null;
  if (req.body.deal && req.body.deal.title) {
    const pipeline = await CrmPipeline.findOne(
      req.body.deal.pipelineId ? { _id: req.body.deal.pipelineId } : { isDefault: true }
    ).lean();
    const stageKey = req.body.deal.stageKey
      || (pipeline && pipeline.stages && pipeline.stages[0] && pipeline.stages[0].key);
    deal = await CrmDeal.create({
      title: req.body.deal.title,
      contactId: contact._id,
      companyId: company ? company._id : undefined,
      leadId: lead._id,
      pipelineId: pipeline ? pipeline._id : undefined,
      stageKey,
      value: Number(req.body.deal.value) || 0,
      expectedCloseDate: req.body.deal.expectedCloseDate,
      ownerId: lead.ownerId,
      stageHistory: [{ stageKey, enteredAt: new Date(), byUserId: req.crmUser._id }],
    });
  }

  // 4) Close the lead + link everything.
  lead.status = 'won';
  lead.convertedContactId = contact._id;
  lead.convertedDealId = deal ? deal._id : undefined;
  lead.convertedAt = new Date();
  await lead.save();

  // 5) Re-parent open work items + documents to the contact.
  await Promise.all([
    CrmTask.updateMany({ leadId: lead._id, status: { $in: ['open', 'in_progress'] } }, { $set: { contactId: contact._id } }),
    CrmFollowUp.updateMany({ leadId: lead._id, status: { $in: ['pending', 'snoozed'] } }, { $set: { contactId: contact._id } }),
    CrmDocument.updateMany({ 'entity.kind': 'lead', 'entity.id': lead._id }, { $set: { 'entity.kind': 'contact', 'entity.id': contact._id } }),
  ]);

  await timeline.record({
    entity: { kind: 'lead', id: lead._id },
    also: [{ kind: 'contact', id: contact._id }, ...(deal ? [{ kind: 'deal', id: deal._id }] : [])],
    type: 'lead.converted',
    title: `Lead converted to customer${deal ? ` with deal "${deal.title}"` : ''}`,
    meta: { contactId: contact._id, dealId: deal && deal._id },
    actor: { kind: 'user', userId: req.crmUser._id, label: req.crmUser.name },
  });
  await automation.emitEvent('lead.converted', {
    entityKind: 'lead', entityId: lead._id, data: { contactId: String(contact._id) },
  });

  return created(res, { lead, contact, company, deal }, 'Lead converted');
});

// DELETE /crm/api/leads/:id (soft delete)
router.delete('/:id', requirePermission('leads:delete'), async (req, res) => {
  const lead = await CrmLead.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    { $set: { deletedAt: new Date() } },
    { new: true }
  );
  if (!lead) return notFound(res, 'Lead');
  return ok(res, null);
});

module.exports = router;
