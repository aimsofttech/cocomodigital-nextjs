// @ts-nocheck
"use client";
import React, { useState, useEffect, useMemo } from "react";
import Calendar from "react-calendar";
import { useNavigate, useLocation } from "@/src/lib/navigation";
import { FaRegClock, FaVideo, FaGlobeAsia } from "react-icons/fa";
import {
  CLOSED_DAY_MESSAGE,
  generateTimeSlots,
  isClosedDay,
  nextOpenDay,
} from "@/src/lib/bookingWindow";



const HOST_PHOTO_URL =
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png";

/* Window (Mon–Sat 10:00–18:45) and slot generation live in one module shared
   with the rest of the booking flow — see src/lib/bookingWindow.ts. */

// Canonical slot id shared with the API: the UTC instant truncated to the
// minute ("YYYY-MM-DDTHH:mm"). Must match the backend's slot_key format.
function slotKeyOf(slot) {
  return slot.toISOString().slice(0, 16);
}

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

const ScheduleMeeting = ({ onConfirm = null }: { onConfirm?: ((date: Date, time: string, tz: string) => void) | null }) => {
  // Opens on today, or the next open day when today is closed (Sunday).
  const [selectedDate, setSelectedDate] = useState(() => nextOpenDay(new Date()));
  const [selectedSlot, setSelectedSlot] = useState(null); // store the Date itself
  const [timezone, setTimezone] = useState("");
  const [bookedKeys, setBookedKeys] = useState(() => new Set<string>());
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
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    // Default to 12h in en-US locales, 24h elsewhere — matches the
    // user's regional expectation without a settings click.
    if (typeof navigator !== "undefined" && navigator.language) {
      setHour12(/^en-(US|CA|AU|NZ|PH)/i.test(navigator.language));
    }
    // Batched with the two setters above, so this costs one re-render, not three.
    setMounted(true);
  }, []);

  const timeSlots = useMemo(
    () => (mounted ? generateTimeSlots(selectedDate) : []),
    [selectedDate, mounted]
  );

  // Drop the time when the date changes — a 14:30 valid yesterday
  // isn't valid today.
  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedDate]);

  // Fetch which slots are already booked for the visible day and disable them.
  // Re-runs whenever the day's slots change (i.e. on date change / remount), so
  // availability refreshes after a booking is made elsewhere.
  useEffect(() => {
    let cancelled = false;
    if (!timeSlots.length) {
      setBookedKeys(new Set());
      return;
    }
    const from = timeSlots[0].toISOString();
    const to = timeSlots[timeSlots.length - 1].toISOString();
    setSlotsLoading(true);
    fetch(
      `/content-api/meeting-availability?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { headers: { Accept: "application/json" } }
    )
      .then((r) => (r.ok ? r.json() : { booked: [] }))
      .then((d) => {
        if (cancelled) return;
        const booked = new Set<string>(d?.booked || []);
        setBookedKeys(booked);
        // If the currently selected slot just became booked, clear it.
        setSelectedSlot((cur) => (cur && booked.has(slotKeyOf(cur)) ? null : cur));
      })
      .catch(() => {
        if (!cancelled) setBookedKeys(new Set());
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [timeSlots]);

  const handleConfirm = () => {
    if (!selectedDate || !selectedSlot) return;
    /* Belt-and-braces: the calendar already blocks closed days and no slots are
       generated for them, so this only fires if that guard is ever bypassed. */
    if (isClosedDay(selectedDate)) return;
    const time24 = formatSlot(selectedSlot, false);
    if (onConfirm) {
      onConfirm(selectedDate, time24, timezone);
      return;
    }
    navigate("/schedule-meeting", {
      state: {
        date: selectedDate,
        time: time24,
        timeZone: timezone,
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
                /* Closed days are greyed out and unclickable, so a Sunday can
                   never become the selected date in the first place. The
                   existing .react-calendar__tile:disabled rule styles them. */
                tileDisabled={({ date, view }) =>
                  view === "month" && isClosedDay(date)
                }
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

              {timeSlots.length === 0 ? (
                <p className="schedule-slots-empty" role="status">
                  {isClosedDay(selectedDate)
                    ? CLOSED_DAY_MESSAGE
                    : "No more slots today — pick another date."}
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
                    const label = formatSlot(slot, hour12);
                    const active =
                      selectedSlot && selectedSlot.getTime() === slot.getTime();
                    const booked = bookedKeys.has(slotKeyOf(slot));
                    return (
                      <li key={slot.getTime()}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          disabled={booked}
                          aria-disabled={booked}
                          title={booked ? "Already booked" : undefined}
                          className={`schedule-slot ${active ? "schedule-slot--active" : ""} ${booked ? "schedule-slot--booked" : ""}`}
                          onClick={() => !booked && setSelectedSlot(slot)}
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
              {formatSlot(selectedSlot, hour12)}
              {timezone && ` (${timezone})`}
            </button>
          )}
        </section>
      </div>
    </main>
  );
};

export default ScheduleMeeting;
