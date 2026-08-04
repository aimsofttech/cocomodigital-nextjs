'use strict';

/**
 * Provider webhooks + email tracking — PUBLIC endpoints (no JWT).
 * Only active/meaningful when the matching provider is configured.
 */

const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { CrmMessage, CrmCall, CrmContact } = require('../models');
const messaging = require('../services/messaging');
const { verifyTwilioSignature } = require('../middleware/twilioSignature');
const { verifyMetaSignature } = require('../middleware/metaSignature');
const tw = require('../services/twilioVoice');
const engine = require('../services/callEngine');
const realtime = require('../realtime');
const logger = require('../../utils/logger');

/**
 * Collect MediaUrl0..MediaUrlN from a Twilio form-encoded webhook.
 * Twilio numbers them rather than repeating one key, so there is no array to
 * read — NumMedia says how many to look for.
 */
/**
 * Plain-language cause for the WhatsApp errors that actually reach an agent.
 * Kept alongside the numeric code, never instead of it — the number is what
 * Twilio's docs and support are indexed by.
 */
const WA_ERROR_HINT = {
  63003: 'Recipient not found on WhatsApp.',
  63007: 'TWILIO_WHATSAPP_FROM is not a valid WhatsApp sender on this account.',
  63015: 'Recipient has not joined the sandbox (send "join <code>" to +1 415 523 8886).',
  63016: 'Outside the 24-hour window — only an approved template delivers.',
  63018: 'WhatsApp rate limit reached.',
  63021: 'Template variables do not match the approved template.',
  63024: 'Template is not approved for this sender.',
  21211: 'Destination is not valid E.164.',
  21610: 'Recipient has opted out (replied STOP).',
};

const twilioMedia = (body) => {
  const n = Number(body.NumMedia) || 0;
  const urls = [];
  for (let i = 0; i < n; i++) if (body[`MediaUrl${i}`]) urls.push(body[`MediaUrl${i}`]);
  return urls;
};

/** Human label for a MIME type, so the inbox says "Photo" rather than image/jpeg. */
const MEDIA_LABEL = (mime = '') => {
  if (mime.startsWith('image/')) return '📷 Photo';
  if (mime.startsWith('video/')) return '🎬 Video';
  if (mime.startsWith('audio/')) return '🎤 Voice message';
  if (mime.includes('pdf')) return '📄 PDF';
  if (mime.startsWith('text/vcard') || mime.includes('vcard')) return '👤 Contact card';
  return '📎 Attachment';
};

/**
 * Readable text for ANY inbound WhatsApp message.
 *
 * Only plain text arrives in `Body`. A customer who replies with a photo, a
 * voice note, their location, or by tapping a quick-reply button sends a
 * payload with an empty Body — which rendered as a blank bubble, so the agent
 * saw that *something* arrived but not what. Every branch below produces
 * something an agent can act on; the raw payload is kept in statusHistory.
 */
const describeTwilioInbound = (b) => {
  const text = (b.Body || '').trim();
  if (text) return text;

  // Quick-reply / list selections (Twilio surfaces the tapped label).
  if (b.ButtonText) return `[tapped: ${b.ButtonText}]`;
  if (b.ButtonPayload) return `[tapped: ${b.ButtonPayload}]`;

  // Shared location.
  if (b.Latitude && b.Longitude) {
    const place = [b.Label, b.Address].filter(Boolean).join(' — ');
    return `📍 Location: ${place || `${b.Latitude}, ${b.Longitude}`}\n`
      + `https://maps.google.com/?q=${b.Latitude},${b.Longitude}`;
  }

  // Media with no caption.
  const n = Number(b.NumMedia) || 0;
  if (n > 0) {
    const labels = [];
    for (let i = 0; i < n; i++) labels.push(MEDIA_LABEL(b[`MediaContentType${i}`] || ''));
    return n === 1 ? labels[0] : `${labels.join(', ')} (${n} attachments)`;
  }

  // Reactions and other types we do not model yet — better named than blank.
  return '[unsupported message type]';
};

