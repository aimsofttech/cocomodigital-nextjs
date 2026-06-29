'use strict';

/**
 * Convert a wall-clock "YYYY-MM-DD" + "HH:mm" pair, interpreted in the given
 * IANA timezone, to the equivalent UTC Date instant. No external tz library —
 * uses the Intl per-timezone-offset trick: stamp the wall-clock numbers as if
 * they were UTC, then measure how far that same instant drifts when displayed
 * in `timeZone` vs UTC; that drift is the zone's offset at that date, which we
 * subtract to land on the real UTC instant.
 *
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

module.exports = { zonedTimeToUtc };
