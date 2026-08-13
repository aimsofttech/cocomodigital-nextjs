'use strict';

/**
 * Single source of truth for when a discovery call may be booked.
 *
 * The window used to be a hard-coded constant here (Mon–Sat, 10:00–18:45). It
 * is now whatever the admin has configured in the `meeting_availability`
 * document — per weekday on/off, plus the individual 15-minute slot starts that
 * are open on that weekday. Nothing in this file decides business hours any
 * more; it only loads, normalises and applies the configuration.
 *
 * Every backend path derives its rule from here: the public picker feed, the
 * public booking POST, the admin reschedule picker and the admin reschedule
 * POST. The two browser bundles (app/web, app/admin) hold NO copy of the rule —
 * they read it from the API, so admin changes reach users without a deploy.
 *
 * ── Timezone model ────────────────────────────────────────────────────────
 * Availability is defined in the studio's own zone (`config.timezone`, IST by
 * default): "Monday 10:00" means 10:00 where the call is hosted. Every check
 * therefore runs against the UTC INSTANT, mapped back into the studio zone —
 * never against the visitor's wall clock. A visitor in New York can post any
 * date/time/timezone triple they like; what gets validated is the instant it
 * resolves to, so the rules cannot be side-stepped by lying about the zone.
 */
const MeetingAvailability = require('../models/MeetingAvailability');
const {
  zonedTimeToUtc,
  wallClockInZone,
  wallClockFormatter,
  isValidTimeZone,
  IST_TIMEZONE,
} = require('./timezone');

const SLOT_STEP_MINUTES = 15;
const DEFAULT_TIMEZONE = IST_TIMEZONE;

/** ["00:00", "00:15", … "23:45"] — every slot start the grid can hold. */
const ALL_SLOTS = (() => {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += SLOT_STEP_MINUTES) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
})();

const SLOT_SET = new Set(ALL_SLOTS);

const WEEKDAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

// ── date helpers ────────────────────────────────────────────────────────────

/**
 * Weekday for a plain "YYYY-MM-DD" calendar date.
 *
 * Built through Date.UTC so the answer describes the date as written and never
 * shifts with the server's own timezone — `new Date('2026-08-09')` parsed
 * locally can land on the 8th west of Greenwich.
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

const isDateStr = (s) => weekdayOf(s) !== null;

/** "2026-08-10" + 1 → "2026-08-11". Calendar arithmetic, no zone involved. */
const addDays = (dateStr, delta) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() + delta);
  return t.toISOString().slice(0, 10);
};

const compareDateStr = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** The canonical slot id shared with the frontend: UTC truncated to the minute. */
const slotKeyOf = (date) => new Date(date).toISOString().slice(0, 16);

// ── configuration ───────────────────────────────────────────────────────────

const defaultDays = () =>
  Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    enabled: true,
    slots: [...ALL_SLOTS],
  }));

/** The all-open default a fresh install starts from: 7 days, 00:00–23:45. */
const defaultConfig = () => ({
  timezone: DEFAULT_TIMEZONE,
  slotStepMinutes: SLOT_STEP_MINUTES,
  minNoticeMinutes: 0,
  days: defaultDays(),
});

/**
 * Coerce a stored (or submitted) document into the exact shape the rest of the
 * module assumes: a valid zone, and exactly 7 day entries indexed 0–6 whose
 * slots are on the grid, deduped and sorted.
 */
const normalizeConfig = (raw) => {
  const src = raw || {};
  const timezone = isValidTimeZone(src.timezone) ? src.timezone : DEFAULT_TIMEZONE;
  const byWeekday = new Map();
  for (const day of Array.isArray(src.days) ? src.days : []) {
    const wd = Number(day?.weekday);
    if (!Number.isInteger(wd) || wd < 0 || wd > 6 || byWeekday.has(wd)) continue;
    const slots = [...new Set((Array.isArray(day.slots) ? day.slots : [])
      .map((s) => String(s).trim())
      .filter((s) => SLOT_SET.has(s)))].sort();
    byWeekday.set(wd, { weekday: wd, enabled: day.enabled !== false, slots });
  }

  const days = Array.from({ length: 7 }, (_, wd) =>
    /* A weekday missing from the document (e.g. a config saved before the day
       list grew) is treated as closed rather than silently all-open. */
    byWeekday.get(wd) || { weekday: wd, enabled: false, slots: [] });

  const notice = Number(src.minNoticeMinutes);

  return {
    timezone,
    slotStepMinutes: SLOT_STEP_MINUTES,
    minNoticeMinutes: Number.isFinite(notice) && notice >= 0 ? Math.floor(notice) : 0,
    days,
    updatedAt: src.updatedAt || null,
  };
};