// The global limiter in server.js only covers /api/, so these public routes
// would otherwise be unthrottled. The cap sits far above real provider traffic
// (a 200-recipient bulk send produces ~400 status callbacks) and exists purely
// to blunt a flood against endpoints that write to the database.
router.use(rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: 'Too many webhook requests',
}));

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
router.post('/whatsapp', verifyMetaSignature, async (req, res) => {
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
          if (!newStatus || msg.status === 'replied') continue;
          // Same ordering guard as the Twilio path — Meta also redelivers.
          const RANK = { queued: 0, sent: 1, delivered: 2, read: 3 };
          const isFailure = newStatus === 'failed';
          if (!isFailure && msg.status === 'failed') continue;
          if (!isFailure && (RANK[newStatus] ?? -1) <= (RANK[msg.status] ?? -1)) continue;
          msg.status = newStatus;
          msg.statusHistory.push({ status: newStatus, at: new Date(), raw: st });
          if (isFailure) {
            const e = (st.errors || [])[0] || {};
            msg.failReason = [e.code && `Meta ${e.code}`, e.title, e.message]
              .filter(Boolean).join(' — ') || 'Delivery failed';
          }
          await msg.save();
          realtime.emitStatus(msg);
        }
        // Inbound messages.
        for (const im of value.messages || []) {
          const text = (im.text && im.text.body) || (im.button && im.button.text) || '';
          // Meta puts media behind a media id that needs a second authenticated
          // fetch, so only the id is recorded here — enough to retrieve later
          // without blocking the reply from reaching the agent now.
          const mediaId = (im.image && im.image.id) || (im.document && im.document.id)
            || (im.audio && im.audio.id) || (im.video && im.video.id) || null;
          await messaging.recordInbound('whatsapp', im.from, text, im, {
            providerMessageId: im.id,
            mediaUrls: mediaId ? [`meta-media:${mediaId}`] : [],
          });
        }
      }
    }
  } catch (err) {
    logger.error(`WhatsApp webhook error: ${err.message}`);
  }
});

/* ── Twilio ─────────────────────────────────────────────────────────────── */

// Every Twilio route below is signature-verified: without it anyone who learns
// the URL could forge inbound messages (auto-creating leads), flip delivery
// statuses, or POST "STOP" to opt arbitrary contacts out of WhatsApp.

// Inbound SMS (also handles STOP → opt-out).
router.post('/twilio/sms-inbound', verifyTwilioSignature, async (req, res) => {
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
    await messaging.recordInbound('sms', from, describeTwilioInbound(req.body), req.body, {
      providerMessageId: req.body.MessageSid || req.body.SmsMessageSid,
      mediaUrls: twilioMedia(req.body),
    });
  } catch (err) {
    logger.error(`Twilio SMS inbound error: ${err.message}`);
  }
});

// Inbound WhatsApp via Twilio. Twilio posts form-encoded fields, unlike Meta's
// JSON webhook above, so it needs its own route (also handles STOP → opt-out).
router.post('/twilio/whatsapp-inbound', verifyTwilioSignature, async (req, res) => {
  res.type('text/xml').send('<Response></Response>');
  try {
    const from = req.body.From || '';        // "whatsapp:+919770601469"
    const body = req.body.Body || '';
    if (/^\s*stop\s*$/i.test(body)) {
      const tail = String(from).replace(/[^\d]/g, '').slice(-10);
      await CrmContact.updateMany(
        { phone: new RegExp(`${tail}$`) },
        { $set: { whatsappOptIn: false }, $unset: { whatsappOptInAt: '', whatsappOptInSource: '' } }
      );
      logger.info(`WhatsApp STOP received from ${from} — whatsappOptIn disabled.`);
      return;
    }
    // Photos, voice notes, locations and button taps all arrive with an empty
    // Body — describe them so the agent sees what the customer actually sent.
    await messaging.recordInbound('whatsapp', from, describeTwilioInbound(req.body), req.body, {
      providerMessageId: req.body.MessageSid || req.body.SmsMessageSid,
      mediaUrls: twilioMedia(req.body),
    });
  } catch (err) {
    logger.error(`Twilio WhatsApp inbound error: ${err.message}`);
  }
});

