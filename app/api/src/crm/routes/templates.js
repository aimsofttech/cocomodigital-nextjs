'use strict';

const router = require('express').Router();
const { CrmMessageTemplate, CrmLead } = require('../models');
const { crmProtect, requirePermission, audit } = require('../middleware/crmAuth');
const messaging = require('../services/messaging');
const { ok, created, bad, notFound, listOf } = require('./_helpers');

router.use(crmProtect, audit);

// Reading templates only needs send permission; managing needs templates:manage.
router.get('/', requirePermission('messages:read'), (req, res) => {
  const filter = {};
  if (req.query.channel) filter.channel = req.query.channel;
  if (req.query.active) filter.isActive = req.query.active === 'true';
  return listOf(CrmMessageTemplate, req, res, { filter, searchFields: ['name', 'body', 'subject'] });
});

// A Twilio Content SID always looks like HX + 32 hex characters. Catching a
// typo here beats discovering it as a failed send hours later.
const badContentSid = (sid) =>
  sid && !/^HX[0-9a-f]{32}$/i.test(String(sid).trim())
    ? 'twilioContentSid must look like HX followed by 32 hex characters'
    : null;

router.post('/', requirePermission('templates:manage'), async (req, res) => {
  const { name, channel, subject, body, category, waTemplateName, waLanguageCode, twilioContentSid } = req.body;
  if (!name || !channel || !body) return bad(res, 'name, channel and body are required');
  const sidError = badContentSid(twilioContentSid);
  if (sidError) return bad(res, sidError);
  const variables = [...String(body + ' ' + (subject || '')).matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]);
  const tpl = await CrmMessageTemplate.create({
    name, channel, subject, body, category,
    waTemplateName, waLanguageCode,
    twilioContentSid: channel === 'whatsapp' ? twilioContentSid : undefined,
    variables: [...new Set(variables)],
    createdBy: req.crmUser._id,
  });
  return created(res, tpl, 'Template created');
});

router.get('/:id', requirePermission('messages:read'), async (req, res) => {
  const tpl = await CrmMessageTemplate.findById(req.params.id).lean();
  if (!tpl) return notFound(res, 'Template');
  return ok(res, tpl);
});

// POST /crm/api/templates/:id/preview  { leadId? } — rendered with real data
router.post('/:id/preview', requirePermission('messages:read'), async (req, res) => {
  const tpl = await CrmMessageTemplate.findById(req.params.id).lean();
  if (!tpl) return notFound(res, 'Template');
  const lead = req.body.leadId
    ? await CrmLead.findById(req.body.leadId).lean()
    : await CrmLead.findOne({ deletedAt: null }).sort({ createdAt: -1 }).lean();
  const vars = await messaging.buildVars({ lead });
  return ok(res, {
    subject: messaging.renderTemplate(tpl.subject || '', vars),
    body: messaging.renderTemplate(tpl.body, vars),
    sampleLead: lead ? { id: lead._id, name: lead.name } : null,
  });
});

router.put('/:id', requirePermission('templates:manage'), async (req, res) => {
  const tpl = await CrmMessageTemplate.findById(req.params.id);
  if (!tpl) return notFound(res, 'Template');
  const sidError = badContentSid(req.body.twilioContentSid);
  if (sidError) return bad(res, sidError);
  const FIELDS = ['name', 'subject', 'body', 'category', 'isActive', 'waTemplateName',
    'waLanguageCode', 'twilioContentSid'];
  for (const f of FIELDS) if (req.body[f] !== undefined) tpl[f] = req.body[f];
  if (req.body.body !== undefined || req.body.subject !== undefined) {
    const variables = [...String(tpl.body + ' ' + (tpl.subject || '')).matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]);
    tpl.variables = [...new Set(variables)];
  }
  await tpl.save();
  return ok(res, tpl);
});

router.delete('/:id', requirePermission('templates:manage'), async (req, res) => {
  const tpl = await CrmMessageTemplate.findByIdAndDelete(req.params.id);
  if (!tpl) return notFound(res, 'Template');
  return ok(res, null);
});

module.exports = router;
