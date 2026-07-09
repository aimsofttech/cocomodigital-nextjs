const ContactUs = require('../../models/ContactUs');
const FreeConsultationItem = require('../../models/FreeConsultationItem');
const Meeting = require('../../models/Meeting');
const { sendBookingEmails, sendMeetingRequestEmails } = require('../../services/bookingMailer');

const contact = async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ status: 'error', message: 'Name, email, and message are required' });
  const doc = await ContactUs.create({ name, email, phone, subject, message });
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

  const slot_key = slotKeyOf(meeting_start_utc);

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
        meeting_start_utc: new Date(meeting_start_utc),
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
        meetingId: doc._id.toString(),
      });
    })().catch(() => {});

    return res.status(201).json({ status: 'success', message: 'Meeting request submitted. You will receive a confirmation email once your meeting is approved.', data: doc });
  }

  // ── General consultation lead (no meeting slot) ───────────────────────────
  const doc = await FreeConsultationItem.create({
    consultationCategoryId, name, email, phone, company, message, budget,
    service, source_page, notes,
  });

  (async () => {
    await sendBookingEmails({ name, email, phone, company, message, budget, service, source_page, notes });
  })().catch(() => {});

  res.status(201).json({ status: 'success', message: 'Consultation request submitted', data: doc });
};

module.exports = { contact, freeConsultation, availability };
