const Meeting = require('../../models/Meeting');
const { createMeetingEvent } = require('../../services/calendarService');
const { sendMeetingConfirmedEmails, sendMeetingRejectedEmail } = require('../../services/bookingMailer');
const logger = require('../../utils/logger');

// GET /admin/api/meetings
const index = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const search = req.query.search || '';
  const status = req.query.status || '';
  const sortField = req.query.sortField || 'createdAt';
  const sortDir = req.query.sortDir === 'asc' ? 1 : -1;

  const filter = {};
  if (search) {
    filter.$or = [
      { userName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { companyName: { $regex: search, $options: 'i' } },
    ];
  }
  if (status) filter.status = status;

  const [data, total] = await Promise.all([
    Meeting.find(filter).sort({ [sortField]: sortDir }).skip(skip).limit(limit).lean(),
    Meeting.countDocuments(filter),
  ]);

  res.json({
    status: 'success',
    data,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
};

// GET /admin/api/meetings/stats
const stats = async (req, res) => {
  const [pending, confirmed, rejected, completed, total] = await Promise.all([
    Meeting.countDocuments({ status: 'pending' }),
    Meeting.countDocuments({ status: 'confirmed' }),
    Meeting.countDocuments({ status: 'rejected' }),
    Meeting.countDocuments({ status: 'completed' }),
    Meeting.countDocuments(),
  ]);
  res.json({ status: 'success', data: { pending, confirmed, rejected, completed, total } });
};

// GET /admin/api/meetings/:id
const show = async (req, res) => {
  const doc = await Meeting.findById(req.params.id).lean();
  if (!doc) return res.status(404).json({ status: 'error', message: 'Meeting not found' });
  res.json({ status: 'success', data: doc });
};

// PUT /admin/api/meetings/:id/confirm
// Generates a Google Meet link, updates the meeting to "confirmed", sends emails.
const confirm = async (req, res) => {
  const doc = await Meeting.findById(req.params.id);
  if (!doc) return res.status(404).json({ status: 'error', message: 'Meeting not found' });
  if (doc.status === 'confirmed') return res.json({ status: 'success', message: 'Already confirmed', data: doc });

  const { meetLink, eventId, htmlLink } = await createMeetingEvent({
    name: doc.userName,
    email: doc.email,
    service: doc.service,
    message: doc.notes,
    notes: doc.notes,
    meeting_date: doc.meetingDate,
    meeting_time: doc.meetingTime,
    meeting_timezone: doc.meetingTimezone,
  });

  doc.status = 'confirmed';
  doc.meetLink = meetLink || null;
  doc.meetId = eventId || null;
  doc.google_event_id = eventId || null;
  doc.google_html_link = htmlLink || null;
  doc.confirmedBy = req.user?._id || req.user?.id || null;
  doc.confirmedAt = new Date();
  await doc.save();

  (async () => {
    await sendMeetingConfirmedEmails({
      name: doc.userName,
      email: doc.email,
      phone: doc.phone,
      meetingDate: doc.meetingDate,
      meetingTime: doc.meetingTime,
      meetLink: doc.meetLink,
    });
  })().catch((e) => logger.error('confirm email error:', e));

  res.json({ status: 'success', message: 'Meeting confirmed and emails sent', data: doc });
};

// PUT /admin/api/meetings/:id/reject
const reject = async (req, res) => {
  const doc = await Meeting.findById(req.params.id);
  if (!doc) return res.status(404).json({ status: 'error', message: 'Meeting not found' });

  doc.status = 'rejected';
  doc.rejectedAt = new Date();
  await doc.save();

  (async () => {
    if (doc.email) await sendMeetingRejectedEmail({ name: doc.userName, email: doc.email });
  })().catch((e) => logger.error('reject email error:', e));

  res.json({ status: 'success', message: 'Meeting rejected and user notified', data: doc });
};

// PUT /admin/api/meetings/:id/status
const updateStatus = async (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'confirmed', 'rejected', 'completed'];
  if (!allowed.includes(status)) return res.status(400).json({ status: 'error', message: 'Invalid status value' });

  const doc = await Meeting.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!doc) return res.status(404).json({ status: 'error', message: 'Meeting not found' });
  res.json({ status: 'success', data: doc });
};

// DELETE /admin/api/meetings/:id
const destroy = async (req, res) => {
  const doc = await Meeting.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ status: 'error', message: 'Meeting not found' });
  res.json({ status: 'success', message: 'Deleted successfully' });
};

module.exports = { index, stats, show, confirm, reject, updateStatus, destroy };
