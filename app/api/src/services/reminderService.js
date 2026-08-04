'use strict';

const Meeting = require('../models/Meeting');
const { sendMeetingReminderEmails } = require('./bookingMailer');
const logger = require('../utils/logger');

const POLL_INTERVAL_MS = 60 * 1000;
const WINDOW_MIN_MS = 55 * 60 * 1000;
const WINDOW_MAX_MS = 65 * 60 * 1000;

let timer = null;

const runOnce = async () => {
  const now = Date.now();
  const due = await Meeting.find({
    status: 'confirmed',
    reminderSentAt: null,
    meeting_start_utc: { $gte: new Date(now + WINDOW_MIN_MS), $lte: new Date(now + WINDOW_MAX_MS) },
  });

  for (const doc of due) {
    try {
      await sendMeetingReminderEmails({
        name: doc.userName,
        email: doc.email,
        phone: doc.phone,
        meeting_timezone: doc.meetingTimezone,
        meeting_start_utc: doc.meeting_start_utc,
        meetLink: doc.meetLink,
        assigneeEmail: doc.assignedTo?.email,
      });
      doc.reminderSentAt = new Date();
      await doc.save();
    } catch (err) {
      logger.error(`Reminder poller: failed for meeting ${doc._id}: ${err.message}`);
    }
  }
};

// Idempotent — a second call is a no-op, so callers don't need to guard.
const startReminderPoller = () => {
  if (timer) return;
  timer = setInterval(() => {
    // Every query in here would sit in Mongoose's buffer and time out while the
    // database is unreachable, logging an error a minute for a condition that
    // is already being reported by the connection retry itself.
    if (require('mongoose').connection.readyState !== 1) return;
    runOnce().catch((err) => logger.error(`Reminder poller: tick failed: ${err.message}`));
  }, POLL_INTERVAL_MS);
  logger.info('Meeting reminders: poller started (checks every 60s for meetings starting in ~1 hour).');
};

module.exports = { startReminderPoller };