// Outbound SMS + WhatsApp delivery status (matched on MessageSid, which Twilio
// sends identically for both channels).
router.post('/twilio/sms-status', verifyTwilioSignature, async (req, res) => {
  res.sendStatus(200);
  try {
    const msg = await CrmMessage.findOne({ providerMessageId: req.body.MessageSid });
    if (!msg) return;
    const map = {
      queued: 'queued', sent: 'sent', delivered: 'delivered',
      // WhatsApp reports blue ticks. Without this the CRM never advances past
      // "delivered" even though the customer has visibly read the message.
      read: 'read',
      failed: 'failed', undelivered: 'failed',
    };
    const newStatus = map[req.body.MessageStatus];
    if (!newStatus) return;

    // Twilio does not guarantee callback ordering, and retries replay old ones.
    // Without a rank check a late "sent" overwrites "read", so the inbox walks
    // backwards. Terminal states never regress.
    const RANK = { queued: 0, sent: 1, delivered: 2, read: 3 };
    const isFailure = newStatus === 'failed';
    if (!isFailure && msg.status === 'failed') return;
    if (!isFailure && (RANK[newStatus] ?? -1) <= (RANK[msg.status] ?? -1)) return;

    msg.status = newStatus;
    msg.statusHistory.push({ status: newStatus, at: new Date(), raw: req.body });
    // Twilio puts the reason in ErrorCode/ErrorMessage. Dropping them left the
    // UI showing a bare "failed" for the most common WhatsApp errors (63016
    // outside the window, 63015 sandbox not joined) with nothing to act on.
    if (isFailure) {
      const code = Number(req.body.ErrorCode) || null;
      msg.failReason = [code && `Twilio ${code}`, req.body.ErrorMessage, WA_ERROR_HINT[code]]
        .filter(Boolean).join(' — ') || 'Delivery failed';
    }
    await msg.save();
    realtime.emitStatus(msg);
  } catch (err) {
    logger.error(`Twilio SMS status error: ${err.message}`);
  }
});

/* ── Voice ─────────────────────────────────────────────────────────────────
 * Three separate callbacks, because Twilio reports three different things:
 *   call-status      lifecycle of the leg Twilio dialled (queued → completed)
 *   dial-status      lifecycle of the *child* leg created by <Dial> — for a
 *                    bridged call this is the customer, and it is the only
 *                    place we learn whether the customer actually answered
 *   recording-status the recording, which finishes after the call ends and so
 *                    arrives last, with no CallStatus attached
 *
 * All three ack immediately: Twilio retries anything slower than 15s, which
 * would double-process the event. */

/** Idempotency guard — Twilio re-delivers callbacks on timeout or 5xx. */
const alreadyTerminal = (call) => tw.TERMINAL_STATUSES.has(call.status) && call.endedAt;

router.post('/twilio/call-status', verifyTwilioSignature, async (req, res) => {
  res.sendStatus(200);
  try {
    const call = await CrmCall.findOne({ providerCallSid: req.body.CallSid });
    if (!call) {
      logger.warn(`Twilio call-status for unknown CallSid ${req.body.CallSid}`);
      return;
    }

    // Legacy shape: older calls were placed with the recording callback pointed
    // at this URL, so a recording payload can still land here. Handle it before
    // the status mapping or the URL is silently dropped.
    if (req.body.RecordingUrl && !req.body.CallStatus) {
      call.recordingUrl = `${req.body.RecordingUrl}.mp3`;
      call.recordingSid = req.body.RecordingSid || call.recordingSid;
      call.recordingDurationSec = Number(req.body.RecordingDuration) || call.recordingDurationSec;
      if (!call.durationSec) call.durationSec = Number(req.body.RecordingDuration) || 0;
      await call.save();
    realtime.emitCall(call);
      return;
    }

    const raw = req.body.CallStatus;
    const mapped = tw.mapStatus(raw);
    if (!mapped) return;

    if (mapped === 'in_progress' && !call.startedAt) call.startedAt = new Date();

    // Twilio sends ErrorCode on failures it could diagnose; keep both the code
    // and a human explanation so the UI never shows a bare number.
    if (req.body.ErrorCode) {
      const info = tw.describeError({ code: Number(req.body.ErrorCode), message: req.body.ErrorMessage });
      call.errorCode = info.errorCode;
      call.errorMessage = info.errorMessage;
    }
    if (req.body.AnsweredBy) call.answeredBy = req.body.AnsweredBy;
    if (req.body.Price) call.priceUsd = Math.abs(Number(req.body.Price)) || undefined;

    // On a bridged call the customer leg has already given the real verdict.
    // The parent leg here is the *agent*, and it reports "completed" whenever
    // the agent's own phone connected — even if the customer never picked up.
    // Letting it through would mark unanswered calls as successful
    // conversations and inflate every connect-rate number in the CRM.
    const childIsAuthoritative = call.mode === 'bridge' && Boolean(call.childReportedAt);

    if (!tw.TERMINAL_STATUSES.has(mapped)) {
      if (!childIsAuthoritative) call.status = mapped;
      await call.save();
    realtime.emitCall(call);
      return;
    }

    // Terminal. Re-delivery of an event we already finalised must not double
    // count the lead's callAttempts or fire the automation twice.
    if (alreadyTerminal(call)) return;

    if (!childIsAuthoritative) {
      call.status = mapped;
      // Likewise for talk time: the agent leg is measured from when we dialled
      // the agent, so it includes their ring time plus the customer's. Only the
      // customer leg is the actual conversation.
      if (req.body.CallDuration) call.durationSec = Number(req.body.CallDuration) || 0;
    }
    call.endedAt = new Date();
    await call.save();
    realtime.emitCall(call);

    await engine.finalizeCall(call);

    // Unanswered outbound attempts queue themselves for another try; the engine
    // decides whether the failure is worth repeating.
    if (call.direction === 'outbound' && !call.campaignId) {
      await engine.scheduleRetry(call).catch((e) => logger.error(`Retry scheduling failed: ${e.message}`));
    }
  } catch (err) {
    logger.error(`Twilio call status error: ${err.message}`);
  }
});

