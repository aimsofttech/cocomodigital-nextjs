'use strict';

/**
 * CRM Calendar API — mounted at /crm/api/calendar.
 *
 * Read-only aggregation over meetings, calls, tasks and follow-ups, plus
 * external calendar sync. No new permission keys are introduced on purpose:
 * roles are persisted in the database as flat permission arrays, so inventing
 * `calendar:read` would 403 every existing non-admin role until each stored
 * role document was migrated. The calendar is a cross-module read view, so it
 * reuses `dashboard:view` (held by all four default roles), and gates the
 * write-ish sync action behind `settings:manage`.
 */

const router = require('express').Router();
const { crmProtect, requirePermission, audit } = require('../middleware/crmAuth');
const calendar = require('../services/calendar');
const calendarSync = require('../services/calendarSync');
const { ok, bad } = require('./_helpers');

router.use(crmProtect, audit);

/** Shared query parsing for every view endpoint. */
const optsFrom = (req, viewOverride) => ({
  view: viewOverride || req.query.view || 'month',
  date: req.query.date,
  timezone: req.query.timezone || req.query.tz,
  agendaDays: req.query.days,
  types: req.query.types,
  // `me` resolves server-side so a rep can't read another rep's agenda by id.
  ownerId: req.query.ownerId === 'me' ? String(req.crmUser._id) : req.query.ownerId,
  includeCancelled: req.query.includeCancelled === 'true',
});

const respond = async (req, res, viewOverride) => {
  const opts = optsFrom(req, viewOverride);
  if (opts.date && !/^\d{4}-\d{2}-\d{2}$/.test(opts.date)) {
    return bad(res, 'date must be YYYY-MM-DD');
  }
  try {
    const result = await calendar.listEvents(opts);
    return ok(res, {
      ...result,
      byDay: calendar.groupByDay(result.events, result.range.timezone),
    });
  } catch (err) {
    if (/time zone/i.test(err.message)) return bad(res, `Invalid timezone: ${opts.timezone}`);
    throw err;
  }
};

// GET /crm/api/calendar?view=day|week|month|agenda&date=&types=&ownerId=&tz=
router.get('/', requirePermission('dashboard:view'), (req, res) => respond(req, res));

// Explicit per-view routes — same payload, friendlier for the UI to call.
router.get('/day', requirePermission('dashboard:view'), (req, res) => respond(req, res, 'day'));
router.get('/week', requirePermission('dashboard:view'), (req, res) => respond(req, res, 'week'));
router.get('/month', requirePermission('dashboard:view'), (req, res) => respond(req, res, 'month'));
router.get('/agenda', requirePermission('dashboard:view'), (req, res) => respond(req, res, 'agenda'));

// Dedicated single-source calendars (Meeting / Task / Follow-up / Call).
for (const [path, type] of [['meetings', 'meeting'], ['tasks', 'task'], ['followups', 'followup'], ['calls', 'call']]) {
  router.get(`/${path}`, requirePermission('dashboard:view'), async (req, res) => {
    const result = await calendar.listEvents({ ...optsFrom(req), types: [type] });
    return ok(res, { ...result, byDay: calendar.groupByDay(result.events, result.range.timezone) });
  });
}

/* ── external calendar sync ────────────────────────────────────────────── */

// GET /crm/api/calendar/sync/status — which providers are usable right now.
router.get('/sync/status', requirePermission('dashboard:view'), (req, res) =>
  ok(res, calendarSync.status()));

// POST /crm/api/calendar/sync/google { view?, date?, ownerId?, limit? }
// Pushes scheduled calls in the resolved window onto Google Calendar.
router.post('/sync/google', requirePermission('settings:manage'), async (req, res) => {
  if (!calendarSync.googleConfigured()) {
    return bad(res, 'Google Calendar is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN).');
  }
  const range = calendar.resolveRange({
    view: req.body.view || 'week',
    date: req.body.date,
    timezone: req.body.timezone,
  });
  const result = await calendarSync.syncRangeToGoogle({
    from: range.from,
    to: range.to,
    ownerId: req.body.ownerId === 'me' ? String(req.crmUser._id) : req.body.ownerId,
    limit: parseInt(req.body.limit, 10) || 100,
  });
  return ok(res, { range, ...result });
});

// POST /crm/api/calendar/sync/outlook — reserved; reports setup state until
// MS Graph credentials exist rather than pretending to succeed.
router.post('/sync/outlook', requirePermission('settings:manage'), (req, res) => {
  const s = calendarSync.status();
  if (!s.outlook.configured) {
    return bad(res, `Outlook Calendar is not configured. Missing: ${s.outlook.missing.join(', ')}`);
  }
  return bad(res, 'Outlook sync is not implemented yet.');
});

module.exports = router;
