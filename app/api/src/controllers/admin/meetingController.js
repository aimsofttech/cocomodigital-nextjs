const mongoose = require('mongoose');
const Meeting = require('../../models/Meeting');
const MeetingAssignee = require('../../models/MeetingAssignee');
const GroupServiceItem = require('../../models/GroupServiceItem');
const GroupServiceCategory = require('../../models/GroupServiceCategory');
const { createMeetingEvent, updateMeetingEvent, cancelMeetingEvent } = require('../../services/calendarService');
const { sendMeetingConfirmedEmails, sendMeetingRejectedEmail, sendMeetingRescheduledEmails, sendMeetingAssignedEmails } = require('../../services/bookingMailer');
const logger = require('../../utils/logger');
// The slot grid and open/closed rule are the admin's own configuration, read
// through the one module the public booking path also uses.
const {
  getAvailabilityConfig,
  slotsForViewerDate,
  validateBookingSlot,
} = require('../../utils/bookingWindow');

/* The public booking page records the services a visitor added to their call
   as a "Cart:" block at the end of `notes`, one "  - <id>" line per service
   card (a Group Service Item). Pull those ids back out so the admin can be
   shown the actual cards rather than raw ids. */
const CART_LINE = /^\s*-\s*([a-f0-9]{24})\s*$/i;
function cartIdsFromNotes(notes) {
  if (!notes) return [];
  const at = notes.lastIndexOf('Cart:');
  if (at === -1) return [];
  return notes.slice(at + 'Cart:'.length).split('\n')
    .map((line) => (line.match(CART_LINE) || [])[1])
    .filter(Boolean);
}

/* Attach `cartItems` (the full service-card details, in the order the visitor
   added them) to each meeting. One lookup for every card across the page, one
   for their categories. A card deleted since the booking comes back as
   { _id, missing: true } so the admin still sees that something was there. */
async function attachCartItems(meetings) {
  const idsByMeeting = meetings.map((m) => cartIdsFromNotes(m.notes));
  const allIds = [...new Set(idsByMeeting.flat())];
  if (!allIds.length) return meetings;

  try {
    const items = await GroupServiceItem.find({
      _id: { $in: allIds.map((id) => new mongoose.Types.ObjectId(id)) },
    }).select('title slug thumbnail description groupServiceCategoryId status').lean();

    const catIds = [...new Set(items.map((it) => String(it.groupServiceCategoryId)))]
      .filter((id) => mongoose.Types.ObjectId.isValid(id));
    const cats = catIds.length
      ? await GroupServiceCategory.find({ _id: { $in: catIds } }).select('name').lean()
      : [];
    const catName = new Map(cats.map((c) => [String(c._id), c.name]));
    const byId = new Map(items.map((it) => [String(it._id), {
      ...it,
      groupCategoryName: catName.get(String(it.groupServiceCategoryId)) || null,
    }]));

    return meetings.map((m, i) => (idsByMeeting[i].length
      ? { ...m, cartItems: idsByMeeting[i].map((id) => byId.get(id) || { _id: id, missing: true }) }
      : m));
  } catch (err) {
    // Details are a convenience — never fail the meeting list over them.
    logger.error(`Failed to resolve meeting cart items: ${err.message}`);
    return meetings;
  }
}

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
    data: await attachCartItems(data),
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
  const [data] = await attachCartItems([doc]);
  res.json({ status: 'success', data });
};

/* Everything the mailer and the calendar need about a meeting, read from the
   stored document — one mapping, so each action's emails and calendar event
   describe the meeting the same way (assignee included). */
const meetingFields = (doc) => ({
  name: doc.userName,
  email: doc.email,
  phone: doc.phone,
  companyName: doc.companyName,
  service: doc.service,
  notes: doc.notes,
  message: doc.notes,
  status: doc.status,
  meetLink: doc.meetLink,
  meeting_date: doc.meetingDate,
  meeting_time: doc.meetingTime,
  meeting_timezone: doc.meetingTimezone,
  meeting_start_utc: doc.meeting_start_utc,
  createdAt: doc.createdAt,
  meetingId: doc._id.toString(),
  assigneeEmail: doc.assignedTo?.email,
  assigneeName: doc.assignedTo?.name,
});

/* Put the meeting on the host calendar as it now stands. A meeting that
   already has an event is moved/updated in place — its Meet link stays the one
   everybody was sent, and no orphaned duplicate is left on the calendar. A new
   event (and link) is only minted when there is none, or it was deleted by
   hand. */
const syncCalendarEvent = async (doc) => {
  const booking = meetingFields(doc);
  if (doc.google_event_id) {
    const updated = await updateMeetingEvent(doc.google_event_id, booking);
    if (!updated.notFound) {
      return {
        ...updated,
        meetLink: updated.meetLink || doc.meetLink || null,
        eventId: updated.eventId || doc.google_event_id,
        htmlLink: updated.htmlLink || doc.google_html_link || null,
      };
    }
  }
  return createMeetingEvent(booking);
};

const applyCalendarEvent = (doc, event) => {
  doc.meetLink = event.meetLink || doc.meetLink || null;
  doc.meetId = event.eventId || doc.meetId || null;
  doc.google_event_id = event.eventId || doc.google_event_id || null;
  doc.google_html_link = event.htmlLink || doc.google_html_link || null;
};

const calendarFailure = (res, event, still) =>
  res.status(502).json({
    status: 'error',
    message: `Could not create the Google Meet link (${event.error}). ${still} — no emails were sent. Please try again.`,
  });

