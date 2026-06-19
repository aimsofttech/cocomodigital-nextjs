const ContactUs = require('../../models/ContactUs');
const FreeConsultationItem = require('../../models/FreeConsultationItem');
const { sendBookingEmails } = require('../../services/bookingMailer');
const { createMeetingEvent } = require('../../services/calendarService');

const contact = async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ status: 'error', message: 'Name, email, and message are required' });
  const doc = await ContactUs.create({ name, email, phone, subject, message });
  res.status(201).json({ status: 'success', message: 'Message sent successfully', data: doc });
};

// Derive the canonical slot key (UTC instant truncated to the minute) from an
// ISO instant. Returns null if the instant is missing/invalid.
const slotKeyOf = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
};

// GET /api/contact/availability?from=<iso>&to=<iso>
// Returns the set of booked slot keys in the window so the frontend can disable
// them. `from`/`to` bound the UTC range the caller is displaying.
const availability = async (req, res) => {
  const { from, to } = req.query;
  const q = { slot_key: { $exists: true }, meeting_status: 'confirmed' };
  if (from || to) {
    q.meeting_start_utc = {};
    if (from) q.meeting_start_utc.$gte = new Date(from);
    if (to) q.meeting_start_utc.$lte = new Date(to);
  }
  const docs = await FreeConsultationItem.find(q).select('slot_key -_id').lean();
  res.json({ status: 'success', booked: docs.map((d) => d.slot_key).filter(Boolean) });
};

const freeConsultation = async (req, res) => {
  const {
    consultation_category_id, name, email, phone, company, message, budget,
    // Booking-page extras (the /ScheduleMeeting flow posts these). The model is
    // strict:false, so they persist alongside the standard consultation fields.
    service, source_page, notes, meeting_date, meeting_time, meeting_timezone,
    meeting_start_utc,
  } = req.body;
  if (!name || !email) return res.status(400).json({ status: 'error', message: 'Name and email are required' });

  // Slot bookings carry an instant. Reserve the slot and reject duplicates.
  const slot_key = slotKeyOf(meeting_start_utc);
  if (slot_key) {
    const taken = await FreeConsultationItem.findOne({ slot_key, meeting_status: 'confirmed' }).lean();
    if (taken) {
      return res.status(409).json({ status: 'error', message: 'That time slot is no longer available. Please pick another.' });
    }
  }

  let doc;
  try {
    doc = await FreeConsultationItem.create({
      consultation_category_id, name, email, phone, company, message, budget,
      service, source_page, notes, meeting_date, meeting_time, meeting_timezone,
      ...(slot_key
        ? { meeting_start_utc: new Date(meeting_start_utc), slot_key, meeting_status: 'confirmed' }
        : {}),
    });
  } catch (err) {
    // Race: the unique index rejected a concurrent duplicate booking.
    if (err && err.code === 11000) {
      return res.status(409).json({ status: 'error', message: 'That time slot was just booked. Please pick another.' });
    }
    throw err;
  }

  // Generate a Google Meet link (via Calendar) then notify the owner (Anil) and
  // the visitor — both emails carry the Meet link. Done in the background and
  // fully best-effort: Meet/email problems must never fail the booking itself
  // (calendarService and the mailer both degrade gracefully and never throw).
  (async () => {
    const { meetLink, eventId, htmlLink } = await createMeetingEvent({
      name, email, service, message, notes, meeting_date, meeting_time, meeting_timezone,
    });
    if (meetLink) {
      try {
        await FreeConsultationItem.updateOne(
          { _id: doc._id },
          { meet_link: meetLink, google_event_id: eventId, google_html_link: htmlLink }
        );
      } catch (_) { /* persistence is non-critical for the email */ }
    }
    await sendBookingEmails({
      name, email, phone, company, message, budget,
      service, source_page, notes, meeting_date, meeting_time, meeting_timezone,
      meetLink,
    });
  })().catch(() => {});

  res.status(201).json({ status: 'success', message: 'Consultation request submitted', data: doc });
};

module.exports = { contact, freeConsultation, availability };
