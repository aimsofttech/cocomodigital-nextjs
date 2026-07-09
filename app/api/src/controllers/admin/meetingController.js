const Meeting = require('../../models/Meeting');
const User = require('../../models/User');
const { createMeetingEvent } = require('../../services/calendarService');
const { sendMeetingConfirmedEmails, sendMeetingRejectedEmail, sendMeetingRescheduledEmails, sendMeetingAssignedEmails } = require('../../services/bookingMailer');
const { zonedTimeToUtc } = require('../../utils/timezone');
const logger = require('../../utils/logger');

// 10:00–18:45 in 15-minute steps — mirrors the reschedule picker's slot grid.
const DAY_SLOTS = (() => {
  const slots = [];
  for (let h = 10; h < 19; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
})();

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
      assigneeEmail: doc.assignedTo?.email,
    });
  })().catch((e) => logger.error('confirm email error:', e));

  res.json({ status: 'success', message: 'Meeting confirmed and emails sent', data: doc });
};

// GET /admin/api/meetings/availability?date=YYYY-MM-DD&timezone=Asia/Kolkata&excludeId=<id>
// Which of the day's 15-min slots are already taken by another pending/confirmed
// meeting, so the reschedule picker can disable them. Computed server-side so the
// admin's browser timezone never has to be reconciled with the meeting's timezone.
const availability = async (req, res) => {
  const { date, timezone, excludeId } = req.query;
  if (!date) return res.status(400).json({ status: 'error', message: 'date is required' });
  const tz = timezone || process.env.BOOKING_TIMEZONE || 'Asia/Kolkata';

  const slotKeys = DAY_SLOTS
    .map((time) => {
      const d = zonedTimeToUtc(date, time, tz);
      return d ? { time, slot_key: d.toISOString().slice(0, 16) } : null;
    })
    .filter(Boolean);

  const filter = {
    slot_key: { $in: slotKeys.map((s) => s.slot_key) },
    status: { $in: ['pending', 'confirmed'] },
  };
  if (excludeId) filter._id = { $ne: excludeId };

  const docs = await Meeting.find(filter).select('slot_key -_id').lean();
  const bookedKeys = new Set(docs.map((d) => d.slot_key));
  const booked = slotKeys.filter((s) => bookedKeys.has(s.slot_key)).map((s) => s.time);

  res.json({ status: 'success', booked });
};

// PUT /admin/api/meetings/:id/reschedule
// Admin picks a new date/time for a meeting (typically one whose original slot
// already expired), regenerates the Google Meet link for the new slot, and
// notifies both the user and the owner. Keeps the meeting's original timezone
// so the wall-clock time stays meaningful to the visitor who requested it.
const reschedule = async (req, res) => {
  const { meetingDate, meetingTime } = req.body;
  if (!meetingDate || !meetingTime) {
    return res.status(400).json({ status: 'error', message: 'meetingDate and meetingTime are required' });
  }

  const doc = await Meeting.findById(req.params.id);
  if (!doc) return res.status(404).json({ status: 'error', message: 'Meeting not found' });

  const timezone = doc.meetingTimezone || process.env.BOOKING_TIMEZONE || 'Asia/Kolkata';
  const startUtc = zonedTimeToUtc(meetingDate, meetingTime, timezone);
  if (!startUtc) return res.status(400).json({ status: 'error', message: 'Invalid meetingDate/meetingTime' });
  if (startUtc.getTime() <= Date.now()) {
    return res.status(400).json({ status: 'error', message: 'Please pick a time in the future' });
  }

  const slot_key = startUtc.toISOString().slice(0, 16);
  const clash = await Meeting.findOne({
    _id: { $ne: doc._id },
    slot_key,
    status: { $in: ['pending', 'confirmed'] },
  }).lean();
  if (clash) {
    return res.status(409).json({ status: 'error', message: 'That time slot is already booked. Please pick another.' });
  }

  const { meetLink, eventId, htmlLink } = await createMeetingEvent({
    name: doc.userName,
    email: doc.email,
    service: doc.service,
    message: doc.notes,
    notes: doc.notes,
    meeting_date: meetingDate,
    meeting_time: meetingTime,
    meeting_timezone: timezone,
  });

  doc.meetingDate = meetingDate;
  doc.meetingTime = meetingTime;
  doc.meetingTimezone = timezone;
  doc.meeting_start_utc = startUtc;
  doc.slot_key = slot_key;
  doc.status = 'confirmed';
  doc.meetLink = meetLink || null;
  doc.meetId = eventId || null;
  doc.google_event_id = eventId || null;
  doc.google_html_link = htmlLink || null;
  doc.confirmedBy = req.user?._id || req.user?.id || null;
  doc.confirmedAt = new Date();
  doc.rescheduledBy = req.user?._id || req.user?.id || null;
  doc.rescheduledAt = new Date();

  try {
    await doc.save();
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ status: 'error', message: 'That time slot was just booked. Please pick another.' });
    }
    throw err;
  }

  (async () => {
    await sendMeetingRescheduledEmails({
      name: doc.userName,
      email: doc.email,
      phone: doc.phone,
      meetingDate: doc.meetingDate,
      meetingTime: doc.meetingTime,
      meetLink: doc.meetLink,
      assigneeEmail: doc.assignedTo?.email,
    });
  })().catch((e) => logger.error('reschedule email error:', e));

  res.json({ status: 'success', message: 'Meeting rescheduled and emails sent', data: doc });
};

