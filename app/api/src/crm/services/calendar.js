'use strict';

/**
 * CRM Calendar — a read-only aggregation layer.
 *
 * It unifies four already-existing sources into one normalised event stream so
 * the CRM can render Day / Week / Month / Agenda views without any of those
 * modules having to change:
 *
 *   meeting   → the main app's `Meeting` collection (booked discovery calls)
 *   call      → CrmCall.scheduledAt
 *   task      → CrmTask.dueAt
 *   followup  → CrmFollowUp.dueAt
 *
 * Nothing here writes to the main app's collections — `Meeting` is only ever
 * read. All range maths is timezone-aware and DST-safe because it delegates to
 * the shared `zonedTimeToUtc` helper rather than assuming a fixed offset.
 */

const { CrmCall, CrmTask, CrmFollowUp } = require('../models');
const Meeting = require('../../models/Meeting');
const { zonedTimeToUtc } = require('../../utils/timezone');
const settings = require('./settings');

const EVENT_TYPES = ['meeting', 'call', 'task', 'followup'];
const VIEWS = ['day', 'week', 'month', 'agenda'];
const DEFAULT_TZ = 'Asia/Kolkata';

/* ── calendar-date helpers (operate on plain "YYYY-MM-DD" strings) ──────── */

/** The wall-clock calendar date of `instant` as seen in `tz`. */
const ymdInTz = (instant, tz) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(instant);

const addDays = (ymd, n) => {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
};

/** 0 = Sunday … 6 = Saturday, for a plain calendar date. */
const weekdayOf = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

const isValidYmd = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

/**
 * Resolve a view + anchor date into a concrete UTC instant range.
 * Weeks start on Monday. `agenda` looks forward from now.
 *
 * @returns {{from:Date, to:Date, anchor:string, view:string, timezone:string}}
 */
const resolveRange = ({ view = 'month', date, timezone, agendaDays = 30 } = {}) => {
  const tz = timezone || DEFAULT_TZ;
  const v = VIEWS.includes(view) ? view : 'month';
  const anchor = isValidYmd(date) ? date : ymdInTz(new Date(), tz);

  // Start-of-day in `tz` for a calendar date, as a real UTC instant.
  const startOf = (ymd) => zonedTimeToUtc(ymd, '00:00', tz);
  // Ranges are half-open internally then closed by 1ms so $lte is safe.
  const endOf = (ymdExclusive) => new Date(startOf(ymdExclusive).getTime() - 1);

  if (v === 'agenda') {
    const from = new Date();
    const days = Math.min(Math.max(parseInt(agendaDays, 10) || 30, 1), 365);
    return { from, to: endOf(addDays(ymdInTz(from, tz), days)), anchor, view: v, timezone: tz };
  }
  if (v === 'day') {
    return { from: startOf(anchor), to: endOf(addDays(anchor, 1)), anchor, view: v, timezone: tz };
  }
  if (v === 'week') {
    const back = (weekdayOf(anchor) + 6) % 7;           // Monday = 0
    const monday = addDays(anchor, -back);
    return { from: startOf(monday), to: endOf(addDays(monday, 7)), anchor, view: v, timezone: tz };
  }
  const first = `${anchor.slice(0, 8)}01`;
  const [y, m] = first.split('-').map(Number);
  const nextFirst = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return { from: startOf(first), to: endOf(nextFirst), anchor, view: v, timezone: tz };
};

/* ── source → normalised event mappers ─────────────────────────────────── */

const addMin = (d, min) => new Date(new Date(d).getTime() + (min || 0) * 60000);

const meetingEvent = (m) => ({
  id: `meeting:${m._id}`,
  sourceId: String(m._id),
  type: 'meeting',
  title: `Meeting — ${m.userName || 'Guest'}`,
  start: m.meeting_start_utc,
  end: addMin(m.meeting_start_utc, m.duration || 15),
  allDay: false,
  status: m.status,
  ownerId: null,
  entity: { kind: 'meeting', id: String(m._id) },
  meta: {
    email: m.email || '', phone: m.phone || '',
    meetLink: m.meetLink || null,
    // The visitor's own zone, so the UI can show "their 9am is your 4:30pm".
    visitorTimezone: m.meetingTimezone || null,
    assignedTo: (m.assignedTo && m.assignedTo.email) || null,
  },
});

const callEvent = (c) => ({
  id: `call:${c._id}`,
  sourceId: String(c._id),
  type: 'call',
  title: `${c.direction === 'inbound' ? 'Inbound' : 'Call'} — ${c.purpose || 'follow_up'}`,
  start: c.scheduledAt,
  end: addMin(c.scheduledAt, c.durationPlannedMin || 15),
  allDay: false,
  status: c.status,
  ownerId: c.ownerId ? String(c.ownerId) : null,
  entity: c.leadId ? { kind: 'lead', id: String(c.leadId) }
    : (c.contactId ? { kind: 'contact', id: String(c.contactId) } : null),
  meta: { direction: c.direction, toNumber: c.toNumber || '', recordingUrl: c.recordingUrl || null },
});

