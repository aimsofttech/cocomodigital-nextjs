const mongoose = require('mongoose');

/**
 * Admin-managed booking availability — the single source of truth for which
 * days and 15-minute slots a discovery call can be booked into.
 *
 * One document, `key: 'default'`. It is created with an all-open default the
 * first time anything reads it (see utils/bookingWindow.js), so a fresh
 * database needs no seed step.
 *
 * `slots` holds the ENABLED slot starts for that weekday as "HH:mm" strings on
 * the 15-minute grid, expressed in `timezone` (the studio's own clock, not the
 * visitor's). An empty list means the day is open in principle but has nothing
 * bookable — the same user-visible result as `enabled: false`.
 */
const availabilityDaySchema = new mongoose.Schema(
  {
    // 0 = Sunday … 6 = Saturday, matching Date#getDay.
    weekday: { type: Number, required: true, min: 0, max: 6 },
    enabled: { type: Boolean, default: true },
    slots: { type: [String], default: [] },
  },
  { _id: false }
);

const meetingAvailabilitySchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true, index: true },

    /* The zone the admin's rules are written in. Visitors book in their own
       zone; the API converts before checking, so "Monday 10:00" always means
       10:00 at the studio. */
    timezone: { type: String, default: 'Asia/Kolkata', trim: true },

    slotStepMinutes: { type: Number, default: 15 },

    /* How far ahead of "now" a slot must start to still be bookable. 0 keeps
       the historical behaviour (anything still in the future is fine). */
    minNoticeMinutes: { type: Number, default: 0, min: 0 },

    days: { type: [availabilityDaySchema], default: [] },

    /* One-off closures that override `days` entirely: "YYYY-MM-DD" calendar
       dates in `timezone`, on which nothing can be booked no matter what the
       weekday rules say (holidays, a studio shutdown, a day off). Removing a
       date restores whatever the weekday rules already allowed — the day's
       slots are never edited, only ignored while the date is listed. */
    blockedDates: { type: [String], default: [] },

    updatedBy: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true, collection: 'meeting_availability' }
);

module.exports = mongoose.model('MeetingAvailability', meetingAvailabilitySchema);
