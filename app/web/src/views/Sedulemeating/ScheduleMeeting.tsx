// @ts-nocheck
"use client";
import React, { useState, useEffect, useMemo } from "react";
import Calendar from "react-calendar";
import { useNavigate, useLocation } from "@/src/lib/navigation";
import { FaRegClock, FaVideo, FaGlobeAsia } from "react-icons/fa";



const HOST_PHOTO_URL =
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png";

const SLOT_START_HOUR = 10; // 10:00
const SLOT_END_HOUR = 19; // 19:00
const SLOT_STEP_MINUTES = 15;

function generateTimeSlots(date) {
  if (!date) return [];
  const slots = [];
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  for (let h = SLOT_START_HOUR; h < SLOT_END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_STEP_MINUTES) {
      const slot = new Date(date);
      slot.setHours(h, m, 0, 0);
      if (isToday && slot <= now) continue;
      slots.push(slot);
    }
  }
  return slots;
}

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
  });
}

const ScheduleMeeting = ({ onConfirm = null }: { onConfirm?: ((date: Date, time: string, tz: string) => void) | null }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState(null); // store the Date itself
  const [timezone, setTimezone] = useState("");
  const [bookedKeys, setBookedKeys] = useState(() => new Set<string>());
  const [slotsLoading, setSlotsLoading] = useState(false);
  // Default to 12h in en-US locales, 24h elsewhere — matches the
  // user's regional expectation without a settings click.
  const [hour12, setHour12] = useState(() => {
    if (typeof navigator !== "undefined" && navigator.language) {
      return /^en-(US|CA|AU|NZ|PH)/i.test(navigator.language);
    }
    return false;
  });
  const navigate = useNavigate();
  const location = useLocation();

  const { cartItems = [] } = location.state || {};

  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  const timeSlots = useMemo(
    () => generateTimeSlots(selectedDate),
    [selectedDate]
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

          {/* ONE sentence — pitches the offer without competing with
              the calendar action. Detailed agenda goes in the email. */}
          <p className="schedule-host-pitch">
            Tell me about your release. I'll send a{" "}
            <span className="bg-highlight-yellow bg-[length:100%_100%] bg-no-repeat px-[0.15em] box-decoration-clone">free 7-day mini-strategy</span>{" "}
            after the call — no obligation.
          </p>
        </aside>

        {/* ------------------------------------------------------- *
         * Right: calendar + slots + confirm — the action area      *
         * ------------------------------------------------------- */}
        <section className="schedule-picker" aria-label="Select date and time">
          {/* Single sticker-framed card holds calendar AND slots so
              the right side reads as one decision, not three. */}
          <div className="schedule-picker-card">
            <div className="schedule-calendar">
              <Calendar
                onChange={setSelectedDate}
                value={selectedDate}
                minDate={new Date()}
                prev2Label={null}
                next2Label={null}
              />
            </div>

            <div className="schedule-slots-pane">
              <div className="schedule-slots-head">
                <p className="schedule-slots-date">
                  {formatLongDate(selectedDate)}
                </p>
                <div
                  className="schedule-hour-toggle"
                  role="tablist"
                  aria-label="Time format"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={hour12}
                    className={`schedule-hour-toggle-btn ${hour12 ? "is-active" : ""}`}
                    onClick={() => setHour12(true)}
                  >
                    12h
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={!hour12}
                    className={`schedule-hour-toggle-btn ${!hour12 ? "is-active" : ""}`}
                    onClick={() => setHour12(false)}
                  >
                    24h
                  </button>
                </div>
              </div>

              {timeSlots.length === 0 ? (
                <p className="schedule-slots-empty">
                  No more slots today — pick another date.
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
            </button>
          )}
        </section>
      </div>
    </main>
  );
};

export default ScheduleMeeting;
