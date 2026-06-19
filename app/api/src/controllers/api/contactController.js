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

const freeConsultation = async (req, res) => {
  const {
    consultation_category_id, name, email, phone, company, message, budget,
    // Booking-page extras (the /ScheduleMeeting flow posts these). The model is
    // strict:false, so they persist alongside the standard consultation fields.
    service, source_page, notes, meeting_date, meeting_time, meeting_timezone,
  } = req.body;
  if (!name || !email) return res.status(400).json({ status: 'error', message: 'Name and email are required' });

  const doc = await FreeConsultationItem.create({
    consultation_category_id, name, email, phone, company, message, budget,
    service, source_page, notes, meeting_date, meeting_time, meeting_timezone,
  });

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

module.exports = { contact, freeConsultation };
