'use strict';

/**
 * Validates Meta's `X-Hub-Signature-256` on the WhatsApp Cloud API webhook.
 *
 * The Twilio webhooks next door have been signature-checked from the start;
 * this one was not, which made it the soft spot in the whole messaging module.
 * The endpoint is public by necessity and it *writes*: an unsigned POST could
 * forge an inbound message (auto-creating a lead), mark a real outbound message
 * delivered or failed, and — because an inbound message is treated as consent —
 * manufacture a WhatsApp opt-in record for any number.
 *
 * Meta computes HMAC-SHA256 over the exact raw request body using the app
 * secret, so the parsed object is not enough; server.js stashes the raw buffer
 * for this route only.
 * https://developers.facebook.com/docs/graph-api/webhooks/getting-started#validate-payloads
 */

const crypto = require('crypto');
const logger = require('../../utils/logger');

const verifyMetaSignature = (req, res, next) => {
  const secret = process.env.WA_APP_SECRET;
  // Cloud API not wired up → nothing can be impersonating it. Twilio-only
  // installs (the common case here) never reach this route at all.
  if (!secret) return next();
  if (process.env.WA_VALIDATE_WEBHOOKS === 'false') return next();

  const header = req.get('X-Hub-Signature-256') || '';
  if (!header.startsWith('sha256=')) {
    logger.warn('Rejected WhatsApp Cloud webhook: no X-Hub-Signature-256 header');
    return res.sendStatus(403);
  }
  if (!req.rawBody) {
    // Fail closed. A missing raw body means the capture in server.js is not
    // running, and validating the re-serialised JSON would silently accept
    // payloads whose byte representation differs from what Meta signed.
    logger.error('WhatsApp Cloud webhook: raw body unavailable, cannot verify signature');
    return res.sendStatus(403);
  }

  const expected = `sha256=${crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex')}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    logger.warn('Rejected WhatsApp Cloud webhook with an invalid signature');
    return res.sendStatus(403);
  }
  return next();
};

module.exports = { verifyMetaSignature };
