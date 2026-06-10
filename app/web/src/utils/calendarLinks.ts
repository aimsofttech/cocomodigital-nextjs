// @ts-nocheck
/**
 * Generate add-to-calendar URLs / files for a booked meeting.
 *
 * Calendly-style booking confirmation pages give the user quick links to
 * stash the slot in their calendar before the day. We support:
 *   - Google Calendar (URL with template)
 *   - Outlook.com / Office 365 (URL)
 *   - .ics download (data URI; works for Apple Calendar + everything else)
 *
 * Each helper takes the same shape:
 *   { title, description, location, start, durationMinutes }
 *
 * `start` should be a Date. We compute `end` from durationMinutes.
 *
 * Reference URLs:
 *   - Google:  https://calendar.google.com/calendar/render?action=TEMPLATE
 *   - Outlook: https://outlook.live.com/calendar/0/deeplink/compose
 */

export interface CalendarEventOptions {
  title: string;
  description?: string;
  location?: string;
  start: Date | string;
  durationMinutes?: number;
}

export interface IcsEventOptions extends CalendarEventOptions {
  uid?: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Format a Date as a UTC stamp YYYYMMDDTHHMMSSZ (used by Google + ICS). */
export function toUtcStamp(date: Date | string): string {
  const d = new Date(date);
  return (
    d.getUTCFullYear() +
    pad2(d.getUTCMonth() + 1) +
    pad2(d.getUTCDate()) +
    "T" +
    pad2(d.getUTCHours()) +
    pad2(d.getUTCMinutes()) +
    pad2(d.getUTCSeconds()) +
    "Z"
  );
}

/** Format a Date as Outlook expects: ISO string with Z. */
export function toOutlookStamp(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString();
}

/** Helper: returns end Date given start + minutes. */
function endDate(start: Date | string, durationMinutes: number): Date {
  return new Date(new Date(start).getTime() + durationMinutes * 60 * 1000);
}

/** Build a Google Calendar template URL. */
export function googleCalendarUrl({
  title,
  description = "",
  location = "",
  start,
  durationMinutes = 15,
}: CalendarEventOptions): string {
  const end = endDate(start, durationMinutes);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${toUtcStamp(start)}/${toUtcStamp(end)}`,
    details: description,
    location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Build an Outlook web compose URL. */
export function outlookCalendarUrl({
  title,
  description = "",
  location = "",
  start,
  durationMinutes = 15,
}: CalendarEventOptions): string {
  const end = endDate(start, durationMinutes);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: title,
    body: description,
    location,
    startdt: toOutlookStamp(start),
    enddt: toOutlookStamp(end),
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/** Build .ics file content as a string. */
export function buildIcsContent({
  title,
  description = "",
  location = "",
  start,
  durationMinutes = 15,
  uid = `${Date.now()}@cocomadigital.com`,
}: IcsEventOptions): string {
  const end = endDate(start, durationMinutes);
  // Folding/escaping per RFC 5545. Keep it conservative — Apple
  // Calendar and Google ingest are forgiving but escaping commas /
  // semicolons is required.
  const escape = (s: unknown): string =>
    String(s)
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cocoma Digital//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `DTSTART:${toUtcStamp(start)}`,
    `DTEND:${toUtcStamp(end)}`,
    `SUMMARY:${escape(title)}`,
    `DESCRIPTION:${escape(description)}`,
    `LOCATION:${escape(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Build a downloadable data URI for the .ics file. */
export function icsDataUri(opts: IcsEventOptions): string {
  const ics = buildIcsContent(opts);
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
