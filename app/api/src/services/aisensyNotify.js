'use strict';

/**
 * WhatsApp confirmation to the person who booked through the WhatsApp agent.
 *
 * When an admin confirms a meeting that was created by the AiSensy agent
 * (`source_page === 'whatsapp'`), the person gets one WhatsApp message in the
 * same chat with the bot: their name, the confirmed time in their own zone,
 * the booking reference and the Google Meet link. Email keeps going out
 * exactly as before; this is an addition, not a replacement.
 *
 * Transport: AiSensy's API Campaign endpoint. The bot number is a WhatsApp
 * Business API number managed by AiSensy, so only AiSensy can send from it.
 * Confirmations happen hours after the chat, outside WhatsApp's 24-hour
 * free-text window, so the campaign is backed by a Meta-approved Utility
 * template with four positional variables, in this order:
 *   {{1}} name   {{2}} when (visitor's zone)   {{3}} booking ref   {{4}} Meet link or fallback text
 * AiSensy rejects the call unless `templateParams` has exactly that many
 * entries, so every slot is always filled.
 *
 * Recipients: STRICTLY meetings created by the WhatsApp agent. Website
 * bookings never opted in to WhatsApp and are never messaged (decision,
 * 2026-11-06). The guard is here as well as at the call site.
 *
 * Like ./calendarService and ./mailer this degrades gracefully: not
 * configured, bad phone, network error or a non-200 from AiSensy are logged
 * and resolved as { sent: false, ... }. Nothing here ever throws into the
 * confirm handler, and nothing is sent unless BOTH env keys are set, so dev
 * and tests stay silent.
 *
 * Required .env to enable:
 *   AISENSY_API_KEY            Developer → API Campaign key
 *   AISENSY_CONFIRM_CAMPAIGN   name of the Live API campaign on the template
 * Optional:
 *   AISENSY_API_URL            default https://backend.aisensy.com/campaign/t1/api/v2
 *   AISENSY_TIMEOUT_MS         default 10000
 *
 * Docs: https://wiki.aisensy.com/en/articles/11501889-api-reference-docs
 */

const { formatInTimeZone, IST_TIMEZONE } = require('../utils/timezone');
const logger = require('../utils/logger');

const DEFAULT_API_URL = 'https://backend.aisensy.com/campaign/t1/api/v2';
const DEFAULT_TIMEOUT_MS = 10000;
const WHATSAPP_SOURCE = 'whatsapp';
const NO_LINK_TEXT = 'link to follow by email';
const PARAM_MAX = 200;

const isConfigured = () =>
  Boolean(process.env.AISENSY_API_KEY && process.env.AISENSY_CONFIRM_CAMPAIGN);

let warnedNotConfigured = false;
const warnOnce = () => {
  if (warnedNotConfigured) return;
  warnedNotConfigured = true;
  logger.warn('AiSensy: not configured (AISENSY_API_KEY/AISENSY_CONFIRM_CAMPAIGN) — WhatsApp confirmations disabled.');
};

// Meta rejects template parameters containing newlines, tabs or runs of
// spaces; AiSensy passes them straight through. Flatten to one line, drop
// control characters, cap the length so a long name cannot sink the send.
const cleanParam = (value, fallback = '-') => {
  const s = String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return fallback;
  return s.length > PARAM_MAX ? `${s.slice(0, PARAM_MAX - 1)}…` : s;
};

// The agent stores its reference only as the `[via WhatsApp · ref XXXXXXXX]`
// prefix on the meeting notes (see controllers/api/waAgentController.js).
const refFromNotes = (notes) => {
  const m = /\[via WhatsApp · ref ([A-Z0-9]{4,16})\]/.exec(String(notes || ''));
  return m ? m[1] : '';
};

// "Nov 07, 2026 · 3:30 PM (Asia/Kolkata)" — the visitor's own zone, same
// rendering the confirmation email uses; IST when the booking has no zone.
const whenText = (booking) => {
  const zone = booking.meeting_timezone || IST_TIMEZONE;
  const r = formatInTimeZone(booking.meeting_start_utc, zone)
    || formatInTimeZone(booking.meeting_start_utc, IST_TIMEZONE);
  if (!r) return '';
  return `${r.date} · ${r.time} (${zone})`;
};

