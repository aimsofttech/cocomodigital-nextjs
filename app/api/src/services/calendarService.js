'use strict';

/**
 * Google Calendar + Meet integration.
 *
 * Creates a Google Calendar event with a Google Meet conference for a booked
 * discovery call and returns the join link, so both the owner and the visitor
 * can be emailed a real link to join at the booked time.
 *
 * Auth uses an OAuth2 refresh token for a single host account — this works with
 * an ordinary gmail.com account (no Google Workspace / domain-wide delegation
 * needed). Mint the refresh token once via the consent flow, then store it in
 * GOOGLE_REFRESH_TOKEN.
 *
 * Like ./mailer, this degrades gracefully: if Google isn't configured (or the
 * API call fails) it logs and resolves { meetLink: null } so the booking and
 * the notification emails still succeed.
 *
 * Required .env to enable:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_REFRESH_TOKEN
 * Optional:
 *   GOOGLE_REDIRECT_URI    (only needed for the one-time consent flow)
 *   GOOGLE_CALENDAR_ID     (default 'primary')
 *   MEETING_HOST_EMAIL     (added as attendee; defaults to OWNER_EMAIL)
 *   MEETING_DURATION_MIN   (default 15)
 *   BOOKING_TIMEZONE       (fallback tz if the booking has none)
 */

const { google } = require('googleapis');
const logger = require('../utils/logger');

const isConfigured = () =>
  Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN
  );

let calendarClient = null;
let initialised = false;

// Build (once) and reuse a single authenticated Calendar client. googleapis
// transparently refreshes the short-lived access token from the refresh token.
const getCalendar = () => {
  if (initialised) return calendarClient;
  initialised = true;
  if (!isConfigured()) {
    logger.warn(
      'Calendar: Google not configured (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REFRESH_TOKEN) — Meet links disabled.'
    );
    calendarClient = null;
    return null;
  }
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  calendarClient = google.calendar({ version: 'v3', auth });
  return calendarClient;
};

const pad = (n) => String(n).padStart(2, '0');

