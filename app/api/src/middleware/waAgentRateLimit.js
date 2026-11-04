'use strict';

/**
 * Rate limits and the duplicate-booking guard for the WhatsApp agent gateway.
 *
 *   global cap        200 requests / hour for the whole gateway, any sender,
 *                     any endpoint (health included). express-rate-limit with
 *                     one fixed key and its memory store: a restart loosens at
 *                     most one hour's window, which is acceptable here.
 *   per-sender quota  3 bookings and 5 enquiries per wa_from per rolling 24 h,
 *                     counted on SUCCESSFUL writes (a 409 or 400 does not use
 *                     up a person's allowance) and stored in Mongo
 *                     (wa_agent_quotas, TTL 24 h) so a deploy cannot reset it.
 *   idempotency       a repeat /book with the same wa_from, meeting_date and
 *                     meeting_time within 2 minutes gets the first 201 body
 *                     back — same booking_ref, no second record, no second
 *                     set of emails, and it does not count against the quota.
 *
 * The per-sender pieces run AFTER validation (they need a clean wa_from) and
 * BEFORE the handler; the handler calls `recordEvent` once it has a 201.
 * The gateway's existing `/api/` IP limiter (500 / 15 min) still applies on
 * top of all of this.
 */

const rateLimit = require('express-rate-limit');
const WaAgentQuota = require('../models/WaAgentQuota');

const GLOBAL_PER_HOUR = 200;
const PER_SENDER = { book: 3, enquiry: 5 };
const QUOTA_WINDOW_MS = 24 * 60 * 60 * 1000;
const IDEMPOTENCY_WINDOW_MS = 2 * 60 * 1000;

const GLOBAL_KEY = 'wa-agent';

const limited = (res, message) =>
  res.status(429).json({ ok: false, reason: 'rate_limited', message });

/** 200 / hour across the whole gateway. */
const globalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: GLOBAL_PER_HOUR,
  keyGenerator: () => GLOBAL_KEY,
  standardHeaders: false,
  legacyHeaders: false,
  handler: (req, res) => limited(res, 'The service is busy right now. Please try again in a few minutes.'),
  // The key is deliberately not an IP, so switch off the IP-related checks.
  validate: { ip: false, trustProxy: false, xForwardedForHeader: false, default: true },
});

const QUOTA_MESSAGES = {
  book: 'You have reached the limit of booking requests for today. Please try again tomorrow, or contact us another way.',
  enquiry: 'You have reached the limit of enquiries for today. Please try again tomorrow, or contact us another way.',
};

/** Refuse when `wa_from` already has its 24-hour allowance of `kind`. */
const senderQuota = (kind) => async (req, res, next) => {
  const since = new Date(Date.now() - QUOTA_WINDOW_MS);
  const used = await WaAgentQuota.countDocuments({ kind, wa_from: req.body.wa_from, createdAt: { $gt: since } });
  if (used >= PER_SENDER[kind]) return limited(res, QUOTA_MESSAGES[kind]);
  return next();
};

/** Replay a booking made in the last 2 minutes for the same sender + slot. */
const idempotentBooking = async (req, res, next) => {
  const { wa_from, meeting_date, meeting_time } = req.body;
  const since = new Date(Date.now() - IDEMPOTENCY_WINDOW_MS);
  const prior = await WaAgentQuota.findOne({
    kind: 'book', wa_from, meeting_date, meeting_time, createdAt: { $gt: since },
  }).sort({ createdAt: -1 }).lean();
  if (prior && prior.result) return res.status(201).json(prior.result);
  return next();
};

/**
 * Record a successful write. Awaited by the handler before it answers, so a
 * repeat that arrives right after the first response is already visible.
 */
const recordEvent = ({ kind, wa_from, ref, meeting_date, meeting_time, result }) =>
  WaAgentQuota.create({ kind, wa_from, ref, meeting_date, meeting_time, result });

module.exports = {
  globalLimiter, senderQuota, idempotentBooking, recordEvent,
  GLOBAL_PER_HOUR, PER_SENDER, QUOTA_WINDOW_MS, IDEMPOTENCY_WINDOW_MS, GLOBAL_KEY,
};
