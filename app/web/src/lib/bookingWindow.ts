/**
 * When a discovery call may be booked — the browser-side mirror of the API's
 * `app/api/src/utils/bookingWindow.js`.
 *
 * Monday–Saturday, 10:00–18:45 (last slot start), 15-minute steps. Sunday is
 * closed.
 *
 * This app and the API are separate npm packages with no shared module, so the
 * constants exist in both. The API is authoritative: everything here only
 * decides what the picker offers, and a booking that slips past it is still
 * rejected server-side. Keep the two in step if the window ever changes.
 */

export const BOOKING_START_HOUR = 10; // first slot starts 10:00
export const BOOKING_END_HOUR = 19; // exclusive — last slot starts 18:45
export const SLOT_STEP_MINUTES = 15;

/** Day numbers (Date#getDay) the studio does not take calls. 0 = Sunday. */
export const CLOSED_WEEKDAYS = [0];

export const CLOSED_DAY_MESSAGE =
  "We're closed on Sundays — please pick a day from Monday to Saturday.";

/** True when the studio is closed on that date. */
export function isClosedDay(date: Date | null | undefined): boolean {
  if (!date) return false;
  return CLOSED_WEEKDAYS.includes(date.getDay());
}

/**
 * The given day, or the next open one after it.
 *
 * The picker opens on "today", which can be a Sunday — landing the visitor on a
 * disabled day with no slots. Nudging to Monday keeps the first paint useful.
 */
export function nextOpenDay(from: Date): Date {
  const d = new Date(from);
  // Bounded by the week length; CLOSED_WEEKDAYS never covers all seven days.
  for (let i = 0; i < 7 && isClosedDay(d); i++) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/**
 * Bookable slot starts for a date, as Date objects.
 *
 * Returns [] for a closed day, and on today drops slots that have already
 * passed — so an empty result means "nothing left to offer", which is exactly
 * what the picker needs to decide whether to show a message.
 */
export function generateTimeSlots(date: Date | null | undefined): Date[] {
  if (!date || isClosedDay(date)) return [];
  const slots: Date[] = [];
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  for (let h = BOOKING_START_HOUR; h < BOOKING_END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_STEP_MINUTES) {
      const slot = new Date(date);
      slot.setHours(h, m, 0, 0);
      if (isToday && slot <= now) continue;
      slots.push(slot);
    }
  }
  return slots;
}

/** "HH:mm" (24h) is a valid slot start within the window. */
export function isBookableTime(time24: string): boolean {
  const m = /^(\d{2}):(\d{2})$/.exec(String(time24 || "").trim());
  if (!m) return false;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  return (
    hour >= BOOKING_START_HOUR &&
    hour < BOOKING_END_HOUR &&
    minute % SLOT_STEP_MINUTES === 0
  );
}
