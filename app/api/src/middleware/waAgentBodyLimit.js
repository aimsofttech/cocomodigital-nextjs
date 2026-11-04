'use strict';

/**
 * 16 KB request-body ceiling for the WhatsApp agent gateway.
 *
 * The app parses every JSON body globally (server.js, 50 MB limit) before any
 * router runs, so a router-level express.json({ limit }) would never see the
 * bytes. This gate does what can still be done at that point:
 *
 *   1. Content-Length above the limit → 413, before any handler work.
 *   2. Backstop: the parsed body, re-serialised, above the limit → 413
 *      (covers a chunked request with no Content-Length).
 *
 * A caller can still make the global parser read up to 50 MB — the same
 * exposure every other /api route has today; nothing here widens it.
 */

const MAX_BODY_BYTES = 16 * 1024;

const tooLarge = (res) =>
  res.status(413).json({ ok: false, reason: 'payload_too_large', message: 'The request body must be under 16 KB.' });

const waAgentBodyLimit = (req, res, next) => {
  const declared = Number(req.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return tooLarge(res);

  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length) {
    let size = 0;
    try { size = Buffer.byteLength(JSON.stringify(req.body), 'utf8'); } catch { size = MAX_BODY_BYTES + 1; }
    if (size > MAX_BODY_BYTES) return tooLarge(res);
  }
  return next();
};

module.exports = { waAgentBodyLimit, MAX_BODY_BYTES };
