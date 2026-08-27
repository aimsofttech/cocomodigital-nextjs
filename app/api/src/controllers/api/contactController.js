const ContactUs = require('../../models/ContactUs');
const FreeConsultationItem = require('../../models/FreeConsultationItem');
const Meeting = require('../../models/Meeting');
const { sendBookingEmails, sendMeetingRequestEmails, sendContactEnquiryEmail } = require('../../services/bookingMailer');
const { zonedTimeToUtc, isValidTimeZone } = require('../../utils/timezone');
const {
  getAvailabilityConfig,
  slotsForViewerDate,
  openViewerDatesInRange,
  validateBookingInstant,
  addDays,
} = require('../../utils/bookingWindow');
const { ingestSafe: crmIngest } = require('../../crm/services/leadIngest');
const logger = require('../../utils/logger');

const contact = async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ status: 'error', message: 'Name, email, and message are required' });
  const doc = await ContactUs.create({ name, email, phone, subject, message });

  // Notify the owner. Deliberately not awaited: the lead is already saved, so a
  // slow or failing SMTP must not delay or fail the visitor's submit. sendMail
  // logs its own success/failure and never throws; the catch here is only for
  // an unexpected error while building the message.
  sendContactEnquiryEmail({
    name, email, phone, subject, message, createdAt: doc.createdAt,
  }).catch((err) => {
    logger.error(`Contact enquiry email failed for ${email}: ${err.message}`);
  });

  // Mirror the enquiry into the CRM as a lead. Fire-and-forget and internally
  // guarded — the visitor's submit must never fail because the CRM is busy.
  crmIngest({
    channel: 'contact_form', externalCollection: 'contact_us', externalId: doc._id,
    name, email, phone, message,
    serviceInterest: subject,
    raw: { subject },
  });

  res.status(201).json({ status: 'success', message: 'Message sent successfully', data: doc });
};

const slotKeyOf = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 16);
};

/** Slot keys already taken (pending or confirmed) among the ones asked about. */
const bookedKeysAmong = async (slotKeys) => {
  if (!slotKeys.length) return new Set();
  const docs = await Meeting.find({
    slot_key: { $in: slotKeys },
    status: { $in: ['pending', 'confirmed'] },
  }).select('slot_key -_id').lean();
  return new Set(docs.map((d) => d.slot_key));
};

/**
 * GET /api/contact/availability
 *
 * Three modes, all reading the admin-configured schedule — the picker holds no
 * rule of its own:
 *
 *   ?date=YYYY-MM-DD[&tz=Area/City]  the day's bookable slots, each flagged
 *                                    booked/free, in the caller's timezone.
 *   ?month=YYYY-MM[&tz=Area/City]    which dates that month have any slot left,
 *                                    so the calendar can disable the rest.
 *   ?from=<iso>&to=<iso>             legacy: just the taken slot keys in a range.
 *
 * `tz` defaults to the studio's own zone when missing or unrecognised.
 */
const availability = async (req, res) => {
  const { from, to, date, month, tz } = req.query;
  const config = await getAvailabilityConfig();
  const viewerTz = isValidTimeZone(tz) ? tz : config.timezone;

  // ── Month mode: which dates are open at all ───────────────────────────────
  if (month) {
    const m = /^(\d{4})-(\d{2})$/.exec(String(month).trim());
    const year = m ? Number(m[1]) : NaN;
    const mon = m ? Number(m[2]) : NaN;
    if (!m || mon < 1 || mon > 12) {
      return res.status(400).json({ status: 'error', message: 'Invalid month. Expected YYYY-MM.' });
    }
    const firstOfMonth = `${m[1]}-${m[2]}-01`;
    const nextMonthFirst = mon === 12
      ? `${year + 1}-01-01`
      : `${m[1]}-${String(mon + 1).padStart(2, '0')}-01`;
    const openDates = openViewerDatesInRange(config, firstOfMonth, addDays(nextMonthFirst, -1), viewerTz);
    return res.json({
      status: 'success',
      month: `${m[1]}-${m[2]}`,
      timezone: viewerTz,
      businessTimezone: config.timezone,
      openDates,
    });
  }

  // ── Day mode: the slot list the picker renders ────────────────────────────
  if (date) {
    const { configured, slots } = slotsForViewerDate(config, date, viewerTz);
    const booked = await bookedKeysAmong(slots.map((s) => s.slotKey));
    return res.json({
      status: 'success',
      date,
      timezone: viewerTz,
      businessTimezone: config.timezone,
      /* "Nothing is configured for this date" — distinct from a day whose
         slots have merely all passed, which the picker words differently. */
      closed: configured === 0,
      slots: slots.map((s) => ({
        time: s.time,
        startUtc: s.startUtc,
        slotKey: s.slotKey,
        booked: booked.has(s.slotKey),
      })),
      booked: [...booked],
    });
  }

  // ── Legacy range mode — response shape deliberately unchanged ─────────────
  const q = { slot_key: { $exists: true }, status: { $in: ['pending', 'confirmed'] } };
  if (from || to) {
    q.meeting_start_utc = {};
    if (from) q.meeting_start_utc.$gte = new Date(from);
    if (to) q.meeting_start_utc.$lte = new Date(to);
  }
  const docs = await Meeting.find(q).select('slot_key -_id').lean();
  res.json({ status: 'success', booked: docs.map((d) => d.slot_key).filter(Boolean) });
};

