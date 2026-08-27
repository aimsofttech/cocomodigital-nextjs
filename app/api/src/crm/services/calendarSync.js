'use strict';

/**
 * CRM ⇄ external calendar sync.
 *
 * Deliberately separate from the main app's services/calendarService.js: that
 * one exists to mint Google Meet links for visitor bookings and is left
 * untouched. This one pushes *CRM-owned* scheduled calls onto a calendar so the
 * rep's own agenda shows up in Google/Outlook.
 *
 * It reuses the same OAuth env credentials (read-only) but builds its own
 * client, so neither service can affect the other.
 *
 * Like the rest of the CRM integrations this degrades gracefully — if a
 * provider isn't configured, every call resolves with `{ skipped: true }`
 * rather than throwing, so the calendar UI keeps working offline.
 *
 * Google (already configured in this project):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
 *   GOOGLE_CALENDAR_ID   (optional, default 'primary')
 *
 * Outlook (not configured yet — see the setup guide):
 *   MS_CLIENT_ID, MS_CLIENT_SECRET, MS_TENANT_ID, MS_REFRESH_TOKEN
 */

const { google } = require('googleapis');
const { CrmCall } = require('../models');
const logger = require('../../utils/logger');

/* ── Google ────────────────────────────────────────────────────────────── */

const googleConfigured = () =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN);

let gClient = null;
let gInit = false;

const getGoogle = () => {
  if (gInit) return gClient;
  gInit = true;
  if (!googleConfigured()) {
    logger.warn('CRM calendarSync: Google not configured — calendar sync disabled.');
    gClient = null;
    return null;
  }
  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    gClient = google.calendar({ version: 'v3', auth });
  } catch (err) {
    logger.error(`CRM calendarSync: Google client init failed: ${err.message}`);
    gClient = null;
  }
  return gClient;
};

const calendarId = () => process.env.GOOGLE_CALENDAR_ID || 'primary';

const outlookConfigured = () =>
  Boolean(process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET && process.env.MS_REFRESH_TOKEN);

/** Which sync targets are usable right now — surfaced in the CRM UI. */
const status = () => ({
  google: {
    configured: googleConfigured(),
    calendarId: googleConfigured() ? calendarId() : null,
    missing: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'].filter((k) => !process.env[k]),
  },
  outlook: {
    configured: outlookConfigured(),
    missing: ['MS_CLIENT_ID', 'MS_CLIENT_SECRET', 'MS_TENANT_ID', 'MS_REFRESH_TOKEN'].filter((k) => !process.env[k]),
  },
});

const titleFor = (call) =>
  `${call.direction === 'inbound' ? 'Inbound call' : 'Call'} — ${call.purpose || 'follow_up'}`;

/**
 * Push one scheduled CrmCall to Google Calendar (create, or patch if already
 * synced). Never throws.
 * @returns {Promise<{synced:boolean, skipped?:boolean, eventId?:string, error?:string}>}
 */
const pushCallToGoogle = async (call) => {
  const cal = getGoogle();
  if (!cal) return { synced: false, skipped: true, reason: 'google not configured' };
  if (!call || !call.scheduledAt) return { synced: false, skipped: true, reason: 'call has no scheduledAt' };

  const start = new Date(call.scheduledAt);
  const end = new Date(start.getTime() + (call.durationPlannedMin || 15) * 60000);
  const body = {
    summary: titleFor(call),
    description: [call.notes, call.toNumber ? `Phone: ${call.toNumber}` : '', 'Synced from Cocoma CRM']
      .filter(Boolean).join('\n'),
    // UTC instants + explicit zone: unambiguous regardless of the rep's locale.
    start: { dateTime: start.toISOString(), timeZone: 'UTC' },
    end: { dateTime: end.toISOString(), timeZone: 'UTC' },
  };

  try {
    if (call.googleEventId) {
      const res = await cal.events.patch({
        calendarId: calendarId(), eventId: call.googleEventId, requestBody: body,
      });
      return { synced: true, eventId: res.data.id, updated: true };
    }
    const res = await cal.events.insert({ calendarId: calendarId(), requestBody: body });
    // Persist the id so the next push patches instead of duplicating.
    await CrmCall.updateOne({ _id: call._id }, { $set: { googleEventId: res.data.id } });
    return { synced: true, eventId: res.data.id, created: true };
  } catch (err) {
    // A stale id (event deleted in Google) — clear it so the next run recreates.
    if (err && (err.code === 404 || err.code === 410) && call.googleEventId) {
      await CrmCall.updateOne({ _id: call._id }, { $unset: { googleEventId: 1 } }).catch(() => {});
    }
    logger.error(`CRM calendarSync: push call ${call._id} failed: ${err.message}`);
    return { synced: false, error: err.message };
  }
};

/** Remove a previously-synced call from Google (used on cancel/delete). */
const removeCallFromGoogle = async (call) => {
  const cal = getGoogle();
  if (!cal || !call || !call.googleEventId) return { removed: false, skipped: true };
  try {
    await cal.events.delete({ calendarId: calendarId(), eventId: call.googleEventId });
    await CrmCall.updateOne({ _id: call._id }, { $unset: { googleEventId: 1 } });
    return { removed: true };
  } catch (err) {
    logger.error(`CRM calendarSync: delete event for call ${call._id} failed: ${err.message}`);
    return { removed: false, error: err.message };
  }
};

/**
 * Push every scheduled call in a window. Bounded by `limit` so a huge range
 * can't fire thousands of API calls in one request.
 */
const syncRangeToGoogle = async ({ from, to, ownerId, limit = 100 } = {}) => {
  if (!googleConfigured()) return { skipped: true, reason: 'google not configured', synced: 0, failed: 0 };
  const q = { status: 'scheduled', scheduledAt: { $gte: from, $lte: to } };
  if (ownerId) q.ownerId = ownerId;

  const calls = await CrmCall.find(q).limit(Math.min(limit, 250)).lean();
  let synced = 0; let failed = 0;
  const errors = [];
  for (const c of calls) {
    const r = await pushCallToGoogle(c);
    if (r.synced) synced += 1;
    else if (!r.skipped) { failed += 1; if (errors.length < 5) errors.push(r.error); }
  }
  return { considered: calls.length, synced, failed, errors };
};

module.exports = {
  status, googleConfigured, outlookConfigured,
  pushCallToGoogle, removeCallFromGoogle, syncRangeToGoogle,
};
