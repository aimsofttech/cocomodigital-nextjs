'use strict';

/**
 * Strict request validation for the WhatsApp agent gateway.
 *
 * Every field is treated as hostile. The rules (brief §4):
 *
 *   wa_from            10–15 digits only, no "+"
 *   name               2–80 chars, trimmed
 *   email              valid address, max 120 chars, lowercased
 *   meeting_date       YYYY-MM-DD, a real date, today or later (in the sender's zone)
 *   meeting_time       HH:MM:SS, 24-hour
 *   meeting_timezone   a valid IANA zone (Intl.DateTimeFormat accepts it)
 *   service            2–80 chars
 *   message            max 1,000 chars
 *
 * Plus, for every string: HTML tags stripped, control characters removed,
 * a value starting with "$" followed by a letter rejected (Mongo operator
 * shape), and any object or array where a string is expected rejected.
 * Unknown fields are rejected, not ignored. The body itself must be a plain
 * object.
 *
 * Hand-written on purpose: the API has no validation library, the brief
 * forbids new dependencies when an equivalent exists, and the rule set is
 * small and fixed. No regex here is applied to unbounded input before the
 * length cap, so none can be made slow.
 *
 * Result shape:
 *   { ok: true,  value: { …cleaned fields } }
 *   { ok: false, field: '<name>', message: '<one plain sentence>' }
 * The message names the field and its rule; it never echoes the value.
 */

const { isValidTimeZone, wallClockInZone } = require('../utils/timezone');
const { weekdayOf } = require('../utils/bookingWindow');

const MAX_RAW_STRING = 4096; // hard stop before any other string work

// ── primitive cleaners ───────────────────────────────────────────────────────

/** Something that reads as an HTML tag: "<" followed by a letter, "/", "!" or "?". */
const hasHtmlTag = (s) => /<[A-Za-z/!?]/.test(s);

/**
 * Remove tag-shaped spans ("<b …>", "</p>", "<!-- …") and then any stray
 * angle brackets. Only tag shapes take their span with them: "a < b > c"
 * becomes "a  b  c", not "a  c". Runs on a length-capped string.
 */
const stripHtml = (s) => s.replace(/<[A-Za-z/!?][^>]*>?/g, '').replace(/[<>]/g, '');

/** Drop control characters; keep \n and \t only when `multiline`. */
const stripControl = (s, multiline) =>
  multiline
    ? s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    : s.replace(/[\u0000-\u001F\u007F]/g, ' ');

/** "$gt", "$where …": the shape of a Mongo operator at the start of a value. */
const looksLikeOperator = (s) => /^\$[A-Za-z]/.test(s);

/** Sentinel returned by cleanString when the value carried HTML. */
const HTML = Symbol('html');

/**
 * Take a raw body value and return a cleaned string; `null` when it is not a
 * string at all (object, array, number, boolean, null, undefined); `HTML`
 * when it contained a tag.
 *
 * Tags are not silently laundered: "<script>alert(1)</script>" stripped would
 * be the perfectly valid name "alert(1)", and the brief's injection test
 * expects that input to FAIL, not to pass under a different value. So a tag
 * rejects the field; stray "<" / ">" without a tag shape are just removed.
 */
const cleanString = (raw, { multiline = false } = {}) => {
  if (typeof raw !== 'string') return null;
  const capped = raw.length > MAX_RAW_STRING ? raw.slice(0, MAX_RAW_STRING) : raw;
  if (hasHtmlTag(capped)) return HTML;
  return stripControl(stripHtml(capped), multiline).trim();
};

const NO_HTML = 'must not contain HTML.';

// ── field rules ──────────────────────────────────────────────────────────────
// Each rule: (raw, ctx) → { ok:true, value } | { ok:false, message }