// Tasks and follow-ups are due-at points, not durations — rendered as markers.
const taskEvent = (t) => ({
  id: `task:${t._id}`,
  sourceId: String(t._id),
  type: 'task',
  title: t.title || 'Task',
  start: t.dueAt,
  end: t.dueAt,
  allDay: false,
  status: t.status,
  ownerId: t.assigneeId ? String(t.assigneeId) : null,
  entity: t.leadId ? { kind: 'lead', id: String(t.leadId) }
    : (t.contactId ? { kind: 'contact', id: String(t.contactId) } : null),
  meta: { priority: t.priority, taskType: t.type },
});

const followupEvent = (f) => ({
  id: `followup:${f._id}`,
  sourceId: String(f._id),
  type: 'followup',
  title: f.note ? `Follow-up — ${String(f.note).slice(0, 60)}` : 'Follow-up',
  start: f.dueAt,
  end: f.dueAt,
  allDay: false,
  status: f.status,
  ownerId: f.ownerId ? String(f.ownerId) : null,
  entity: f.leadId ? { kind: 'lead', id: String(f.leadId) }
    : (f.contactId ? { kind: 'contact', id: String(f.contactId) } : null),
  meta: { channelHint: f.channelHint },
});

/* ── main query ────────────────────────────────────────────────────────── */

/**
 * @param {{view?:string, date?:string, timezone?:string, agendaDays?:number,
 *          types?:string|string[], ownerId?:string, status?:string,
 *          includeCancelled?:boolean}} opts
 */
const listEvents = async (opts = {}) => {
  const cfg = await settings.getSettings().catch(() => ({}));
  const range = resolveRange({ ...opts, timezone: opts.timezone || cfg.timezone || DEFAULT_TZ });

  const requested = Array.isArray(opts.types)
    ? opts.types
    : String(opts.types || EVENT_TYPES.join(',')).split(',').map((s) => s.trim()).filter(Boolean);
  const types = requested.filter((t) => EVENT_TYPES.includes(t));
  const want = (t) => types.length === 0 || types.includes(t);

  const inRange = { $gte: range.from, $lte: range.to };
  const owner = opts.ownerId && opts.ownerId !== 'all' ? opts.ownerId : null;
  // Cancelled items are hidden by default so the grid reflects real workload.
  const hideCancelled = !opts.includeCancelled;

  const [meetings, calls, tasks, followups] = await Promise.all([
    want('meeting')
      ? Meeting.find({
        meeting_start_utc: inRange,
        ...(hideCancelled ? { status: { $nin: ['rejected'] } } : {}),
      }).select('userName email phone meeting_start_utc duration status meetLink meetingTimezone assignedTo').lean()
      : [],
    want('call')
      ? CrmCall.find({
        scheduledAt: inRange,
        ...(owner ? { ownerId: owner } : {}),
        ...(hideCancelled ? { status: { $nin: ['cancelled'] } } : {}),
      }).select('leadId contactId ownerId direction purpose scheduledAt durationPlannedMin status toNumber recordingUrl').lean()
      : [],
    want('task')
      ? CrmTask.find({
        dueAt: inRange,
        ...(owner ? { assigneeId: owner } : {}),
        ...(hideCancelled ? { status: { $nin: ['cancelled'] } } : {}),
      }).select('title leadId contactId assigneeId dueAt priority status type').lean()
      : [],
    want('followup')
      ? CrmFollowUp.find({
        dueAt: inRange,
        ...(owner ? { ownerId: owner } : {}),
        ...(hideCancelled ? { status: { $nin: ['cancelled'] } } : {}),
      }).select('note leadId contactId ownerId dueAt channelHint status').lean()
      : [],
  ]);

  const events = [
    ...meetings.map(meetingEvent),
    ...calls.map(callEvent),
    ...tasks.map(taskEvent),
    ...followups.map(followupEvent),
  ]
    .filter((e) => e.start)
    .sort((a, b) => new Date(a.start) - new Date(b.start));

  const counts = EVENT_TYPES.reduce((acc, t) => {
    acc[t] = events.filter((e) => e.type === t).length;
    return acc;
  }, {});

  return { range, types: types.length ? types : EVENT_TYPES, counts, total: events.length, events };
};

/** Group events by their calendar date in `tz` — what Month/Week grids need. */
const groupByDay = (events, tz) => {
  const byDay = {};
  for (const e of events) {
    const key = ymdInTz(new Date(e.start), tz);
    (byDay[key] ||= []).push(e);
  }
  return byDay;
};

module.exports = {
  EVENT_TYPES, VIEWS, DEFAULT_TZ,
  resolveRange, listEvents, groupByDay, ymdInTz, addDays,
};