let cachedConfig = null;
let cachedAt = 0;
/* Short TTL rather than a permanent cache: an admin edit invalidates it
   explicitly (below), and the TTL bounds staleness for other API processes
   behind a load balancer that never see that invalidation. */
const CONFIG_CACHE_MS = 30_000;

/** Drop the cache so the next read re-loads — called after an admin save. */
const invalidateAvailabilityCache = () => {
  cachedConfig = null;
  cachedAt = 0;
};

/**
 * The current availability configuration, creating the all-open default on
 * first use.
 *
 * @returns {Promise<object>} a normalised config (never null).
 */
const getAvailabilityConfig = async () => {
  if (cachedConfig && Date.now() - cachedAt < CONFIG_CACHE_MS) return cachedConfig;

  let doc = await MeetingAvailability.findOne({ key: 'default' }).lean();
  if (!doc) {
    try {
      doc = (await MeetingAvailability.create({ key: 'default', ...defaultConfig() })).toObject();
    } catch (err) {
      // Two requests raced to seed it — the loser just reads the winner's doc.
      if (err && err.code === 11000) {
        doc = await MeetingAvailability.findOne({ key: 'default' }).lean();
      } else {
        throw err;
      }
    }
  }

  cachedConfig = normalizeConfig(doc);
  cachedAt = Date.now();
  return cachedConfig;
};

/**
 * Validate an admin-submitted configuration.
 *
 * @returns {{ok: true, value: object} | {ok: false, message: string}}
 */
const parseConfigInput = (body, current) => {
  const src = body || {};

  let timezone = current?.timezone || DEFAULT_TIMEZONE;
  if (src.timezone !== undefined) {
    if (!isValidTimeZone(src.timezone)) {
      return { ok: false, message: 'Unknown timezone. Use an IANA name such as Asia/Kolkata.' };
    }
    timezone = src.timezone;
  }

  if (!Array.isArray(src.days)) {
    return { ok: false, message: '`days` must be an array of 7 weekday entries.' };
  }

  const seen = new Set();
  const days = [];
  for (const day of src.days) {
    const wd = Number(day?.weekday);
    if (!Number.isInteger(wd) || wd < 0 || wd > 6) {
      return { ok: false, message: 'Each day needs a `weekday` between 0 (Sunday) and 6 (Saturday).' };
    }
    if (seen.has(wd)) {
      return { ok: false, message: `Duplicate entry for ${WEEKDAY_NAMES[wd]}.` };
    }
    seen.add(wd);

    const rawSlots = Array.isArray(day.slots) ? day.slots : [];
    const bad = rawSlots.find((s) => !SLOT_SET.has(String(s).trim()));
    if (bad !== undefined) {
      return {
        ok: false,
        message: `"${bad}" is not a valid ${SLOT_STEP_MINUTES}-minute slot start (expected HH:mm on the :00/:15/:30/:45 grid).`,
      };
    }
    days.push({
      weekday: wd,
      enabled: day.enabled !== false,
      slots: [...new Set(rawSlots.map((s) => String(s).trim()))].sort(),
    });
  }
  if (days.length !== 7) {
    return { ok: false, message: 'All 7 weekdays must be present in `days`.' };
  }
  days.sort((a, b) => a.weekday - b.weekday);

  let minNoticeMinutes = current?.minNoticeMinutes ?? 0;
  if (src.minNoticeMinutes !== undefined) {
    const n = Number(src.minNoticeMinutes);
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, message: '`minNoticeMinutes` must be 0 or more.' };
    }
    minNoticeMinutes = Math.floor(n);
  }

  return {
    ok: true,
    value: { timezone, slotStepMinutes: SLOT_STEP_MINUTES, minNoticeMinutes, days },
  };
};

// ── slot generation ─────────────────────────────────────────────────────────

/** Enabled slot starts on a studio-zone calendar date. [] when closed. */
const enabledSlotsOn = (config, businessDateStr) => {
  const wd = weekdayOf(businessDateStr);
  if (wd === null) return [];
  const day = config.days[wd];
  return day && day.enabled ? day.slots : [];
};

/**
 * UTC instants for a studio-zone date's slot list.
 *
 * The zone offset is resolved once for the day and reused, which turns ~100
 * `toLocaleString` round-trips into two. On a DST-transition day the first and
 * last slot disagree about the offset, and each slot is converted individually.
 *
 * @returns {Array<{time: string, ms: number}>} sorted as `slots` was.
 */