const rules = {
  wa_from: (raw) => {
    const s = cleanString(raw);
    if (s === null) return bad('wa_from must be a string of digits.');
    if (s === HTML) return bad(`wa_from ${NO_HTML}`);
    if (!/^\d{10,15}$/.test(s)) return bad('wa_from must be 10 to 15 digits with no "+" or spaces.');
    return good(s);
  },

  name: (raw) => {
    const s = cleanString(raw);
    if (s === null) return bad('name must be a string.');
    if (s === HTML) return bad(`name ${NO_HTML}`);
    if (looksLikeOperator(s)) return bad('name is invalid.');
    if (s.length < 2 || s.length > 80) return bad('name must be 2 to 80 characters.');
    return good(s);
  },

  email: (raw) => {
    const s = cleanString(raw);
    if (s === null) return bad('email must be a string.');
    if (s === HTML) return bad(`email ${NO_HTML}`);
    const lower = s.toLowerCase();
    if (lower.length > 120) return bad('email must be at most 120 characters.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lower) || looksLikeOperator(lower)) {
      return bad('email must be a valid email address.');
    }
    return good(lower);
  },

  meeting_timezone: (raw) => {
    const s = cleanString(raw);
    if (s === null) return bad('meeting_timezone must be a string.');
    if (s === HTML) return bad(`meeting_timezone ${NO_HTML}`);
    if (s.length > 64 || !/^[A-Za-z][A-Za-z0-9_+\-/]*$/.test(s) || !isValidTimeZone(s)) {
      return bad('meeting_timezone must be a valid IANA timezone such as Asia/Kolkata.');
    }
    return good(s);
  },

  meeting_date: (raw, ctx) => {
    const s = cleanString(raw);
    if (s === null) return bad('meeting_date must be a string.');
    if (s === HTML) return bad(`meeting_date ${NO_HTML}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || weekdayOf(s) === null) {
      return bad('meeting_date must be a real date in YYYY-MM-DD format.');
    }
    // "Today" as the sender sees it. The slot validator later checks the exact
    // instant; this only stops obviously past dates early.
    const zone = ctx.meeting_timezone && isValidTimeZone(ctx.meeting_timezone) ? ctx.meeting_timezone : 'UTC';
    const today = wallClockInZone(new Date(), zone).date;
    if (s < today) return bad('meeting_date must be today or a later date.');
    return good(s);
  },

  meeting_time: (raw) => {
    const s = cleanString(raw);
    if (s === null) return bad('meeting_time must be a string.');
    if (s === HTML) return bad(`meeting_time ${NO_HTML}`);
    if (!/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(s)) {
      return bad('meeting_time must be in 24-hour HH:MM:SS format.');
    }
    return good(s);
  },

  service: (raw) => {
    const s = cleanString(raw);
    if (s === null) return bad('service must be a string.');
    if (s === HTML) return bad(`service ${NO_HTML}`);
    if (looksLikeOperator(s)) return bad('service is invalid.');
    if (s.length < 2 || s.length > 80) return bad('service must be 2 to 80 characters.');
    return good(s);
  },

  message: (raw) => {
    const s = cleanString(raw, { multiline: true });
    if (s === null) return bad('message must be a string.');
    if (s === HTML) return bad(`message ${NO_HTML}`);
    if (looksLikeOperator(s)) return bad('message is invalid.');
    if (s.length > 1000) return bad('message must be at most 1,000 characters.');
    return good(s);
  },
};

const good = (value) => ({ ok: true, value });
const bad = (message) => ({ ok: false, message });

// ── schemas ──────────────────────────────────────────────────────────────────
// Field order matters: the FIRST failing field is reported, and
// meeting_timezone is checked before meeting_date so "today" is known.

const SCHEMAS = {
  book: {
    required: ['wa_from', 'name', 'email', 'meeting_timezone', 'meeting_date', 'meeting_time'],
    optional: ['message'],
  },
  enquiry: {
    required: ['wa_from', 'name', 'email', 'service', 'message'],
    optional: [],
  },
};

/** A field name safe to put in a response: letters, digits, underscore, ≤40. */
const safeFieldName = (k) => (/^[A-Za-z0-9_]{1,40}$/.test(k) ? k : 'unknown');

/**
 * @param {'book'|'enquiry'} schemaName
 * @param {unknown} body  req.body as parsed by express.json
 * @returns {{ok:true, value:object} | {ok:false, field:string, message:string}}
 */
const validate = (schemaName, body) => {
  const schema = SCHEMAS[schemaName];
  if (!schema) throw new Error(`Unknown wa-agent schema: ${schemaName}`);

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, field: 'body', message: 'The request body must be a JSON object.' };
  }

  const known = new Set([...schema.required, ...schema.optional]);
  for (const key of Object.keys(body)) {
    if (!known.has(key)) {
      const f = safeFieldName(key);
      return { ok: false, field: f, message: `${f} is not an accepted field.` };
    }
  }

  const value = {};
  for (const field of [...schema.required, ...schema.optional]) {
    const present = Object.prototype.hasOwnProperty.call(body, field) && body[field] !== undefined && body[field] !== null;
    if (!present) {
      if (schema.required.includes(field)) {
        return { ok: false, field, message: `${field} is required.` };
      }
      continue;
    }
    const r = rules[field](body[field], value);
    if (!r.ok) return { ok: false, field, message: r.message };
    // An optional field that cleans to empty is simply absent.
    if (schema.optional.includes(field) && r.value === '') continue;
    // A required field that cleans to empty (e.g. only HTML tags) is missing.
    if (r.value === '') return { ok: false, field, message: `${field} is required.` };
    value[field] = r.value;
  }

  return { ok: true, value };
};

/**
 * Express middleware factory. On failure answers 422 with the first failing
 * field only; on success replaces req.body with the cleaned copy so handlers
 * never see raw input.
 */
const validateBody = (schemaName) => (req, res, next) => {
  const r = validate(schemaName, req.body);
  if (!r.ok) {
    return res.status(422).json({ ok: false, reason: 'invalid_input', field: r.field, message: r.message });
  }
  req.body = r.value;
  return next();
};

module.exports = { validate, validateBody, cleanString, stripHtml, hasHtmlTag, looksLikeOperator, SCHEMAS };