// POST /api/contact/free-consultation
// When meeting_start_utc is provided (i.e. a /ScheduleMeeting submission), save
// to the Meeting collection as "pending" — no Google Meet link is created yet.
// The admin confirms the meeting from the admin panel, which triggers Meet creation.
// General consultation leads (no meeting_start_utc) still save to FreeConsultationItem.
const freeConsultation = async (req, res) => {
  const {
    name, email, phone, company, message, budget,
    service, source_page, notes, meeting_date, meeting_time, meeting_timezone,
    meeting_start_utc,
  } = req.body;
  // Accept both the new camelCase key and the legacy snake_case one.
  const consultationCategoryId = req.body.consultationCategoryId ?? req.body.consultation_category_id;
  if (!name || !email) return res.status(400).json({ status: 'error', message: 'Name and email are required' });

  // Recompute the UTC instant server-side from the wall-clock fields rather
  // than trusting the client's meeting_start_utc verbatim — a spoofed or
  // clock-skewed browser could otherwise store a UTC instant inconsistent
  // with the recorded meeting_date/meeting_time/meeting_timezone. Falls back
  // to the client-sent value only if the recompute can't be done (missing or
  // unrecognised timezone), so a booking never hard-fails on this.
  const recomputedUtc = meeting_date && meeting_time && meeting_timezone
    ? zonedTimeToUtc(meeting_date, meeting_time, meeting_timezone)
    : null;
  const resolvedStartUtc = recomputedUtc || (meeting_start_utc ? new Date(meeting_start_utc) : null);

  const slot_key = slotKeyOf(resolvedStartUtc);

  // ── Meeting booking (from /ScheduleMeeting) ──────────────────────────────
  if (slot_key) {
    /* Enforce the admin's availability server-side. The picker already hides
       disabled days and slots, but this endpoint is reachable directly, so the
       UI's rule cannot be the only one.

       The check runs on the resolved UTC instant, not on the wall-clock fields:
       a direct caller can omit meeting_date/meeting_time, or state a timezone
       they aren't in, and the instant they actually asked for is still the one
       measured against the studio's schedule. */
    const slotCheck = await validateBookingInstant(resolvedStartUtc);
    if (!slotCheck.ok) {
      return res.status(400).json({ status: 'error', message: slotCheck.message });
    }

    const taken = await Meeting.findOne({ slot_key, status: { $in: ['pending', 'confirmed'] } }).lean();
    if (taken) {
      return res.status(409).json({ status: 'error', message: 'That time slot is no longer available. Please pick another.' });
    }

    let doc;
    try {
      doc = await Meeting.create({
        userName: name,
        email,
        phone,
        companyName: company,
        meetingDate: meeting_date,
        meetingTime: meeting_time,
        meetingTimezone: meeting_timezone,
        meeting_start_utc: resolvedStartUtc,
        slot_key,
        duration: 15,
        notes: notes || message,
        service,
        source_page,
        status: 'pending',
      });
    } catch (err) {
      if (err && err.code === 11000) {
        return res.status(409).json({ status: 'error', message: 'That time slot was just booked. Please pick another.' });
      }
      throw err;
    }

    (async () => {
      await sendMeetingRequestEmails({
        name, email, phone, companyName: company, service, notes: notes || message,
        meeting_date, meeting_time, meeting_timezone,
        meeting_start_utc: doc.meeting_start_utc,
        createdAt: doc.createdAt,
        meetingId: doc._id.toString(),
      });
    })().catch(() => { });

    crmIngest({
      channel: 'meeting', externalCollection: 'meetings', externalId: doc._id,
      name, email, phone, company, message: notes || message,
      serviceInterest: service, sourcePage: source_page,
      meetingStartUtc: meeting_start_utc,
      raw: { meeting_date, meeting_time, meeting_timezone },
    });

    return res.status(201).json({ status: 'success', message: 'Meeting request submitted. You will receive a confirmation email once your meeting is approved.', data: doc });
  }

  // ── General consultation lead (no meeting slot) ───────────────────────────
  const doc = await FreeConsultationItem.create({
    consultationCategoryId, name, email, phone, company, message, budget,
    service, source_page, notes,
  });

  (async () => {
    await sendBookingEmails({ name, email, phone, company, message, budget, service, source_page, notes });
  })().catch(() => { });

  crmIngest({
    channel: 'consultation', externalCollection: 'free_consultation_item', externalId: doc._id,
    name, email, phone, company, message: message || notes,
    serviceInterest: service, budget, sourcePage: source_page,
  });

  res.status(201).json({ status: 'success', message: 'Consultation request submitted', data: doc });
};

module.exports = { contact, freeConsultation, availability };