// Same rule as the gateway: 10–15 digits, nothing else. The agent stores it
// that way; anything else is not a number we should message.
const destinationOf = (phone) => {
  const digits = String(phone || '').trim();
  return /^\d{10,15}$/.test(digits) ? `+${digits}` : null;
};

/**
 * Build the AiSensy request body for a confirmed meeting. Pure, exported for
 * tests. `apiKey` is added by the sender, never here.
 */
const confirmPayload = (booking) => ({
  campaignName: process.env.AISENSY_CONFIRM_CAMPAIGN,
  destination: destinationOf(booking.phone),
  userName: cleanParam(booking.name || booking.userName, 'there'),
  templateParams: [
    cleanParam(booking.name || booking.userName, 'there'),
    cleanParam(whenText(booking), 'the agreed time'),
    cleanParam(refFromNotes(booking.notes), 'in your email'),
    cleanParam(booking.meetLink, NO_LINK_TEXT),
  ],
  source: 'cocoma-api-confirm',
});

const redactKey = (text) => {
  const key = process.env.AISENSY_API_KEY;
  const s = String(text || '').replace(/\s+/g, ' ').slice(0, 160);
  return key ? s.split(key).join('[key]') : s;
};

const post = async (body) => {
  const controller = new AbortController();
  const timeoutMs = Number(process.env.AISENSY_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(process.env.AISENSY_API_URL || DEFAULT_API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ apiKey: process.env.AISENSY_API_KEY, ...body }),
      signal: controller.signal,
    });
    const text = await res.text().catch(() => '');
    return { status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Send the WhatsApp confirmation for one confirmed meeting. Never throws.
 *
 * @param {object} booking  the shape `meetingFields()` in the admin meeting
 *   controller produces: name, phone, notes, meetLink, meeting_start_utc,
 *   meeting_timezone, source_page, meetingId
 * @returns {Promise<{sent:boolean, skipped?:boolean, reason?:string, http?:number}>}
 */
const sendMeetingConfirmedWhatsapp = async (input) => {
  // A default parameter does not cover null; normalise so nothing below can throw.
  const booking = input && typeof input === 'object' ? input : {};
  const id = booking.meetingId || '-';
  const ref = refFromNotes(booking.notes) || '-';
  const done = (result, extra = '') => {
    const state = result.sent ? 'sent' : result.skipped ? 'skipped' : 'failed';
    const line = `[aisensy] confirm status=${state}${result.reason ? ` reason=${result.reason}` : ''}${result.http ? ` http=${result.http}` : ''} ref=${ref} meeting=${id}${extra}`;
    if (state === 'failed') logger.error(line); else logger.info(line);
    return result;
  };

  if (booking.source_page !== WHATSAPP_SOURCE) return done({ sent: false, skipped: true, reason: 'not_whatsapp' });
  if (!isConfigured()) { warnOnce(); return done({ sent: false, skipped: true, reason: 'not_configured' }); }

  const payload = confirmPayload(booking);
  if (!payload.destination) return done({ sent: false, skipped: true, reason: 'bad_phone' });

  try {
    const { status, text } = await post(payload);
    if (status === 200) return done({ sent: true, http: status }, ` to=${payload.destination.slice(1)}`);
    return done({ sent: false, reason: 'rejected', http: status }, ` to=${payload.destination.slice(1)} body="${redactKey(text)}"`);
  } catch (err) {
    const reason = err.name === 'AbortError' ? 'timeout' : 'network';
    return done({ sent: false, reason }, ` to=${payload.destination.slice(1)} error="${redactKey(err.message)}"`);
  }
};

module.exports = {
  sendMeetingConfirmedWhatsapp,
  confirmPayload,
  isConfigured,
  refFromNotes,
  cleanParam,
  whenText,
  NO_LINK_TEXT,
  WHATSAPP_SOURCE,
};
