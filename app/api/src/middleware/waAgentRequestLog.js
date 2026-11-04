'use strict';

/**
 * One log line per request to the WhatsApp agent gateway.
 *
 *   [wa-agent] POST /book status=201 reason=ok wa_from=9190000000xx conv=abc123
 *
 * Winston adds the timestamp. The line carries the endpoint, the outcome, the
 * sender number and the agent's conversation id, and NOTHING ELSE — never the
 * body, an email address, or the key. The sender number is logged only when
 * it already looks like a phone number (10–15 digits); anything else is
 * logged as "-", so hostile input never reaches the log file verbatim.
 *
 * `reason` is captured by wrapping res.json for this request only: every
 * gateway response is `{ ok: true, … }` or `{ ok: false, reason, message }`,
 * so the outcome is read from what was actually sent, and a handler cannot
 * forget to record it.
 */

const logger = require('../utils/logger');

const CONVERSATION_HEADER = 'x-conversation-id';

const digitsOnly = (v) => (typeof v === 'string' && /^\d{10,15}$/.test(v) ? v : '-');

/** Keep a conversation id printable and bounded; "-" when absent or junk. */
const safeConversationId = (v) => {
  if (typeof v !== 'string') return '-';
  const cleaned = v.replace(/[^A-Za-z0-9_.:-]/g, '').slice(0, 64);
  return cleaned || '-';
};

const waAgentRequestLog = (req, res, next) => {
  let reason = '-';
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (body && typeof body === 'object') {
      reason = body.ok === true ? 'ok' : (typeof body.reason === 'string' ? body.reason : '-');
    }
    return originalJson(body);
  };

  res.on('finish', () => {
    const waFrom = digitsOnly(req.body && req.body.wa_from);
    const conv = safeConversationId(req.get(CONVERSATION_HEADER));
    logger.info(`[wa-agent] ${req.method} ${req.path} status=${res.statusCode} reason=${reason} wa_from=${waFrom} conv=${conv}`);
  });

  next();
};

module.exports = { waAgentRequestLog, safeConversationId, CONVERSATION_HEADER };
