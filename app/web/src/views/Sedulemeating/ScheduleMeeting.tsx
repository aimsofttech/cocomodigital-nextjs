// @ts-nocheck
"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import Calendar from "react-calendar";
import { useNavigate, useLocation } from "@/src/lib/navigation";
import { FaRegClock, FaVideo, FaGlobeAsia } from "react-icons/fa";
import {
  CLOSED_DAY_MESSAGE,
  NO_SLOTS_LEFT_MESSAGE,
  fetchDayAvailability,
  fetchOpenDates,
  localDateKey,
  localMonthKey,
  viewerTimeZone,
} from "@/src/lib/bookingWindow";



const HOST_PHOTO_URL =
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png";

/* Which days are open and which 15-minute slots each one offers is the admin's
   configuration, fetched from the API — nothing about the window is decided
   here. See src/lib/bookingWindow.ts for the client. */

function formatSlot(slot, hour12) {
  return slot.toLocaleTimeString([], {
    hour: hour12 ? "numeric" : "2-digit",
    minute: "2-digit",
    hour12,
  });
}

function formatLongDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const ScheduleMeeting = ({ onConfirm = null }: { onConfirm?: ((date: Date, time: string, tz: string, startUtc: string) => void) | null }) => {
  /* Opens on today. If the admin has today switched off, the first effect that
     sees the month's open dates moves the selection to the next open one. */
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedSlot, setSelectedSlot] = useState(null); // an API slot object
  const [timezone, setTimezone] = useState("");
  /* Day availability straight from the API — slot list and booked flags. */
  const [dayAvail, setDayAvail] = useState(null);
  /* Open dates per visible month, keyed "YYYY-MM". A month absent from here
     hasn't loaded yet; its dates stay clickable rather than falsely disabled. */
  const [openDatesByMonth, setOpenDatesByMonth] = useState({});
  const [activeMonth, setActiveMonth] = useState(() => localMonthKey(new Date()));
  const [slotsLoading, setSlotsLoading] = useState(false);
  /* Deterministic on the server; the real locale preference is applied after
     mount (below) so the 12h/24h toggle can't differ between the two renders. */
  const [hour12, setHour12] = useState(false);
  /* The picker's contents depend on things that exist only in the browser —
     the current time, the visitor's timezone and their locale. Rendering them
     during SSR produced markup the client couldn't match: the server built the
     slot list at (say) 12:30 and the browser hydrated at 12:45, so the first
     future slot differed and React threw a hydration error. Nothing below is
     rendered until this flips, which is safe here because the booking funnel
     is noIndex — there is no SEO value in server-rendering it. */
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { cartItems = [] } = location.state || {};

  useEffect(() => {
    setTimezone(viewerTimeZone());
    // Default to 12h in en-US locales, 24h elsewhere — matches the
    // user's regional expectation without a settings click.
    if (typeof navigator !== "undefined" && navigator.language) {
      setHour12(/^en-(US|CA|AU|NZ|PH)/i.test(navigator.language));
    }
    // Batched with the two setters above, so this costs one re-render, not three.
    setMounted(true);
  }, []);

  const selectedKey = useMemo(() => localDateKey(selectedDate), [selectedDate]);
  const openDates = openDatesByMonth[activeMonth];

  /* Which dates in the month the calendar may offer. Fetched per month and
     cached, so paging back to a month already seen costs nothing. */
  useEffect(() => {
    if (!mounted || openDatesByMonth[activeMonth] !== undefined) return;
    const ctrl = new AbortController();
    fetchOpenDates(activeMonth, timezone, ctrl.signal).then((set) => {
      if (ctrl.signal.aborted) return;
      // null (feed unreachable) is stored as null, which tileDisabled reads as
      // "unknown" and leaves every date clickable.
      setOpenDatesByMonth((prev) => ({ ...prev, [activeMonth]: set }));
    });
    return () => ctrl.abort();
  }, [mounted, activeMonth, timezone, openDatesByMonth]);

  /* Land the visitor on a day they can actually book. Runs once, after the
     first month's open dates arrive — today may be switched off. */
  const initialJumpDone = useRef(false);
  useEffect(() => {
    if (initialJumpDone.current || !openDates) return;
    initialJumpDone.current = true;
    if (openDates.has(selectedKey)) return;
    const next = [...openDates].sort().find((d) => d >= selectedKey);
    if (!next) return;
    const [y, m, d] = next.split("-").map(Number);
    setSelectedDate(new Date(y, m - 1, d));
  }, [openDates, selectedKey]);

  // Drop the time when the date changes — a 14:30 valid yesterday
  // isn't valid today.
  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedKey]);

  /* The day's slots, with their booked flags, exactly as the API reports them.
     Re-runs on every date change, so a slot taken elsewhere shows up as booked
     the next time the day is opened. */
  useEffect(() => {
    if (!mounted) return;
    const ctrl = new AbortController();
    setSlotsLoading(true);
    fetchDayAvailability(selectedKey, timezone, ctrl.signal).then((data) => {
      if (ctrl.signal.aborted) return;
      setDayAvail(data);
      setSlotsLoading(false);
      // If the slot picked a moment ago is gone or now booked, drop it.
      setSelectedSlot((cur) =>
        cur && data.slots.some((s) => s.slotKey === cur.slotKey && !s.booked) ? cur : null
      );
    });
    return () => ctrl.abort();
  }, [mounted, selectedKey, timezone]);

  const timeSlots = dayAvail?.date === selectedKey ? dayAvail.slots : [];

  const handleConfirm = () => {
    if (!selectedDate || !selectedSlot) return;
    const time24 = selectedSlot.time;
    if (onConfirm) {
      onConfirm(selectedDate, time24, timezone, selectedSlot.startUtc);
      return;
    }
    navigate("/schedule-meeting", {
      state: {
        date: selectedDate,
        time: time24,
        timeZone: timezone,
        // The exact instant the API offered — carried through so the booking
        // POST reserves that slot and not a re-derived approximation of it.
        startUtc: selectedSlot.startUtc,
        cartItems,
      },
    });
  };

  return (
    <main className="schedule-wrapper">
      {/* Booking funnel pages aren't useful in search — they're
          per-user, depend on cart state, and add no value to a
          general visitor. noIndex keeps them out of search +
          LLM corpora. */}
      <div className="schedule-grid">
        {/* ------------------------------------------------------- *
         * Left: compact host card — trust strip, NOT a feature list *
         * ------------------------------------------------------- */}
        <aside className="schedule-host-card" aria-label="Meeting host">
          <div className="schedule-host-brand">
            <img
              src="/Images/logo/main-logo.png"
              alt=""
              className="schedule-host-brand-mark"
            />
            <span className="schedule-host-brand-name">
              cocoma <strong>digital</strong>
            </span>
          </div>

          <div className="schedule-host-portrait-wrap">
            <img
              src={HOST_PHOTO_URL}
              alt="Anil Mahato"
              className="schedule-host-portrait"
              loading="lazy"
              decoding="async"
            />
          </div>

          {/* Meeting name is the primary element here — that's what
              the prospect is booking. Host name is supporting. */}
          <h1 className="schedule-meeting-name">15-Min Discovery Call</h1>
          <p className="schedule-host-line">
            with <strong>Anil Mahato</strong>, Founder
          </p>

          <ul className="schedule-host-meta">
            <li>
              <FaRegClock aria-hidden="true" />
              <span>15 min</span>
            </li>
            <li>
              <FaVideo aria-hidden="true" />
              <span>Google Meet</span>
            </li>
            <li>
              <FaGlobeAsia aria-hidden="true" />
              <span>{timezone || "Your local time"}</span>
            </li>
          </ul>
        </aside>

        {/* ------------------------------------------------------- *
         * Right: calendar + slots + confirm — the action area      *
         * ------------------------------------------------------- */}
        <section className="schedule-picker" aria-label="Select date and time">
          {/* Single sticker-framed card holds calendar AND slots so
              the right side reads as one decision, not three. */}
          <div className="schedule-picker-card">
            {!mounted ? (
              /* Placeholder for the first (server) paint. Must not contain any
                 date, time, timezone or locale-derived text — that is exactly
                 what cannot be reproduced identically on the client. */
              <p className="schedule-slots-loading" role="status">
                Loading available times…
              </p>
            ) : (
              <>
            <div className="schedule-calendar">
              <Calendar
                onChange={setSelectedDate}
                value={selectedDate}
                minDate={new Date()}
                prev2Label={null}
                next2Label={null}
                onActiveStartDateChange={({ activeStartDate }) =>
                  activeStartDate && setActiveMonth(localMonthKey(activeStartDate))
                }
                /* Days the admin has switched off (or that have no slots left)
                   are greyed out and unclickable, so they can never become the
                   selected date. The existing .react-calendar__tile:disabled
                   rule styles them. A month whose feed hasn't arrived — or
                   couldn't be reached — disables nothing; the API is still the
                   gate. */
                tileDisabled={({ date, view }) => {
                  if (view !== "month") return false;
                  const known = openDatesByMonth[localMonthKey(date)];
                  return !!known && !known.has(localDateKey(date));
                }}
              />
            </div>

            <div className="schedule-slots-pane">
              <div className="flex items-center justify-between gap-2 flex-wrap flex-shrink-0">
                <div className="w-full">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-satoshi text-[1.15rem] font-black text-strong m-0 tracking-tight">
                      <span className="inline bg-[linear-gradient(transparent_55%,var(--brand,var(--color-primary,#fff000))_55%)] bg-no-repeat px-0.5">
                        {formatLongDate(selectedDate)}
                      </span>
                    </p>
                    <div
                      className="inline-flex bg-page-soft border-[1.5px] border-strong rounded-full p-0.5"
                      role="tablist"
                      aria-label="Time format"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={hour12}
                        className={`font-satoshi text-[0.7rem] font-black tracking-[0.04em] rounded-full px-[9px] py-1 cursor-pointer transition-colors duration-150 ${hour12 ? "bg-strong text-page" : "bg-transparent text-muted"}`}
                        onClick={() => setHour12(true)}
                      >
                        12h
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={!hour12}
                        className={`font-satoshi text-[0.7rem] font-black tracking-[0.04em] rounded-full px-[9px] py-1 cursor-pointer transition-colors duration-150 ${!hour12 ? "bg-strong text-page" : "bg-transparent text-muted"}`}
                        onClick={() => setHour12(false)}
                      >
                        24h
                      </button>
                    </div>
                  </div>
                  <p className="text-[0.8rem] text-muted mt-1 mb-0">
                    <span className="inline bg-[linear-gradient(transparent_55%,var(--brand,var(--color-primary,#fff000))_55%)] bg-no-repeat px-0.5">
                      {timezone || "Your local time"} · 15 min · Google Meet
                    </span>
                  </p>
                </div>
              </div>

              {slotsLoading && timeSlots.length === 0 ? (
                <p className="schedule-slots-loading" role="status">
                  Loading available times…
                </p>
              ) : timeSlots.length === 0 ? (
                <p className="schedule-slots-empty" role="status">
                  {dayAvail?.closed ? CLOSED_DAY_MESSAGE : NO_SLOTS_LEFT_MESSAGE}
                </p>
              ) : (
                <>
                {slotsLoading && (
                  <p className="schedule-slots-loading" aria-live="polite">
                    Checking availability…
                  </p>
                )}
                <ul
                  className="schedule-slots"
                  role="listbox"
                  aria-label="Available time slots"
                >
                  {timeSlots.map((slot) => {
                    /* Rendered from the instant, so the 12h/24h toggle and the
                       visitor's locale still control the label — the API only
                       says which instants exist. */
                    const label = formatSlot(new Date(slot.startUtc), hour12);
                    const active = selectedSlot?.slotKey === slot.slotKey;
                    return (
                      <li key={slot.slotKey}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          disabled={slot.booked}
                          aria-disabled={slot.booked}
                          title={slot.booked ? "Already booked" : undefined}
                          className={`schedule-slot ${active ? "schedule-slot--active" : ""} ${slot.booked ? "schedule-slot--booked" : ""}`}
                          onClick={() => !slot.booked && setSelectedSlot(slot)}
                        >
                          {label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                </>
              )}
            </div>
              </>
            )}
          </div>

          {/* Confirm button only renders when both are picked — no
              negative-framed disabled state to communicate "you
              haven't done enough yet". */}
          {selectedSlot && (
            <button
              type="button"
              className="schedule-confirm-btn"
              onClick={handleConfirm}
            >
              Confirm — {formatLongDate(selectedDate)} at{" "}
              {formatSlot(new Date(selectedSlot.startUtc), hour12)}
              {timezone && ` (${timezone})`}
            </button>
          )}
        </section>
      </div>
    </main>
  );
};

export default ScheduleMeeting;