/**
 * Child-leg status for a bridged call. The parent leg (the agent) reports
 * "completed" even when the customer never picked up, so without this the CRM
 * would record every click-to-call as a successful conversation.
 */
router.post('/twilio/dial-status/:callId', verifyTwilioSignature, async (req, res) => {
  res.sendStatus(200);
  try {
    const call = await CrmCall.findById(req.params.callId);
    if (!call) return;
    const childStatus = req.body.CallStatus || req.body.DialCallStatus;
    const mapped = tw.mapStatus(childStatus);
    if (!mapped) return;

    if (mapped === 'in_progress' && !call.startedAt) call.startedAt = new Date();

    call.status = mapped;
    if (tw.TERMINAL_STATUSES.has(mapped)) {
      // The customer leg decides the real outcome and the real talk time.
      // Stamping this tells the parent-leg callback to keep its hands off.
      call.childReportedAt = new Date();
      const dur = Number(req.body.DialCallDuration || req.body.CallDuration) || 0;
      if (dur) call.durationSec = dur;
      if (req.body.ErrorCode) {
        const info = tw.describeError({ code: Number(req.body.ErrorCode), message: req.body.ErrorMessage });
        call.errorCode = info.errorCode;
        call.errorMessage = info.errorMessage;
      }
    }
    await call.save();
    realtime.emitCall(call);
  } catch (err) {
    logger.error(`Twilio dial status error: ${err.message}`);
  }
});

/**
 * Recording finished. Arrives after the call has already been finalised, so it
 * only patches the recording fields — it must never re-run finalizeCall.
 *
 * The stored URL points at our own proxy, not Twilio: Twilio's media URL needs
 * basic auth and would be useless in an <audio> tag.
 */
router.post('/twilio/recording-status', verifyTwilioSignature, async (req, res) => {
  res.sendStatus(200);
  try {
    // Match on the SIDs Twilio actually sent. Mongoose strips an `undefined`
    // value from a query, so passing a missing ParentCallSid straight through
    // would degrade the lookup to findOne({}) and staple customer audio onto an
    // unrelated scheduled call — every CRM has plenty of those with no SID.
    const sids = [req.body.CallSid, req.body.ParentCallSid].filter(Boolean);
    if (!sids.length) {
      logger.warn('Recording callback carried no CallSid — ignored');
      return;
    }
    const call = await CrmCall.findOne({ providerCallSid: { $in: sids } });
    if (!call) {
      logger.warn(`Recording callback for unknown call ${sids.join('/')}`);
      return;
    }
    if (req.body.RecordingStatus && req.body.RecordingStatus !== 'completed') return;

    call.recordingSid = req.body.RecordingSid;
    call.recordingDurationSec = Number(req.body.RecordingDuration) || 0;
    call.recordingUrl = tw.URLS.recordingProxy(call._id);
    if (!call.durationSec) call.durationSec = call.recordingDurationSec;
    await call.save();
    realtime.emitCall(call);
    logger.info(`Recording ${req.body.RecordingSid} stored for call ${call._id} (${call.recordingDurationSec}s)`);
  } catch (err) {
    logger.error(`Twilio recording status error: ${err.message}`);
  }
});

module.exports = router;