const businessSlotInstants = (businessDateStr, slots, timezone) => {
  if (!slots.length) return [];
  const [y, m, d] = businessDateStr.split('-').map(Number);
  const naiveMs = (time) => {
    const [h, mi] = time.split(':').map(Number);
    return Date.UTC(y, m - 1, d, h, mi);
  };

  const first = zonedTimeToUtc(businessDateStr, slots[0], timezone);
  const last = zonedTimeToUtc(businessDateStr, slots[slots.length - 1], timezone);
  if (!first || !last) return [];
  const offsetFirst = naiveMs(slots[0]) - first.getTime();
  const offsetLast = naiveMs(slots[slots.length - 1]) - last.getTime();
  const uniformOffset = offsetFirst === offsetLast ? offsetFirst : null;

  const out = [];
  for (const time of slots) {
    let ms;
    if (uniformOffset !== null) {
      ms = naiveMs(time) - uniformOffset;
    } else {
      const converted = zonedTimeToUtc(businessDateStr, time, timezone);
      if (!converted) continue;
      ms = converted.getTime();
    }
    out.push({ time, ms });
  }
  return out;
};

/**
 * Studio-zone calendar dates that overlap a viewer-zone calendar date.
 *
 * A viewer's Monday can contain slots belonging to the studio's Sunday, Monday
 * and (west of the studio) Tuesday — so a per-weekday rule can only be applied
 * after mapping through the instant. At most 4 dates: a local day is ≤25h and
 * a calendar date is 24h.
 */
const businessDatesTouching = (viewerDateStr, viewerTz, businessTz) => {
  const start = zonedTimeToUtc(viewerDateStr, '00:00', viewerTz);
  const end = zonedTimeToUtc(addDays(viewerDateStr, 1), '00:00', viewerTz);
  if (!start || !end) return [viewerDateStr];

  const toBusiness = wallClockFormatter(businessTz);
  const firstDate = toBusiness(start).date;
  const lastDate = toBusiness(new Date(end.getTime() - 60_000)).date;

  const dates = [];
  for (let cur = firstDate, i = 0; compareDateStr(cur, lastDate) <= 0 && i < 4; cur = addDays(cur, 1), i++) {
    dates.push(cur);
  }
  return dates;
};

/**
 * Every bookable slot that falls on `viewerDateStr` as seen from `viewerTz`.
 *
 * @param {object} opts
 * @param {boolean} [opts.includePast=false] keep slots that have already
 *   started (or fall inside the minimum-notice window).
 * @param {number} [opts.now=Date.now()]
 * @returns {{configured: number, slots: Array<{time,startUtc,slotKey,businessDate,businessTime}>}}
 *   `configured` counts the slots before the past/notice filter, so the caller
 *   can tell "the studio is closed that day" from "today's slots have passed".
 */
const slotsForViewerDate = (config, viewerDateStr, viewerTz, opts = {}) => {
  const { includePast = false, now = Date.now() } = opts;
  const zone = isValidTimeZone(viewerTz) ? viewerTz : config.timezone;
  if (!isDateStr(viewerDateStr)) return { configured: 0, slots: [] };

  const toViewer = wallClockFormatter(zone);
  const cutoff = now + config.minNoticeMinutes * 60_000;

  const seen = new Set();
  const all = [];
  for (const businessDate of businessDatesTouching(viewerDateStr, zone, config.timezone)) {
    const slots = enabledSlotsOn(config, businessDate);
    for (const { time, ms } of businessSlotInstants(businessDate, slots, config.timezone)) {
      const wall = toViewer(new Date(ms));
      if (wall.date !== viewerDateStr) continue;
      const key = slotKeyOf(ms);
      if (seen.has(key)) continue;
      seen.add(key);
      all.push({
        ms,
        time: wall.time,
        startUtc: new Date(ms).toISOString(),
        slotKey: key,
        businessDate,
        businessTime: time,
      });
    }
  }
  all.sort((a, b) => a.ms - b.ms);

  const visible = includePast ? all : all.filter((s) => s.ms > cutoff);
  return {
    configured: all.length,
    // `ms` is an internal sort key — not part of the API response.
    slots: visible.map(({ ms, ...rest }) => rest),
  };
};

/**
 * Viewer-zone calendar dates in [fromDateStr, toDateStr] that have at least one
 * still-bookable slot — what the calendar needs to grey out closed days.
 *
 * Walks the studio's dates once and buckets each instant by the viewer's date,
 * rather than re-deriving slots for every date in the range.
 *
 * @returns {string[]} sorted "YYYY-MM-DD".
 */
