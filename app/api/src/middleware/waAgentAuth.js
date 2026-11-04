'use strict';

/**
 * Shared-secret check for the WhatsApp agent gateway (/api/wa-agent).
 *
 * The caller (the AiSensy AI agent's API action) sends `X-Agent-Key`. Valid
 * keys come from WA_AGENT_KEYS, a comma-separated list, so an old and a new
 * key can both be live while the action is being rotated. Keys are read at
 * request time: rotate by editing the env and restarting, nothing else.
 *
 * Comparison is constant-time per candidate (length check, then
 * crypto.timingSafeEqual) so the response time does not reveal how much of a
 * guess matched. A missing or wrong key gets a bare 401 with no hint about
 * which. The key is never logged and never echoed; a 401 is logged with the
 * source IP and the first 4 characters of the attempt, nothing more.
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

const HEADER = 'x-agent-key';

/** Configured keys, trimmed, empties dropped. */
const configuredKeys = () =>
  String(process.env.WA_AGENT_KEYS || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

const safeEqual = (a, b) => {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

/** True when `attempt` matches any configured key. */
const isValidKey = (attempt) => {
  if (typeof attempt !== 'string' || attempt.length === 0) return false;
  // No early return on the first match: every configured key is compared, so
  // the time taken does not depend on which key matched.
  let matched = false;
  for (const key of configuredKeys()) {
    if (safeEqual(attempt, key)) matched = true;
  }
  return matched;
};

const unauthorized = (res) =>
  res.status(401).json({ ok: false, reason: 'unauthorized', message: 'Invalid or missing agent key.' });

const waAgentAuth = (req, res, next) => {
  const raw = req.get(HEADER);
  // A repeated header arrives as an array in some stacks; treat that as invalid.
  const attempt = typeof raw === 'string' ? raw.trim() : '';

  if (configuredKeys().length === 0) {
    logger.error('[wa-agent] WA_AGENT_KEYS is not set — every request is refused.');
    return unauthorized(res);
  }
  if (!isValidKey(attempt)) {
    logger.warn(`[wa-agent] 401 ip=${req.ip} key_prefix=${attempt ? attempt.slice(0, 4) : '(none)'}`);
    return unauthorized(res);
  }
  return next();
};

module.exports = { waAgentAuth, isValidKey, configuredKeys, HEADER };
