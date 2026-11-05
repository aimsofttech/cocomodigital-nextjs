'use strict';

/**
 * One log line per request to the WhatsApp agent gateway.
 *
 *   [wa-agent] POST /book status=201 reason=ok wa_from=9190000000xx conv=abc123
 *   [wa-agent] POST /book status=422 reason=invalid_input field=wa_from wa_from=- conv=-
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
 *
 * On a 422 the line also names WHICH field failed (`field=<schema key>`),
 * so a malformed call from the platform can be diagnosed from the log alone
 * (the platform keeps no action log of its own). It is the schema key only,
 * never the value: a 422 for wa_from still logs `wa_from=-`, because the
 * value was, by definition, not a plain phone number. The name is re-checked
 * here against the same shape validation uses, so nothing hostile can ride
 * into the log through it even if the response shape ever changes.
 */

const logger = require('../utils/logger');

const CONVERSATION_HEADER = 'x-conversation-id';

const digitsOnly = (v) => (typeof v === 'string' && /^\d{10,15}$/.test(v) ? v : '-');

/** A schema key as validation reports it: letters, digits, underscore, ≤40. */
const safeFieldName = (v) => (typeof v === 'string' && /^[A-Za-z0-9_]{1,40}$/.test(v) ? v : '-');

/** Keep a conversation id printable and bounded; "-" when absent or junk. */
const safeConversationId = (v) => {
  if (typeof v !== 'string') return '-';
  const cleaned = v.replace(/[^A-Za-z0-9_.:-]/g, '').slice(0, 64);
  return cleaned || '-';
};

const waAgentRequestLog = (req, res, next) => {
  let reason = '-';
  let field = null; // set only on invalid_input
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (body && typeof body === 'object') {
      reason = body.ok === true ? 'ok' : (typeof body.reason === 'string' ? body.reason : '-');
      field = reason === 'invalid_input' ? safeFieldName(body.field) : null;
    }
    return originalJson(body);
  };

  res.on('finish', () => {
    const waFrom = digitsOnly(req.body && req.body.wa_from);
    const conv = safeConversationId(req.get(CONVERSATION_HEADER));
    const fieldPart = field === null ? '' : ` field=${field}`;
    logger.info(`[wa-agent] ${req.method} ${req.path} status=${res.statusCode} reason=${reason}${fieldPart} wa_from=${waFrom} conv=${conv}`);
  });

  next();
};

module.exports = { waAgentRequestLog, safeConversationId, safeFieldName, CONVERSATION_HEADER };
