'use strict';

/**
 * Lead intake — the ONE place a website enquiry (and, from the WhatsApp
 * gateway, a WhatsApp enquiry) is written, announced and mirrored.
 *
 * Extracted verbatim from the `contact` handler in
 * controllers/api/contactController.js so the gateway can reuse the exact
 * sequence instead of copying it. The handler keeps its request parsing,
 * its 400 check and its response shape; only the three calls below moved.
 *
 * Sequence (unchanged):
 *   1. ContactUs.create
 *   2. owner notification email — fire-and-forget, never fails the request
 *   3. CRM mirror via the in-process ingest — fire-and-forget, never throws
 *
 * Website callers pass exactly what they always did; the two optional
 * fields (`source_page`, `channel`) default so that an unchanged caller
 * produces an unchanged record, email and CRM lead.
 */

const ContactUs = require('../models/ContactUs');
const Meeting = require('../models/Meeting');
const { sendContactEnquiryEmail, sendMeetingRequestEmails } = require('./bookingMailer');
const { ingestSafe: crmIngest } = require('../crm/services/leadIngest');
const { wallClockInZone } = require('../utils/timezone');
const { validateBookingInstant, slotKeyOf } = require('../utils/bookingWindow');
const logger = require('../utils/logger');

/**
 * @param {object} input
 * @param {string} input.name
 * @param {string} input.email
 * @param {string} [input.phone]
 * @param {string} [input.subject]
 * @param {string} input.message
 * @param {string} [input.source_page]  stored on the record only when given
 *   (ContactUs is strict:false); absent for website submissions, as before
 * @param {string} [input.channel='contact_form']  CRM source channel
 * @param {object} [input.raw]  extra CRM `source.raw` keys, merged after `subject`
 * @returns {Promise<import('mongoose').Document>} the saved ContactUs document
 */
const createContactEnquiry = async ({ name, email, phone, subject, message, source_page, channel, raw }) => {
  const doc = await ContactUs.create({
    name, email, phone, subject, message,
    ...(source_page ? { source_page } : {}),
  });

  // Notify the owner. Deliberately not awaited: the lead is already saved, so a
  // slow or failing SMTP must not delay or fail the submit. sendMail logs its
  // own success/failure and never throws; the catch here is only for an
  // unexpected error while building the message.
  sendContactEnquiryEmail({
    name, email, phone, subject, message, createdAt: doc.createdAt,
  }).catch((err) => {
    logger.error(`Contact enquiry email failed for ${email}: ${err.message}`);
  });

  // Mirror the enquiry into the CRM as a lead. Fire-and-forget and internally
  // guarded — the submit must never fail because the CRM is busy.
  crmIngest({
    channel: channel || 'contact_form', externalCollection: 'contact_us', externalId: doc._id,
    name, email, phone, message,
    serviceInterest: subject,
    ...(source_page ? { sourcePage: source_page } : {}),
    raw: { subject, ...(raw || {}) },
  });

  return doc;
};

