'use strict';

const router = require('express').Router();
const { CrmAuditLog, CrmJob } = require('../models');
const { crmProtect, requirePermission } = require('../middleware/crmAuth');
const settings = require('../services/settings');
const messaging = require('../services/messaging');
const mailer = require('../../services/mailer');
const { ok, parsePaging } = require('./_helpers');

router.use(crmProtect);

// GET /crm/api/settings — general settings + provider readiness (safe booleans only)
router.get('/', requirePermission('settings:manage'), async (req, res) => {
  const value = await settings.getSettings();
  return ok(res, {
    settings: value,
    providers: {
      email: mailer.isConfigured(),
      whatsappCloud: messaging.waCloudConfigured(),
      whatsappTwilio: messaging.twilioWhatsappConfigured(),
      // Free fallback — only in play when no automatic provider is configured.
      whatsappLinkMode: !messaging.waCloudConfigured() && !messaging.twilioWhatsappConfigured(),
      smsTwilio: messaging.twilioConfigured(),
      smsMsg91: messaging.msg91Configured(),
      voiceTwilio: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_VOICE_FROM),
    },
  });
});

// PUT /crm/api/settings
router.put('/', requirePermission('settings:manage'), async (req, res) => {
  const ALLOWED = ['timezone', 'quietHoursStart', 'quietHoursEnd', 'assignmentStrategy',
    'emailTracking', 'idleLeadDays', 'followupEscalateHours',
    'automationDailyCapPerEntity', 'defaultCountryCode',
    // WhatsApp compliance switches — without these here the defaults in
    // services/settings.js could never be changed from the UI.
    'automatedWhatsappEnabled', 'requireExplicitWhatsappOptIn'];
  const patch = {};
  for (const k of ALLOWED) if (req.body[k] !== undefined) patch[k] = req.body[k];
  const value = await settings.updateSettings(patch);
  return ok(res, value);
});

// GET /crm/api/settings/jobs — scheduler health (recent + failed jobs)
router.get('/jobs', requirePermission('settings:manage'), async (req, res) => {
  const [pending, failed, recent] = await Promise.all([
    CrmJob.countDocuments({ status: 'pending' }),
    CrmJob.find({ status: 'failed' }).sort({ updatedAt: -1 }).limit(20).lean(),
    CrmJob.find().sort({ updatedAt: -1 }).limit(20).lean(),
  ]);
  return ok(res, { pending, failed, recent });
});

// GET /crm/api/settings/audit-logs
router.get('/audit-logs', requirePermission('audit:read'), async (req, res) => {
  const { page, limit, skip } = parsePaging(req, 30);
  const q = {};
  if (req.query.userId) q.userId = req.query.userId;
  const [items, total] = await Promise.all([
    CrmAuditLog.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    CrmAuditLog.countDocuments(q),
  ]);
  return ok(res, items, { page, limit, total });
});

module.exports = router;
