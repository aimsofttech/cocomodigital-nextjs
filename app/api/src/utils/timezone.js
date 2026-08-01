'use strict';

/**
 * @returns {Date|null} null if the inputs can't be parsed.
 */
const zonedTimeToUtc = (dateStr, timeStr, timeZone) => {
  const [year, month, day] = String(dateStr || '').split('-').map(Number);
  const [hour, minute] = String(timeStr || '').split(':').map(Number);
  if ([year, month, day, hour, minute].some((n) => Number.isNaN(n))) return null;

  const asUTC = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const utcStr = asUTC.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = asUTC.toLocaleString('en-US', { timeZone });
  const offsetMs = new Date(tzStr).getTime() - new Date(utcStr).getTime();
  return new Date(asUTC.getTime() - offsetMs);
};

// The owner/admin's fixed reference zone — regardless of where the visitor
// or the admin's own browser happens to be.
const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Render a UTC instant as a wall-clock date/time string in `timeZone`. This is
 * the display-side counterpart to `zonedTimeToUtc` — it never mutates the
 * instant, only how it's shown.
 *
 * @returns {{date:string, time:string}|null} null if `date` doesn't parse.
 */
const formatInTimeZone = (date, timeZone) => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return {
    date: d.toLocaleDateString('en-US', { timeZone, day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }),
  };
};

module.exports = { zonedTimeToUtc, formatInTimeZone, IST_TIMEZONE };
