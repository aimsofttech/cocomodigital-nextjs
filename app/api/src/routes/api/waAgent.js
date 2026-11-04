'use strict';

/**
 * WhatsApp agent gateway — mounted at /api/wa-agent.
 *
 * A small, key-protected, WRITE-ONLY surface called by the AiSensy WhatsApp
 * AI agent. It reuses the website's own booking and enquiry code paths so a
 * WhatsApp booking lands in the same collection, triggers the same owner
 * emails and mirrors to the CRM the same way, marked as coming from WhatsApp.
 *
 * ── Security rules (from the project brief; do not relax without review) ──
 *
 *  1. NO CRM ACCESS FROM THE GATEWAY. Nothing here logs into the CRM, holds a
 *     CRM token, or calls any URL under /crm/api. The CRM mirror happens only
 *     through the existing in-process service the website already uses.
 *
 *  2. NO READ ENDPOINTS. This router may CREATE bookings and enquiries. It
 *     must never list, search or return leads, contacts, bookings or
 *     messages. Do not add /my-booking or any lookup here.
 *
 *  3. NO CALENDAR INTEGRATION. No Google Calendar, Calendly or any calendar
 *     client is imported here. Availability comes from the existing schedule
 *     logic only. The founder's confirm step in the admin panel stays the ONLY
 *     path that creates a Meet link.
 *
 *  7. BOOKINGS ARE CREATED WITH status: "pending", exactly as the website
 *     does. The gateway never confirms, reschedules or cancels.
 *
 * Also: the agent key lives in env only (WA_AGENT_KEYS) and is never logged
 * or returned; responses carry no stack traces, internal ids, database field
 * names or other people's data; every request field is treated as hostile.
 *
 * Middleware order for every request (brief §4): body size limit → key check
 * → rate limits → schema validation → handler. Steps 3–6 add the middle
 * layers; this file keeps the order explicit as they land.
 */

const router = require('express').Router();
const logger = require('../../utils/logger');
const { waAgentAuth } = require('../../middleware/waAgentAuth');
const { waAgentRequestLog } = require('../../middleware/waAgentRequestLog');
const { waAgentBodyLimit } = require('../../middleware/waAgentBodyLimit');
const { validateBody } = require('../../validation/waAgent');

// ── request log line (installed first so every outcome, 401 included, is logged)
router.use(waAgentRequestLog);

// ── body size limit (16 KB) ─────────────────────────────────────────────────
router.use(waAgentBodyLimit);

// ── key check ───────────────────────────────────────────────────────────────
router.use(waAgentAuth);

// ── endpoints ───────────────────────────────────────────────────────────────

/** GET /api/wa-agent/health — key check only. */
router.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Handlers arrive in steps 4 (enquiry) and 5 (book). Until then a request that
// passes validation is answered 501 so the validation layer is testable end
// to end and nothing is written.
const notImplemented = (req, res) => {
  res.status(501).json({ ok: false, reason: 'not_implemented', message: 'This action is not available yet.' });
};

/** POST /api/wa-agent/enquiry — validated; handler lands in step 4. */
router.post('/enquiry', validateBody('enquiry'), notImplemented);

/** POST /api/wa-agent/book — validated; handler lands in step 5. */
router.post('/book', validateBody('book'), notImplemented);

// ── anything else under this prefix ────────────────────────────────────────
// Express's default 404 is an HTML page; the agent expects the gateway's JSON
// shape everywhere, and the HTML would name the path back to the caller.
router.use((req, res) => {
  res.status(404).json({ ok: false, reason: 'not_found', message: 'No such endpoint.' });
});

// ── router-local error handler ─────────────────────────────────────────────
// The app's shared errorHandler returns raw error messages and, on a
// duplicate-key error, the database field name. Nothing thrown inside this
// router may reach it: log the detail here, answer with a generic shape.
// Four parameters are what tells Express this is an error handler.
// eslint-disable-next-line no-unused-vars
router.use((err, req, res, next) => {
  logger.error(`[wa-agent] unhandled error on ${req.method} ${req.path}: ${err && err.message}`);
  if (res.headersSent) return;
  res.status(500).json({ ok: false, reason: 'server_error', message: 'Something went wrong. Please try again shortly.' });
});

module.exports = router;