// Normalise "HH:MM" or "HH:MM:SS" → "HH:MM:SS". Returns null if unparseable.
const normTime = (t) => {
  const parts = String(t || '').split(':');
  if (parts.length < 2) return null;
  const [h, m, s = 0] = parts.map(Number);
  if ([h, m, s].some((n) => Number.isNaN(n))) return null;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

// Add `minutes` to a naive "YYYY-MM-DDTHH:MM:SS" string (pure arithmetic, no
// timezone conversion). Handles hour/day rollover. Returns the same format.
const addMinutes = (naiveIso, minutes) => {
  const [d, t] = naiveIso.split('T');
  const [y, mo, da] = d.split('-').map(Number);
  const [h, mi, s = 0] = t.split(':').map(Number);
  const base = new Date(Date.UTC(y, mo - 1, da, h, mi, s));
  base.setUTCMinutes(base.getUTCMinutes() + minutes);
  return (
    `${base.getUTCFullYear()}-${pad(base.getUTCMonth() + 1)}-${pad(base.getUTCDate())}` +
    `T${pad(base.getUTCHours())}:${pad(base.getUTCMinutes())}:${pad(base.getUTCSeconds())}`
  );
};

const calendarId = () => process.env.GOOGLE_CALENDAR_ID || 'primary';
const durationMinutes = () => parseInt(process.env.MEETING_DURATION_MIN, 10) || 15;

/* Event start/end. The meeting's UTC instant is the source of truth whenever
   the caller has it: after an admin reschedule, meeting_date/meeting_time hold
   the studio's wall-clock while meeting_timezone still holds the visitor's
   zone, so pairing those two would put the event at the wrong hour. The
   wall-clock triple is only used for callers that have nothing else. */
const eventTiming = (booking) => {
  const tz = booking.meeting_timezone || process.env.BOOKING_TIMEZONE || 'Asia/Kolkata';
  const start = booking.meeting_start_utc ? new Date(booking.meeting_start_utc) : null;
  if (start && !Number.isNaN(start.getTime())) {
    const end = new Date(start.getTime() + durationMinutes() * 60_000);
    return {
      start: { dateTime: start.toISOString(), timeZone: tz },
      end: { dateTime: end.toISOString(), timeZone: tz },
    };
  }
  const date = booking.meeting_date;
  const time = normTime(booking.meeting_time);
  if (!date || !time) return null;
  const startNaive = `${date}T${time}`;
  return {
    start: { dateTime: startNaive, timeZone: tz },
    end: { dateTime: addMinutes(startNaive, durationMinutes()), timeZone: tz },
  };
};

/* Everyone who has to get into the call without knocking: the visitor, the
   host account and — once the meeting is delegated — the assigned team member.
   Guests not on the event have to be admitted by someone already inside, which
   nobody is when the assignee is the one hosting. */
const eventAttendees = (booking) => {
  const hostEmail = process.env.MEETING_HOST_EMAIL || process.env.OWNER_EMAIL;
  const seen = new Set();
  const attendees = [];
  for (const raw of [booking.email, hostEmail, booking.assigneeEmail]) {
    const email = String(raw || '').trim();
    if (!email || seen.has(email.toLowerCase())) continue;
    seen.add(email.toLowerCase());
    attendees.push({ email });
  }
  return attendees;
};

const eventSummary = (booking) =>
  `Discovery Call — ${booking.name || 'Guest'} × ${process.env.MAIL_BRAND || 'Cocoma Digital'}`;

const meetLinkOf = (data = {}) =>
  data.hangoutLink ||
  (data.conferenceData &&
    data.conferenceData.entryPoints &&
    (data.conferenceData.entryPoints.find((e) => e.entryPointType === 'video') || {}).uri) ||
  null;

// Google answers 404 for an unknown event and 410 for one already deleted.
const isGone = (err) => [404, 410].includes(Number(err?.code || err?.response?.status));

/**
 * Create a Calendar event with a Google Meet link for a booking.
 *
 * @param {object} booking { name, email, service, message, notes, meetingId?,
 *                           assigneeEmail?, meeting_start_utc?,
 *                           meeting_date, meeting_time, meeting_timezone }
 * @returns {Promise<{ meetLink:string|null, eventId?:string, htmlLink?:string,
 *                     skipped?:boolean, error?:string }>}
 *   `skipped` — Google isn't configured (no link by design); `error` — it is
 *   configured but the call failed.
 */
const createMeetingEvent = async (booking = {}) => {
  const cal = getCalendar();
  if (!cal) return { meetLink: null, skipped: true };

  const timing = eventTiming(booking);
  if (!timing) {
    logger.warn('Calendar: meeting has no start time — skipping Meet link.');
    return { meetLink: null, error: 'Meeting has no start time' };
  }

  /* A fresh conference id per request. Google ignores a createRequest whose id
     it has already seen, so an id derived from the slot + email would hand a
     visitor who re-books a slot after a cancellation no Meet room at all. */
  const requestId =
    `cocoma-${booking.meetingId || String(booking.email || 'guest').replace(/[^a-z0-9]/gi, '')}-${Date.now()}`.slice(0, 64);

  try {
    const res = await cal.events.insert({
      calendarId: calendarId(),
      conferenceDataVersion: 1,
      // 'none' = create the event + Meet link but DON'T let Google email its own
      // native invite to attendees. We send a single branded "booked" email from
      // the app (see mailer), so 'all'/'externalOnly' would duplicate it.
      sendUpdates: 'none',
      requestBody: {
        summary: eventSummary(booking),
        description: booking.message || booking.notes || 'Booked via cocomadigital.com',
        ...timing,
        attendees: eventAttendees(booking),
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        reminders: { useDefault: true },
      },
    });

    const data = res.data || {};
    const meetLink = meetLinkOf(data);
    logger.info(`Calendar: event created ${data.id} (meet=${meetLink ? 'yes' : 'no'})`);
    if (!meetLink) return { meetLink: null, eventId: data.id, htmlLink: data.htmlLink, error: 'Google created the event without a Meet link' };
    return { meetLink, eventId: data.id, htmlLink: data.htmlLink };
  } catch (err) {
    logger.error(`Calendar: failed to create event: ${err.message}`);
    return { meetLink: null, error: err.message };
  }
};

/**
 * Bring an existing event in line with the meeting — its time and its guest
 * list. The conference is untouched, so the Meet link everyone already has
 * keeps working.
 *
 * @returns {Promise<{ meetLink:string|null, eventId?:string, htmlLink?:string,
 *                     skipped?:boolean, notFound?:boolean, error?:string }>}
 *   `notFound` — the event was deleted from the calendar by hand.
 */
const updateMeetingEvent = async (eventId, booking = {}) => {
  const cal = getCalendar();
  if (!cal) return { meetLink: null, skipped: true };
  if (!eventId) return { meetLink: null, notFound: true };

  const timing = eventTiming(booking);
  try {
    const res = await cal.events.patch({
      calendarId: calendarId(),
      eventId,
      sendUpdates: 'none',
      requestBody: {
        summary: eventSummary(booking),
        ...(timing || {}),
        attendees: eventAttendees(booking),
      },
    });
    const data = res.data || {};
    if (data.status === 'cancelled') return { meetLink: null, notFound: true };
    logger.info(`Calendar: event updated ${data.id}`);
    return { meetLink: meetLinkOf(data), eventId: data.id, htmlLink: data.htmlLink };
  } catch (err) {
    if (isGone(err)) return { meetLink: null, notFound: true };
    logger.error(`Calendar: failed to update event ${eventId}: ${err.message}`);
    return { meetLink: null, error: err.message };
  }
};

/**
 * Remove a cancelled meeting's event, so it leaves the host calendar and its
 * Meet room stops being a live invitation. An event that is already gone counts
 * as removed.
 *
 * @returns {Promise<{ removed:boolean, skipped?:boolean, error?:string }>}
 */
const cancelMeetingEvent = async (eventId) => {
  const cal = getCalendar();
  if (!cal) return { removed: false, skipped: true };
  if (!eventId) return { removed: true };
  try {
    await cal.events.delete({ calendarId: calendarId(), eventId, sendUpdates: 'none' });
    logger.info(`Calendar: event deleted ${eventId}`);
    return { removed: true };
  } catch (err) {
    if (isGone(err)) return { removed: true };
    logger.error(`Calendar: failed to delete event ${eventId}: ${err.message}`);
    return { removed: false, error: err.message };
  }
};

module.exports = { createMeetingEvent, updateMeetingEvent, cancelMeetingEvent, isConfigured };
