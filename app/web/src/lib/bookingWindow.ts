/**
 * Client for the booking-availability feed.
 *
 * This file used to hold a copy of the booking rule (Mon–Sat, 10:00–18:45).
 * It no longer decides anything: which days are open, and which 15-minute
 * slots each day offers, is configured by the admin and served by the API, so
 * a schedule change reaches visitors without a deploy. Everything here just
 * fetches and shapes that answer.
 *
 * Requests go through the Next route at /content-api/meeting-availability,
 * which proxies to the Express API (see src/app/content-api/[...slug]/route.ts).
 */

const ENDPOINT = "/content-api/meeting-availability";

export interface AvailabilitySlot {
  /** Wall-clock start in the viewer's own timezone, "HH:mm" (24h). */
  time: string;
  /** The exact instant, ISO-8601 UTC — what the booking POST reserves. */
  startUtc: string;
  /** Canonical slot id shared with the API: UTC truncated to the minute. */
  slotKey: string;
  /** Already held by another pending/confirmed meeting. */
  booked: boolean;
}

export interface DayAvailability {
  date: string;
  timezone: string;
  /** The admin has nothing configured for this date — not "today's slots ran out". */
  closed: boolean;
  slots: AvailabilitySlot[];
}

/** Shown when the selected day has no configured availability. */
export const CLOSED_DAY_MESSAGE =
  "We're not taking calls on this day — please pick another date.";

/** Shown when the day is open but every remaining slot has passed. */
export const NO_SLOTS_LEFT_MESSAGE = "No more slots today — pick another date.";

/** The viewer's IANA timezone, or "" during SSR. */
export function viewerTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

/** Local calendar date as "YYYY-MM-DD" — never toISOString, which shifts to UTC. */
export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

/** Local month as "YYYY-MM". */
export function localMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * The day's bookable slots, in the viewer's timezone.
 *
 * Never throws: an unreachable API yields a closed day, which the picker shows
 * as "pick another date" rather than offering slots the server would reject.
 */
export async function fetchDayAvailability(
  date: string,
  timeZone: string,
  signal?: AbortSignal
): Promise<DayAvailability> {
  const qs = new URLSearchParams({ date });
  if (timeZone) qs.set("tz", timeZone);
  try {
    const res = await fetch(`${ENDPOINT}?${qs.toString()}`, {
      headers: { Accept: "application/json" },
      signal,
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    return {
      date,
      timezone: data?.timezone || timeZone,
      closed: Boolean(data?.closed),
      slots: Array.isArray(data?.slots) ? (data.slots as AvailabilitySlot[]) : [],
    };
  } catch {
    return { date, timezone: timeZone, closed: true, slots: [] };
  }
}

/**
 * Dates in `month` ("YYYY-MM") that still have at least one bookable slot, as
 * local "YYYY-MM-DD" keys — what the calendar greys the rest out with.
 *
 * Returns null (rather than an empty set) when the feed can't be read, so the
 * caller can leave every date clickable instead of disabling the whole month.
 */
export async function fetchOpenDates(
  month: string,
  timeZone: string,
  signal?: AbortSignal
): Promise<Set<string> | null> {
  const qs = new URLSearchParams({ month });
  if (timeZone) qs.set("tz", timeZone);
  try {
    const res = await fetch(`${ENDPOINT}?${qs.toString()}`, {
      headers: { Accept: "application/json" },
      signal,
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    if (!Array.isArray(data?.openDates)) return null;
    return new Set<string>(data.openDates);
  } catch {
    return null;
  }
}
