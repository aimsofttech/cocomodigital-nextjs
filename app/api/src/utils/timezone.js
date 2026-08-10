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

/**
 * Machine-readable counterpart to `formatInTimeZone`: the wall-clock date and
 * time of a UTC instant in `timeZone`, as "YYYY-MM-DD" / "HH:mm".
 *
 * Exists so booking rules stated in wall-clock terms ("no Sundays", "10:00 to
 * 18:45") can be checked even when a caller posts only a UTC instant and skips
 * the meeting_date/meeting_time fields the UI normally sends.
 *
 * @returns {{date:string, time:string}|null} null if `date` doesn't parse.
 */
const wallClockInZone = (date, timeZone) => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  try {
    // en-CA renders ISO-style dates (2026-08-10); en-GB gives 24-hour times.
    const day = d.toLocaleDateString('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    });
    const time = d.toLocaleTimeString('en-GB', {
      timeZone, hour: '2-digit', minute: '2-digit', hour12: false,
    });
    // Some ICU builds render midnight as "24:00" — normalise to "00:00".
    return { date: day, time: time.replace(/^24:/, '00:') };
  } catch {
    return null; // unrecognised timeZone
  }
};

module.exports = { zonedTimeToUtc, formatInTimeZone, wallClockInZone, IST_TIMEZONE };
