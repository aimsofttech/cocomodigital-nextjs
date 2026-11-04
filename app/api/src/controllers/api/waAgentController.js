'use strict';

/**
 * Handlers for the WhatsApp agent gateway (routes/api/waAgent.js).
 *
 * By the time a handler runs, req.body is the CLEANED copy produced by
 * validation/waAgent.js — every field present is a bounded, tag-free string.
 * Handlers map that onto the shared intake services the website uses, and
 * answer in the gateway's own shape: never a Mongoose document, never an
 * `_id`, never a stack trace.
 */

const crypto = require('crypto');
const { createContactEnquiry, createMeetingRequest } = require('../../services/leadIntake');
const { zonedTimeToUtc } = require('../../utils/timezone');

/** Where these records come from — stored on the record and sent to the CRM. */
const SOURCE_PAGE = 'whatsapp';
const CRM_CHANNEL_ENQUIRY = 'whatsapp_inbound';
/* Bookings keep the website's CRM channel on purpose (agreed in step 0): the
   CRM only creates the scheduled discovery call and its reminder for channel
   'meeting'. WhatsApp is recorded on the lead as sourcePage + raw.via. */
const BOOKING_SERVICE = 'Discovery Call'; // the website's default when no service was picked

/**
 * Short opaque reference the agent can quote back to the person. 8 characters
 * from an alphabet without look-alikes (no 0/O, 1/I/L), ~40 bits of entropy.
 * Not a database id and not derivable from one.
 */
const REF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newRef = () => {
  const bytes = crypto.randomBytes(8);
  let out = '';
  for (const b of bytes) out += REF_ALPHABET[b % REF_ALPHABET.length];
  return out;
};

/**
 * POST /api/wa-agent/enquiry
 *
 * The WhatsApp twin of the website's Contact Us form: same collection, same
 * owner email, same CRM mirror — with the sender's number as the phone, the
 * service as the subject, and a `[via WhatsApp · ref …]` prefix on the
 * message, the way the website prefixes `[Type: …]`, so the origin and the
 * reference are visible in the admin panel's message column and in the email.
 */
const enquiry = async (req, res) => {
  const { wa_from, name, email, service, message } = req.body;
  const ref = newRef();

  await createContactEnquiry({
    name,
    email,
    phone: wa_from,
    subject: service,
    message: `[via WhatsApp · ref ${ref}]\n\n${message}`,
    source_page: SOURCE_PAGE,
    channel: CRM_CHANNEL_ENQUIRY,
    raw: { via: 'whatsapp', wa_ref: ref },
  });

  res.status(201).json({ ok: true, ref });
};

/**
 * "Wed 11 Nov 2026, 3:00 PM IST" — the booked slot as the sender's clock
 * shows it, for the agent to relay.
 *
 * No single Intl locale yields both "IST" and "EST": en-US renders Kolkata as
 * "GMT+5:30", en-IN renders New York as "GMT-5". So the parts are assembled
 * by hand and the zone label comes from a small map first, then en-US's short
 * name (EST, EDT, PST, BST, GMT+4 …) as the fallback.
 */
const ZONE_LABELS = { 'Asia/Kolkata': 'IST', 'Asia/Calcutta': 'IST' };
const formatWhen = (date, timeZone) => {
  const parts = {};
  for (const p of new Intl.DateTimeFormat('en-US', {
    timeZone, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short',
  }).formatToParts(date)) parts[p.type] = p.value;
  const zone = ZONE_LABELS[timeZone] || parts.timeZoneName;
  return `${parts.weekday} ${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute} ${parts.dayPeriod} ${zone}`;
};

/**
 * POST /api/wa-agent/book
 *
 * The WhatsApp twin of the website's /ScheduleMeeting submit: same slot
 * rules, same `meetings` record with status "pending", same owner + visitor
 * emails, same CRM mirror (channel 'meeting', so the CRM schedules the
 * discovery call exactly as for a website booking). The sender's number is
 * the phone, the service is the website's default, and the notes carry a
 * `[via WhatsApp · ref …]` prefix like the website's own "Slot: …" line.
 * The founder still confirms in the admin panel; nothing here can.
 */
const book = async (req, res) => {
  const { wa_from, name, email, meeting_date, meeting_time, meeting_timezone, message } = req.body;
  const ref = newRef();

  // meeting_timezone is already a valid IANA zone and the date/time are
  // well-formed (validation), so this cannot be null.
  const startUtc = zonedTimeToUtc(meeting_date, meeting_time, meeting_timezone);

  const result = await createMeetingRequest({
    startUtc,
    visitorTz: meeting_timezone,
    meeting_date, meeting_time, meeting_timezone,
    name,
    email,
    phone: wa_from,
    service: BOOKING_SERVICE,
    source_page: SOURCE_PAGE,
    notes: `[via WhatsApp · ref ${ref}]${message ? `\n\n${message}` : ''}`,
    raw: { via: 'whatsapp', wa_ref: ref },
  });

  if (result.status === 'not_offered') {
    return res.status(400).json({ ok: false, reason: 'slot_not_offered', message: result.message });
  }
  if (result.status === 'taken') {
    return res.status(409).json({ ok: false, reason: 'slot_taken', message: result.message });
  }

  return res.status(201).json({
    ok: true,
    booking_ref: ref,
    status: 'pending',
    when: formatWhen(result.doc.meeting_start_utc, meeting_timezone),
  });
};

module.exports = { enquiry, book, newRef, formatWhen, SOURCE_PAGE, CRM_CHANNEL_ENQUIRY, BOOKING_SERVICE };
