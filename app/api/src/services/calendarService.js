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

/**
 * Create a Calendar event with a Google Meet link for a booking.
 *
 * The booker's wall-clock time + IANA timezone are sent to Google as-is
 * (dateTime + timeZone), so Google anchors the event to the correct instant —
 * no manual UTC conversion needed here.
 *
 * @param {object} booking { name, email, service, message, notes,
 *                           meeting_date, meeting_time, meeting_timezone }
 * @returns {Promise<{ meetLink:string|null, eventId?:string, htmlLink?:string, error?:string }>}
 */
const createMeetingEvent = async (booking = {}) => {
  const cal = getCalendar();
  if (!cal) return { meetLink: null };

  const date = booking.meeting_date;
  const time = normTime(booking.meeting_time);
  const tz = booking.meeting_timezone || process.env.BOOKING_TIMEZONE || 'Asia/Kolkata';
  if (!date || !time) {
    logger.warn('Calendar: missing meeting_date/meeting_time — skipping Meet link.');
    return { meetLink: null };
  }

  const startNaive = `${date}T${time}`;
  const durationMin = parseInt(process.env.MEETING_DURATION_MIN, 10) || 15;
  const endNaive = addMinutes(startNaive, durationMin);
  const hostEmail = process.env.MEETING_HOST_EMAIL || process.env.OWNER_EMAIL;
  const brand = process.env.MAIL_BRAND || 'Cocoma Digital';

  const attendees = [];
  if (booking.email) attendees.push({ email: booking.email });
  if (hostEmail) attendees.push({ email: hostEmail });

  // Idempotency key for the conference request — a retry with the same id won't
  // mint a second Meet room.
  const requestId =
    `cocoma-${date}-${time}-${(booking.email || 'guest').replace(/[^a-z0-9]/gi, '')}`.slice(0, 64);

  try {
    const res = await cal.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      conferenceDataVersion: 1,
      sendUpdates: 'all', // Google also emails its native invite to attendees
      requestBody: {
        summary: `Discovery Call — ${booking.name || 'Guest'} × ${brand}`,
        description: booking.message || booking.notes || 'Booked via cocomadigital.com',
        start: { dateTime: startNaive, timeZone: tz },
        end: { dateTime: endNaive, timeZone: tz },
        attendees,
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
    const meetLink =
      data.hangoutLink ||
      (data.conferenceData &&
        data.conferenceData.entryPoints &&
        (data.conferenceData.entryPoints.find((e) => e.entryPointType === 'video') || {}).uri) ||
      null;

    logger.info(`Calendar: event created ${data.id} (meet=${meetLink ? 'yes' : 'no'})`);
    return { meetLink, eventId: data.id, htmlLink: data.htmlLink };
  } catch (err) {
    logger.error(`Calendar: failed to create event: ${err.message}`);
    return { meetLink: null, error: err.message };
  }
};

module.exports = { createMeetingEvent, isConfigured };