// PUT /admin/api/meetings/:id/confirm
// Generates a Google Meet link, updates the meeting to "confirmed", sends emails.
const confirm = async (req, res) => {
  const doc = await Meeting.findById(req.params.id);
  if (!doc) return res.status(404).json({ status: 'error', message: 'Meeting not found' });
  if (doc.status === 'confirmed') return res.json({ status: 'success', message: 'Already confirmed', data: doc });
  if (doc.status !== 'pending') {
    return res.status(400).json({ status: 'error', message: `This meeting has already been ${doc.status} — reschedule it to book a new slot.` });
  }
  if (doc.meeting_start_utc && new Date(doc.meeting_start_utc).getTime() <= Date.now()) {
    return res.status(400).json({ status: 'error', message: 'This meeting slot has already passed — reschedule it instead.' });
  }

  /* The link is the point of confirming. If Google is set up but the event
     can't be created, leave the meeting pending so the admin can retry, rather
     than confirming it and mailing the visitor a confirmation with no way in.
     (With Google not configured at all, confirmation proceeds without a link
     by design — see calendarService.) */
  const event = await syncCalendarEvent(doc);
  if (event.error) return calendarFailure(res, event, 'The meeting is still pending');

  applyCalendarEvent(doc, event);
  doc.status = 'confirmed';
  doc.confirmedBy = req.user?._id || req.user?.id || null;
  doc.confirmedAt = new Date();
  await doc.save();

  sendMeetingConfirmedEmails(meetingFields(doc))
    .catch((e) => logger.error(`confirm email error for meeting ${doc._id}: ${e.message}`));

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

  // meetingDate/meetingTime become "the admin's literal IST input" — reference
  // only. meetingTimezone is deliberately left untouched: it still holds the
  // visitor's original zone, which is what their reschedule email is rendered
  // in. meeting_start_utc is the only field anything displays from, and the
  // one the calendar event is placed by.
  doc.meetingDate = meetingDate;
  doc.meetingTime = meetingTime;
  doc.meeting_start_utc = startUtc;
  doc.slot_key = slot_key;

  // Moves the existing event (same Meet link) or creates one if there's none.
  const event = await syncCalendarEvent(doc);
  if (event.error) return calendarFailure(res, event, 'The meeting was not rescheduled');

  applyCalendarEvent(doc, event);
  doc.status = 'confirmed';
  doc.confirmedBy = req.user?._id || req.user?.id || null;
  doc.confirmedAt = new Date();
  doc.rescheduledBy = req.user?._id || req.user?.id || null;
  doc.rescheduledAt = new Date();
  // The 1-hour reminder belongs to the old time; the new one needs its own.
  doc.reminderSentAt = null;

  try {
    await doc.save();
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ status: 'error', message: 'That time slot was just booked. Please pick another.' });
    }
    throw err;
  }

  sendMeetingRescheduledEmails(meetingFields(doc))
    .catch((e) => logger.error(`reschedule email error for meeting ${doc._id}: ${e.message}`));

  res.json({ status: 'success', message: 'Meeting rescheduled and emails sent', data: doc });
};

// PUT /admin/api/meetings/:id/reject
// Rejects a pending request, or cancels a confirmed meeting.
const reject = async (req, res) => {
  const doc = await Meeting.findById(req.params.id);
  if (!doc) return res.status(404).json({ status: 'error', message: 'Meeting not found' });
  // A repeat click must not mail the visitor a second rejection.
  if (doc.status === 'rejected') return res.json({ status: 'success', message: 'Already rejected', data: doc });

  const wasConfirmed = doc.status === 'confirmed';

  /* A cancelled meeting must leave the host calendar too — otherwise the slot
     still shows as busy there and the Meet room stays a live invitation. If
     Google can't be reached the cancellation still goes ahead (the visitor
     must be told); the stale event is logged for manual clean-up. */
  if (doc.google_event_id) {
    const removed = await cancelMeetingEvent(doc.google_event_id);
    if (removed.removed) {
      doc.meetLink = null;
      doc.meetId = null;
      doc.google_event_id = null;
      doc.google_html_link = null;
    } else if (removed.error) {
      logger.warn(`reject: calendar event ${doc.google_event_id} for meeting ${doc._id} could not be removed: ${removed.error}`);
    }
  }

  doc.status = 'rejected';
  doc.rejectedAt = new Date();
  await doc.save();

  sendMeetingRejectedEmail({ ...meetingFields(doc), wasConfirmed })
    .catch((e) => logger.error(`reject email error for meeting ${doc._id}: ${e.message}`));

  res.json({
    status: 'success',
    message: wasConfirmed ? 'Meeting cancelled and user notified' : 'Meeting rejected and user notified',
    data: doc,
  });
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

  const trimmedEmail = String(email).trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
    return res.status(400).json({ status: 'error', message: 'Assignee email is not a valid address' });
  }

  doc.assignedTo = { name: String(name).trim(), email: trimmedEmail };
  doc.assignedBy = req.user?._id || req.user?.id || null;
  doc.assignedAt = new Date();
  await doc.save();

  /* A confirmed meeting already has its event: put the assignee on the guest
     list (and take a previous assignee off it) so they can open the Meet room
     without being admitted. A pending meeting picks the assignee up when it is
     confirmed. Best-effort — the assignment itself is already saved. */
  if (doc.google_event_id && doc.status === 'confirmed') {
    updateMeetingEvent(doc.google_event_id, meetingFields(doc))
      .then((r) => { if (r.error) logger.warn(`assign: could not add assignee to event ${doc.google_event_id}: ${r.error}`); })
      .catch((e) => logger.error(`assign calendar error for meeting ${doc._id}: ${e.message}`));
  }

  sendMeetingAssignedEmails(meetingFields(doc), doc.assignedTo)
    .catch((e) => logger.error(`assign email error for meeting ${doc._id}: ${e.message}`));

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
