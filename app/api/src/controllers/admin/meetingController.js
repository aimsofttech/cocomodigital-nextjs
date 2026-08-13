const Meeting = require('../../models/Meeting');
const MeetingAssignee = require('../../models/MeetingAssignee');
const { createMeetingEvent } = require('../../services/calendarService');
const { sendMeetingConfirmedEmails, sendMeetingRejectedEmail, sendMeetingRescheduledEmails, sendMeetingAssignedEmails } = require('../../services/bookingMailer');
const logger = require('../../utils/logger');
// The slot grid and open/closed rule are the admin's own configuration, read
// through the one module the public booking path also uses.
const {
  getAvailabilityConfig,
  slotsForViewerDate,
  validateBookingSlot,
} = require('../../utils/bookingWindow');

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
      meeting_timezone: doc.meetingTimezone,
      meeting_start_utc: doc.meeting_start_utc,
      createdAt: doc.createdAt,
      meetLink: doc.meetLink,
      assigneeEmail: doc.assignedTo?.email,
    });
  })().catch((e) => logger.error('confirm email error:', e));

  res.json({ status: 'success', message: 'Meeting confirmed and emails sent', data: doc });
};


// GET /admin/api/meetings/availability?date=YYYY-MM-DD[&excludeId=]
// Feeds the reschedule picker. `slots` is what the admin configured for that
// date and `booked` the subset another meeting already holds — both as IST
// "HH:mm", the zone the reschedule form works in.
const availability = async (req, res) => {
  const { date, excludeId } = req.query;
  if (!date) return res.status(400).json({ status: 'error', message: 'date is required' });

  const config = await getAvailabilityConfig();
  const { configured, slots } = slotsForViewerDate(config, date, config.timezone);
  if (!slots.length) {
    /* No bookable slot: either the day is switched off / has no times, or every
       one of today's has already passed. `closed` distinguishes them so the
       picker can word it correctly. */
    return res.json({
      status: 'success',
      slots: [],
      booked: [],
      closed: configured === 0,
      timezone: config.timezone,
    });
  }

  const filter = {
    slot_key: { $in: slots.map((s) => s.slotKey) },
    status: { $in: ['pending', 'confirmed'] },
  };
  if (excludeId) filter._id = { $ne: excludeId };

  const docs = await Meeting.find(filter).select('slot_key -_id').lean();
  const bookedKeys = new Set(docs.map((d) => d.slot_key));

  res.json({
    status: 'success',
    slots: slots.map((s) => s.time),
    booked: slots.filter((s) => bookedKeys.has(s.slotKey)).map((s) => s.time),
    closed: false,
    timezone: config.timezone,
  });
};


const reschedule = async (req, res) => {
  const { meetingDate, meetingTime } = req.body;
  if (!meetingDate || !meetingTime) {
    return res.status(400).json({ status: 'error', message: 'meetingDate and meetingTime are required' });
  }

  /* Reschedule moves a customer onto a new slot, so it has to honour the same
     availability as a fresh booking — otherwise a disabled day would hold for
     visitors but not for meetings an admin drags onto it. Admin times are
     studio wall-clock (the picker's own zone), which is also the zone the
     configuration is written in. */
  const config = await getAvailabilityConfig();
  const slotCheck = await validateBookingSlot(meetingDate, meetingTime, config.timezone);
  if (!slotCheck.ok) {
    return res.status(400).json({ status: 'error', message: slotCheck.message });
  }

  const doc = await Meeting.findById(req.params.id);
  if (!doc) return res.status(404).json({ status: 'error', message: 'Meeting not found' });

  const startUtc = slotCheck.startUtc;
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
    // The admin typed these in the studio's own zone, so that's the zone the
    // calendar event has to be created in.
    meeting_time: meetingTime,
    meeting_timezone: config.timezone,
  });

  // meetingDate/meetingTime become "the admin's literal IST input" — reference
  // only. meetingTimezone is deliberately left untouched: it still holds the
  // visitor's original zone, which is what their reschedule email is rendered
  // in. meeting_start_utc (below) is the only field anything displays from.
  doc.meetingDate = meetingDate;
  doc.meetingTime = meetingTime;
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
      meeting_timezone: doc.meetingTimezone,
      meeting_start_utc: doc.meeting_start_utc,
      createdAt: doc.createdAt,
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
        meeting_start_utc: doc.meeting_start_utc,
        assigneeEmail: doc.assignedTo?.email,
      });
    }
  })().catch((e) => logger.error('reject email error:', e));

  res.json({ status: 'success', message: 'Meeting rejected and user notified', data: doc });
};

// GET /admin/api/meetings/assignees
// Team members a meeting can be assigned to — a dedicated list, managed
// separately from the admin login accounts.
const assignees = async (req, res) => {
  const list = await MeetingAssignee.find().select('name email').sort({ name: 1 }).lean();
  res.json({ status: 'success', data: list });
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
        meeting_start_utc: doc.meeting_start_utc,
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

  const doc = await Meeting.findById(req.params.id);
  if (!doc) return res.status(404).json({ status: 'error', message: 'Meeting not found' });

  /* Saved through the document rather than findByIdAndUpdate so the model's
     slot-hold hook runs: moving a meeting to rejected/completed has to release
     its slot, and moving it back to pending has to re-take it. */
  doc.status = status;
  try {
    await doc.save();
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ status: 'error', message: 'Another meeting already holds that time slot.' });
    }
    throw err;
  }
  res.json({ status: 'success', data: doc });
};

// DELETE /admin/api/meetings/:id
const destroy = async (req, res) => {
  const doc = await Meeting.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ status: 'error', message: 'Meeting not found' });
  res.json({ status: 'success', message: 'Deleted successfully' });
};

module.exports = { index, stats, show, confirm, reject, reschedule, availability, assignees, assign, updateStatus, destroy };
