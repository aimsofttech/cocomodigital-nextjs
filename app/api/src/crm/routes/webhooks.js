'use strict';

/**
 * Provider webhooks + email tracking — PUBLIC endpoints (no JWT).
 * Only active/meaningful when the matching provider is configured.
 */

const router = require('express').Router();
const { CrmMessage, CrmCall, CrmContact } = require('../models');
const messaging = require('../services/messaging');
const logger = require('../../utils/logger');

/* ── WhatsApp Cloud API ─────────────────────────────────────────────────── */

// Meta verification handshake.
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token && token === process.env.WA_WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Delivery statuses + inbound messages.
router.post('/whatsapp', async (req, res) => {
  res.sendStatus(200);   // ack immediately; process async
  try {
    const entries = (req.body && req.body.entry) || [];
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        // Status updates for outbound messages.
        for (const st of value.statuses || []) {
          const msg = await CrmMessage.findOne({ providerMessageId: st.id });
          if (!msg) continue;
          const map = { sent: 'sent', delivered: 'delivered', read: 'read', failed: 'failed' };
          const newStatus = map[st.status];
          if (newStatus && msg.status !== 'replied') {
            msg.status = newStatus;
            msg.statusHistory.push({ status: newStatus, at: new Date(), raw: st });
            if (newStatus === 'failed') msg.failReason = JSON.stringify(st.errors || {});
            await msg.save();
          }
        }
        // Inbound messages.
        for (const im of value.messages || []) {
          const text = (im.text && im.text.body) || (im.button && im.button.text) || '';
          await messaging.recordInbound('whatsapp', im.from, text, im);
        }
      }
    }
  } catch (err) {
    logger.error(`WhatsApp webhook error: ${err.message}`);
  }
});

/* ── Twilio ─────────────────────────────────────────────────────────────── */

// Inbound SMS (also handles STOP → opt-out).
router.post('/twilio/sms-inbound', async (req, res) => {
  res.type('text/xml').send('<Response></Response>');
  try {
    const from = req.body.From;
    const body = req.body.Body || '';
    if (/^\s*stop\s*$/i.test(body)) {
      const tail = String(from).replace(/[^\d]/g, '').slice(-10);
      await CrmContact.updateMany({ phone: new RegExp(`${tail}$`) }, { $set: { smsOptIn: false } });
      logger.info(`SMS STOP received from ${from} — smsOptIn disabled.`);
      return;
    }
    await messaging.recordInbound('sms', from, body, req.body);
  } catch (err) {
    logger.error(`Twilio SMS inbound error: ${err.message}`);
  }
});

// Outbound SMS delivery status.
router.post('/twilio/sms-status', async (req, res) => {
  res.sendStatus(200);
  try {
    const msg = await CrmMessage.findOne({ providerMessageId: req.body.MessageSid });
    if (!msg) return;
    const map = { queued: 'queued', sent: 'sent', delivered: 'delivered', failed: 'failed', undelivered: 'failed' };
    const newStatus = map[req.body.MessageStatus];
    if (newStatus) {
      msg.status = newStatus;
      msg.statusHistory.push({ status: newStatus, at: new Date(), raw: req.body });
      await msg.save();
    }
  } catch (err) {
    logger.error(`Twilio SMS status error: ${err.message}`);
  }
});

// Voice call status (click-to-call lifecycle).
router.post('/twilio/call-status', async (req, res) => {
  res.sendStatus(200);
  try {
    const call = await CrmCall.findOne({ providerCallSid: req.body.CallSid });
    if (!call) return;
    const st = req.body.CallStatus;
    if (st === 'in-progress' && !call.startedAt) call.startedAt = new Date();
    if (['completed', 'no-answer', 'busy', 'failed', 'canceled'].includes(st)) {
      call.endedAt = new Date();
      call.durationSec = Number(req.body.CallDuration) || 0;
      call.status = st === 'completed' ? 'completed' : (st === 'busy' ? 'busy' : 'no_answer');
      if (req.body.RecordingUrl) call.recordingUrl = `${req.body.RecordingUrl}.mp3`;
      await call.save();
      const entityKind = call.leadId ? 'lead' : 'contact';
      const entityId = call.leadId || call.contactId;
      if (entityId) {
        await require('../services/timeline').record({
          entity: { kind: entityKind, id: entityId },
          type: 'call.logged',
          title: `Call ${call.status.replace('_', ' ')} (${Math.round((call.durationSec || 0) / 60)}m)`,
          meta: { callId: call._id, recordingUrl: call.recordingUrl },
          actor: { kind: 'system', label: 'Twilio' },
        });
        await require('../services/automation').emitEvent(
          call.status === 'completed' ? 'call.completed' : 'call.no_answer',
          { entityKind, entityId, data: { callId: String(call._id) } }
        );
      }
    } else {
      await call.save();
    }
  } catch (err) {
    logger.error(`Twilio call status error: ${err.message}`);
  }
});

module.exports = router;
