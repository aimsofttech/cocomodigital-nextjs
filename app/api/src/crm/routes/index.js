'use strict';

/**
 * CRM API — mounted at /crm/api in server.js.
 * The CRM lives entirely under src/crm/ so the existing app is untouched
 * beyond the single mount line and the lead-ingestion hooks.
 */

const router = require('express').Router();
const { CrmMessage } = require('../models');

/* ── Public (no JWT): provider webhooks + email open tracking ───────────── */

router.use('/webhooks', require('./webhooks'));
// TwiML endpoints Twilio fetches mid-call. Public like the webhooks above, and
// signature-verified for the same reason.
router.use('/voice', require('./voice'));

// 1×1 gif email-open tracking pixel.
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
router.get('/t/open/:msgId', async (req, res) => {
  res.set('Content-Type', 'image/gif');
  res.set('Cache-Control', 'no-store');
  res.send(PIXEL);
  try {
    const msg = await CrmMessage.findById(req.params.msgId);
    if (msg && !msg.openedAt) {
      msg.openedAt = new Date();
      if (msg.status === 'sent') {
        msg.status = 'read';
        msg.statusHistory.push({ status: 'read', at: new Date(), raw: { via: 'pixel' } });
      }
      await msg.save();
    }
  } catch (_) { /* tracking must never error */ }
});

/* ── Auth + protected modules ───────────────────────────────────────────── */

router.use('/auth', require('./auth'));
router.use('/users', require('./users'));
router.use('/roles', require('./roles'));
router.use('/leads', require('./leads'));
router.use('/contacts', require('./contacts'));
router.use('/companies', require('./companies'));
router.use('/deals', require('./deals'));
router.use('/calls', require('./calls'));
router.use('/messages', require('./messages'));
router.use('/templates', require('./templates'));
router.use('/tasks', require('./tasks'));
router.use('/followups', require('./followups'));
router.use('/calendar', require('./calendar'));
router.use('/notifications', require('./notifications'));
router.use('/documents', require('./documents'));
router.use('/automations', require('./automations'));
router.use('/dashboard', require('./dashboard'));
router.use('/reports', require('./reports'));
router.use('/settings', require('./settings'));

module.exports = router;
