'use strict';

/**
 * Single source of truth for when a discovery call may be booked.
 *
 * Business rule: Monday–Saturday, 10:00–18:45 (last slot start), in
 * 15-minute steps. Sunday is closed.
 *
 * Before this module the window lived in four independent copies — the
 * public picker, the public booking POST (which had NO check at all), the
 * admin reschedule picker, and the admin availability endpoint. Every
 * backend path now derives its rule from here; the two browser bundles
 * (app/web, app/admin) are separate npm packages that cannot import server
 * code, so each keeps one mirror of these constants and nothing more.
 *
 * All checks run against the WALL-CLOCK date/time the booker picked, not
 * the stored UTC instant. "Monday 10:00" means 10:00 where the visitor is;
 * the same instant can be Sunday in UTC, so validating the instant would
 * both reject valid bookings and admit Sunday ones.
 */
const { IST_TIMEZONE } = require('./timezone');

const BOOKING_START_HOUR = 10; // first slot starts 10:00
const BOOKING_END_HOUR = 19; // exclusive — last slot starts 18:45
const SLOT_STEP_MINUTES = 15;

/** Day numbers (Date#getDay) the studio does not take calls. 0 = Sunday. */
const CLOSED_WEEKDAYS = [0];

/** ["10:00", "10:15", … "18:45"] — the canonical slot grid. */
const DAY_SLOTS = (() => {
  const slots = [];
  for (let h = BOOKING_START_HOUR; h < BOOKING_END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_STEP_MINUTES) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
})();

const SLOT_SET = new Set(DAY_SLOTS);
const FIRST_SLOT = DAY_SLOTS[0];
const LAST_SLOT = DAY_SLOTS[DAY_SLOTS.length - 1];

/**
 * Weekday for a plain "YYYY-MM-DD" calendar date.
 *
 * Built through Date.UTC so the answer describes the date as written and
 * never shifts with the server's own timezone — `new Date('2026-08-09')`
 * parsed locally can land on the 8th west of Greenwich.
 *
 * @returns {number|null} 0–6, or null if the string isn't a valid date.
 */
const weekdayOf = (dateStr) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || '').trim());
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null; // e.g. 2026-02-30
  }
  return d.getUTCDay();
};

/** True when the studio is closed on that calendar date (Sunday). */
const isClosedDate = (dateStr) => {
  const wd = weekdayOf(dateStr);
  return wd === null ? false : CLOSED_WEEKDAYS.includes(wd);
};

/** True when "HH:mm" is one of the bookable slot starts. */
const isBookableTime = (timeStr) => SLOT_SET.has(String(timeStr || '').trim());

const CLOSED_DAY_MESSAGE =
  'We are closed on Sundays. Please pick a day from Monday to Saturday.';
const OUT_OF_HOURS_MESSAGE = `Please pick a time between ${FIRST_SLOT} and ${LAST_SLOT}, in 15-minute steps.`;

/**
 * Validate a wall-clock booking slot against the window.
 *
 * @returns {{ok: true} | {ok: false, message: string}} `message` is safe to
 *   return to the caller verbatim.
 */
const validateBookingSlot = (dateStr, timeStr) => {
  const wd = weekdayOf(dateStr);
  if (wd === null) {
    return { ok: false, message: 'Invalid meeting date. Expected YYYY-MM-DD.' };
  }
  if (CLOSED_WEEKDAYS.includes(wd)) {
    return { ok: false, message: CLOSED_DAY_MESSAGE };
  }
  if (!isBookableTime(timeStr)) {
    return { ok: false, message: OUT_OF_HOURS_MESSAGE };
  }
  return { ok: true };
};

module.exports = {
  BOOKING_START_HOUR,
  BOOKING_END_HOUR,
  SLOT_STEP_MINUTES,
  CLOSED_WEEKDAYS,
  DAY_SLOTS,
  FIRST_SLOT,
  LAST_SLOT,
  IST_TIMEZONE,
  weekdayOf,
  isClosedDate,
  isBookableTime,
  validateBookingSlot,
  CLOSED_DAY_MESSAGE,
  OUT_OF_HOURS_MESSAGE,
};