const openViewerDatesInRange = (config, fromDateStr, toDateStr, viewerTz, opts = {}) => {
  const { includePast = false, now = Date.now() } = opts;
  if (!isDateStr(fromDateStr) || !isDateStr(toDateStr)) return [];
  const zone = isValidTimeZone(viewerTz) ? viewerTz : config.timezone;
  const toViewer = wallClockFormatter(zone);
  const cutoff = now + config.minNoticeMinutes * 60_000;

  const open = new Set();
  // ±1 studio day of padding: the viewer's first/last date can be fed by a
  // studio date just outside the range.
  const first = addDays(fromDateStr, -1);
  const last = addDays(toDateStr, 1);
  for (let bd = first, i = 0; compareDateStr(bd, last) <= 0 && i < 40; bd = addDays(bd, 1), i++) {
    const slots = enabledSlotsOn(config, bd);
    for (const { ms } of businessSlotInstants(bd, slots, config.timezone)) {
      if (!includePast && ms <= cutoff) continue;
      const { date } = toViewer(new Date(ms));
      if (compareDateStr(date, fromDateStr) < 0 || compareDateStr(date, toDateStr) > 0) continue;
      open.add(date);
    }
  }
  return [...open].sort();
};

// ── validation ──────────────────────────────────────────────────────────────

const CLOSED_DAY_MESSAGE =
  'We are not taking calls on that day. Please pick another date.';
const OUT_OF_HOURS_MESSAGE =
  'That time is not available for booking. Please pick one of the offered slots.';

/**
 * The authoritative gate every booking write goes through.
 *
 * Takes the UTC instant, not a wall-clock pair, so a caller cannot dodge the
 * rules by mislabelling their timezone — whatever instant they end up asking
 * for is the one that gets checked against the studio's schedule.
 *
 * @param {Date|string|number} startUtc
 * @returns {Promise<{ok: true, config: object} | {ok: false, message: string}>}
 *   `message` is safe to return to the caller verbatim.
 */
const validateBookingInstant = async (startUtc, opts = {}) => {
  const { now = Date.now() } = opts;
  const instant = startUtc instanceof Date ? startUtc : new Date(startUtc);
  if (!instant || Number.isNaN(instant.getTime())) {
    return { ok: false, message: 'Invalid meeting date or time.' };
  }

  const config = await getAvailabilityConfig();
  const wall = wallClockInZone(instant, config.timezone);
  if (!wall) return { ok: false, message: 'Invalid meeting date or time.' };

  const wd = weekdayOf(wall.date);
  if (wd === null) return { ok: false, message: 'Invalid meeting date or time.' };

  const day = config.days[wd];
  if (!day || !day.enabled) {
    return { ok: false, message: CLOSED_DAY_MESSAGE };
  }
  if (!day.slots.includes(wall.time)) {
    return { ok: false, message: OUT_OF_HOURS_MESSAGE };
  }
  if (instant.getTime() <= now + config.minNoticeMinutes * 60_000) {
    return {
      ok: false,
      message: config.minNoticeMinutes > 0
        ? `Please pick a slot at least ${config.minNoticeMinutes} minutes from now.`
        : 'Please pick a time in the future.',
    };
  }
  return { ok: true, config };
};

/**
 * Wall-clock convenience wrapper around `validateBookingInstant`, for callers
 * that hold a date/time/zone triple (the admin reschedule form).
 *
 * @returns {Promise<{ok: true, startUtc: Date, config: object} | {ok: false, message: string}>}
 */
const validateBookingSlot = async (dateStr, timeStr, timeZone, opts = {}) => {
  if (!isDateStr(dateStr)) {
    return { ok: false, message: 'Invalid meeting date. Expected YYYY-MM-DD.' };
  }
  if (!/^\d{2}:\d{2}$/.test(String(timeStr || '').trim())) {
    return { ok: false, message: 'Invalid meeting time. Expected HH:mm.' };
  }
  const config = await getAvailabilityConfig();
  const zone = isValidTimeZone(timeZone) ? timeZone : config.timezone;
  const startUtc = zonedTimeToUtc(dateStr, String(timeStr).trim(), zone);
  if (!startUtc) return { ok: false, message: 'Invalid meeting date or time.' };

  const result = await validateBookingInstant(startUtc, opts);
  return result.ok ? { ...result, startUtc } : result;
};

module.exports = {
  SLOT_STEP_MINUTES,
  ALL_SLOTS,
  WEEKDAY_NAMES,
  DEFAULT_TIMEZONE,
  IST_TIMEZONE,

  weekdayOf,
  addDays,
  slotKeyOf,

  defaultConfig,
  normalizeConfig,
  parseConfigInput,
  getAvailabilityConfig,
  invalidateAvailabilityCache,

  enabledSlotsOn,
  slotsForViewerDate,
  openViewerDatesInRange,

  validateBookingInstant,
  validateBookingSlot,
  CLOSED_DAY_MESSAGE,
  OUT_OF_HOURS_MESSAGE,
};