/**
 * Create a PENDING meeting request for a resolved UTC instant.
 *
 * Extracted verbatim from the meeting branch of `freeConsultation` in
 * controllers/api/contactController.js. The handler still resolves the
 * instant (including its fallback to a client-sent meeting_start_utc) and
 * still owns its response shapes; this holds the sequence every booking goes
 * through, whoever the caller is:
 *
 *   1. the authoritative slot gate (closed day, blocked date, off-grid time,
 *      past / inside minimum notice)                       → 'not_offered'
 *   2. is the slot already held, pending or confirmed?     → 'taken'
 *   3. Meeting.create with status 'pending' — never anything else here
 *   4. duplicate-key on the slot_hold index (two callers raced past step 2)
 *                                                           → 'taken'
 *   5. owner + visitor "request received" emails — fire-and-forget
 *   6. CRM mirror, channel 'meeting' — fire-and-forget
 *
 * No calendar call, no Meet link: those happen only when an admin confirms.
 *
 * @param {object} input
 * @param {Date}   input.startUtc           the instant being booked
 * @param {string|null} input.visitorTz     a VALID IANA zone, or null when the
 *   caller's zone was unusable — then the wall-clock is re-derived in the
 *   studio's zone so date, time and zone always describe the same instant
 * @param {string} [input.meeting_date]     wall-clock as the visitor sent it
 * @param {string} [input.meeting_time]
 * @param {string} [input.meeting_timezone] as sent (raw; may be invalid — it
 *   is recorded in the CRM's raw payload exactly as received, as before)
 * @param {string} input.name
 * @param {string} input.email
 * @param {string} [input.phone]
 * @param {string} [input.company]
 * @param {string} [input.service]
 * @param {string} [input.source_page]
 * @param {string} [input.notes]
 * @param {string} [input.message]          used when notes is empty
 * @param {object} [input.raw]              extra CRM `source.raw` keys
 * @returns {Promise<
 *   {status:'created', doc: import('mongoose').Document} |
 *   {status:'not_offered', message:string} |
 *   {status:'taken', message:string}>}
 *   `message` is plain and safe to show to the caller.
 */
const createMeetingRequest = async ({
  startUtc, visitorTz, meeting_date, meeting_time, meeting_timezone,
  name, email, phone, company, service, source_page, notes, message, raw,
}) => {
  /* Enforce the admin's availability server-side. The picker already hides
     disabled days and slots, but the endpoints are reachable directly, so the
     UI's rule cannot be the only one. The check runs on the UTC instant, not
     on the wall-clock fields, so a caller cannot side-step it by stating a
     timezone they aren't in. */
  const slotCheck = await validateBookingInstant(startUtc);
  if (!slotCheck.ok) {
    return { status: 'not_offered', message: slotCheck.message };
  }

  const slot_key = slotKeyOf(startUtc);
  const taken = await Meeting.findOne({ slot_key, status: { $in: ['pending', 'confirmed'] } }).lean();
  if (taken) {
    return { status: 'taken', message: 'That time slot is no longer available. Please pick another.' };
  }

  /* Without a usable visitor zone, the stored wall-clock is re-derived in the
     studio's zone so date, time and zone always describe the same instant —
     the visitor's emails then show the slot in studio time, labelled as such. */
  const storedTz = visitorTz || slotCheck.config.timezone;
  const wall = visitorTz ? null : wallClockInZone(startUtc, storedTz);

  let doc;
  try {
    doc = await Meeting.create({
      userName: name,
      email,
      phone,
      companyName: company,
      meetingDate: wall ? wall.date : meeting_date,
      meetingTime: wall ? wall.time : meeting_time,
      meetingTimezone: storedTz,
      meeting_start_utc: startUtc,
      slot_key,
      duration: 15,
      notes: notes || message,
      service,
      source_page,
      status: 'pending',
    });
  } catch (err) {
    if (err && err.code === 11000) {
      return { status: 'taken', message: 'That time slot was just booked. Please pick another.' };
    }
    throw err;
  }

  // Not awaited — the slot is already reserved; sendMail logs its own
  // delivery result, this catch only covers a failure building the message.
  sendMeetingRequestEmails({
    name, email: doc.email, phone, companyName: company, service, notes: doc.notes,
    meeting_date: doc.meetingDate,
    meeting_time: doc.meetingTime,
    meeting_timezone: doc.meetingTimezone,
    meeting_start_utc: doc.meeting_start_utc,
    createdAt: doc.createdAt,
    meetingId: doc._id.toString(),
  }).catch((err) => logger.error(`Meeting request emails failed for meeting ${doc._id}: ${err.message}`));

  crmIngest({
    channel: 'meeting', externalCollection: 'meetings', externalId: doc._id,
    name, email, phone, company, message: notes || message,
    serviceInterest: service, sourcePage: source_page,
    meetingStartUtc: doc.meeting_start_utc,
    raw: { meeting_date, meeting_time, meeting_timezone, ...(raw || {}) },
  });

  return { status: 'created', doc };
};

module.exports = { createContactEnquiry, createMeetingRequest };