// PUT /admin/api/meetings/:id/reject
const reject = async (req, res) => {
  const doc = await Meeting.findById(req.params.id);
  if (!doc) return res.status(404).json({ status: 'error', message: 'Meeting not found' });

  doc.status = 'rejected';
  doc.rejectedAt = new Date();
  await doc.save();

  (async () => {
    if (doc.email) {
      await sendMeetingRejectedEmail({
        name: doc.userName,
        email: doc.email,
        meeting_date: doc.meetingDate,
        meeting_time: doc.meetingTime,
        meeting_timezone: doc.meetingTimezone,
        assigneeEmail: doc.assignedTo?.email,
      });
    }
  })().catch((e) => logger.error('reject email error:', e));

  res.json({ status: 'success', message: 'Meeting rejected and user notified', data: doc });
};

// GET /admin/api/meetings/assignees
// Team members a meeting can be assigned to — the admin panel users, who can
// log in and act on the meeting via the same deep links as the owner.
const assignees = async (req, res) => {
  const users = await User.find().select('name email role').sort({ name: 1 }).lean();
  res.json({ status: 'success', data: users });
};

// PUT /admin/api/meetings/:id/assign
// Owner delegates the meeting to a team member: saves the assignment and
// notifies both the assignee ("<owner> has assigned you a meeting", with the
// action buttons) and the owner (an assignment receipt). From then on the
// assignee also receives every owner-side confirm/reject/reschedule mail.
const assign = async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ status: 'error', message: 'Assignee name and email are required' });
  }

  const doc = await Meeting.findById(req.params.id);
  if (!doc) return res.status(404).json({ status: 'error', message: 'Meeting not found' });

  doc.assignedTo = { name: String(name).trim(), email: String(email).trim().toLowerCase() };
  doc.assignedBy = req.user?._id || req.user?.id || null;
  doc.assignedAt = new Date();
  await doc.save();

  (async () => {
    await sendMeetingAssignedEmails(
      {
        name: doc.userName,
        email: doc.email,
        phone: doc.phone,
        companyName: doc.companyName,
        service: doc.service,
        notes: doc.notes,
        status: doc.status,
        meetLink: doc.meetLink,
        meeting_date: doc.meetingDate,
        meeting_time: doc.meetingTime,
        meeting_timezone: doc.meetingTimezone,
        meetingId: doc._id.toString(),
      },
      doc.assignedTo
    );
  })().catch((e) => logger.error('assign email error:', e));

  res.json({ status: 'success', message: 'Meeting assigned and emails sent', data: doc });
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

module.exports = { index, stats, show, confirm, reject, reschedule, availability, assignees, assign, updateStatus, destroy };
