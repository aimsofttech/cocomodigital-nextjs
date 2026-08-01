const ContactUs = require('../../models/ContactUs');
const FreeConsultationItem = require('../../models/FreeConsultationItem');
const Meeting = require('../../models/Meeting');
const { sendBookingEmails, sendMeetingRequestEmails, sendContactEnquiryEmail } = require('../../services/bookingMailer');
const { zonedTimeToUtc } = require('../../utils/timezone');
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

  res.status(201).json({ status: 'success', message: 'Message sent successfully', data: doc });
};

const slotKeyOf = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 16);
};

// GET /api/contact/availability?from=<iso>&to=<iso>
// Returns slot keys for pending + confirmed meetings so the frontend disables them.
const availability = async (req, res) => {
  const { from, to } = req.query;
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
