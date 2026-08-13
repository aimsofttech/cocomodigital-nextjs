// @ts-nocheck
"use client";
import React, { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { useLocation } from "@/src/lib/navigation";
import { useCart } from "@/src/lib/cart";
import { FaRegClock, FaVideo, FaGlobeAsia, FaArrowLeft } from "react-icons/fa";
import ScheduleMeeting   from "./ScheduleMeeting";
import BookingConfirmed  from "./BookingConfirmed";

/* ── constants ──────────────────────────────────────────────── */
const HOST_PHOTO_URL =
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png";

/* ── helpers ────────────────────────────────────────────────── */
function formatLongDate(d) {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}
function convertTo24Hour(t) {
  if (!t) return null;
  const s = t.trim();
  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const [h, m] = s.split(":");
    return `${h.padStart(2, "0")}:${m}:00`;
  }
  const mx = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!mx) return null;
  let h = parseInt(mx[1], 10);
  if (mx[3].toUpperCase() === "PM" && h !== 12) h += 12;
  if (mx[3].toUpperCase() === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${mx[2]}:00`;
}

/* ── shared card style ──────────────────────────────────────── */
const CARD: React.CSSProperties = {
  background: "#fff",
  border: "2px solid #111",
  borderRadius: "18px",
  boxShadow: "5px 5px 0 #fff000",
};

type Stage = "picker" | "form" | "confirmed";

/* ═══════════════════════════════════════════════════════════════
   Main component  — manages the full 3-stage booking flow
═══════════════════════════════════════════════════════════════ */
const ScheduleMeetingDetails = () => {
  const location = useLocation();
  const { clear: clearCart } = useCart();

  /* Capture navigation state: the cart, plus any slot the /ScheduleMeeting
     picker already chose (passed via persisted nav state). useLocation()
     deliberately returns state: null on the very first client render (to
     avoid a hydration mismatch) and fills it in from sessionStorage in an
     effect shortly after — so we can't read it synchronously via a lazy
     useState initializer, that would always see it as empty. Instead we
     apply it exactly once, in an effect, as soon as it becomes available. */
  const [navOnce, setNavOnce] = useState<Record<string, any>>({});
  const navOnceAppliedRef = useRef(false);
  useEffect(() => {
    if (navOnceAppliedRef.current) return;
    if (location.state) {
      navOnceAppliedRef.current = true;
      setNavOnce(location.state as any);
    }
  }, [location.state]);
  const cartItems = navOnce.cartItems || [];

  /* Stage: picker → form → confirmed. When the user already picked a slot on
     /ScheduleMeeting, jump straight to the details form so they don't have to
     choose the time a second time. */
  const [stage,    setStage]    = useState<Stage>("picker");
  const [pickedDate,   setPickedDate]   = useState<Date | null>(null);
  const [pickedTime,   setPickedTime]   = useState<string>("");
  const [pickedTz,     setPickedTz]     = useState<string>("");
  /* The exact UTC instant the availability feed offered for this slot. Sent
     verbatim so the reservation lands on the slot the visitor saw, rather than
     on one re-derived from a wall-clock string (which is ambiguous across a
     DST fall-back hour). */
  const [pickedStartUtc, setPickedStartUtc] = useState<string>("");
  const [bookingInfo,  setBookingInfo]  = useState<Record<string, string>>({});

  useEffect(() => {
    const incomingDate = navOnce.date ? new Date(navOnce.date) : null;
    const hasIncomingSlot = Boolean(
      incomingDate && !isNaN(incomingDate.getTime()) && navOnce.time
    );
    if (!hasIncomingSlot) return;
    setPickedDate(incomingDate);
    setPickedTime(navOnce.time);
    setPickedTz(navOnce.timeZone || "");
    setPickedStartUtc(navOnce.startUtc || "");
    setStage("form");
  }, [navOnce]);

  /* Consume the persisted nav state so a later refresh or direct visit to
     /schedule-meeting doesn't resurrect a stale slot or cart. */
  useEffect(() => {
    if (typeof window !== "undefined") {
      try { sessionStorage.removeItem("__cocoma_navigation_state__:/schedule-meeting"); } catch { /* noop */ }
    }
  }, []);

  /* Form state */
  const [step,        setStep]        = useState(1);
  const [formData,    setFormData]    = useState({ firstName: "", lastName: "", email: "", phone: "", message: "" });
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  /* Called by <ScheduleMeeting onConfirm={…}> when user confirms a slot */
  const handleTimeConfirmed = useCallback((date: Date, time: string, tz: string, startUtc: string) => {
    setPickedDate(date);
    setPickedTime(time);
    setPickedTz(tz);
    setPickedStartUtc(startUtc || "");
    setStage("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const onChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
    setErrors(p => ({ ...p, [name]: "" }));
  }, []);

  /* ── validation ── */
  const v1 = () => {
    const e: any = {};
    if (!formData.firstName.trim()) e.firstName = "Required";
    if (!formData.lastName.trim())  e.lastName  = "Required";
    if (!formData.email.trim())     e.email     = "Required";
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) e.email = "Invalid email";
    setErrors(e); return !Object.keys(e).length;
  };
  const v2 = () => {
    const e: any = {};
    if (!formData.message.trim()) e.message = "Tell us about your project";
    setErrors(e); return !Object.keys(e).length;
  };

  const onContinue = (e) => { e.preventDefault(); if (v1()) setStep(2); };
  const onBack     = () => { setErrors({}); setStep(1); };
  const onBackToPicker = () => { setStage("picker"); setStep(1); setErrors({}); setSubmitError(""); };

  /* ── submit ── */
  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    if (!v2()) return;

    const finalDate = (() => {
      const d = new Date(pickedDate!);
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split("T")[0];
    })();
    const t24 = convertTo24Hour(pickedTime);
    if (!t24) { setSubmitError("Invalid time — go back and pick again."); return; }

    /* Exact slot instant (UTC) — the server uses this to reserve the slot and
       reject duplicate bookings. Normally the instant the availability feed
       offered; rebuilt from the local wall-clock only for a slot that reached
       this page without one (e.g. older persisted navigation state).

       No availability rule is checked here. Which days and times are bookable
       is the admin's configuration, and the API is the only place that decides
       it — a stale tab or a hand-crafted state object gets a 400 below with the
       server's own reason, and is sent back to the picker. */
    const meetingStartUtc = pickedStartUtc || (() => {
      const d = new Date(`${finalDate}T${t24}`);
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    })();

    const notes = [
      `Slot: ${finalDate} ${t24} (${pickedTz})`,
      formData.message ? `Message: ${formData.message}` : "",
      cartItems.length ? `Cart:\n${cartItems.map(i => `  - ${i.title || i.name || i.id}`).join("\n")}` : "",
    ].filter(Boolean).join("\n\n");

    setSubmitting(true);
    try {
      const res = await fetch("/content-api/consultation-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name:        `${formData.firstName} ${formData.lastName}`.trim(),
          email:       formData.email,
          phone:       formData.phone || "",
          service:     cartItems?.[0]?.title || "Discovery Call",
          source_page: "/ScheduleMeeting",
          // Structured slot fields so the notification emails render cleanly.
          meeting_date:     finalDate,
          meeting_time:     t24,
          meeting_timezone: pickedTz,
          meeting_start_utc: meetingStartUtc,
          notes,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        /* 409 — taken between picking and submitting.
           400 — the slot is no longer offered at all (an admin closed the day
           or hid the time while this tab sat open).
           Both send the user back to the picker, which re-fetches availability
           and shows the schedule as it now stands. */
        if (res.status === 409 || res.status === 400) {
          setSubmitError(b?.message || "That time slot is no longer available. Please pick another.");
          setStage("picker");
          setStep(1);
          return;
        }
        // 502/503/504 or an "upstream" message means the API server couldn't be
        // reached (e.g. it isn't running) — show an actionable message instead
        // of the raw proxy error.
        const serverUnreachable = res.status >= 502 || /upstream/i.test(b?.message || "");
        throw new Error(
          serverUnreachable
            ? "We couldn't reach the booking server right now. Please try again in a moment — or email anil@cocomadigital.com and we'll lock your slot."
            : (b?.errors?.[0]?.message || b?.message || `HTTP ${res.status}`)
        );
      }
      clearCart();
      setBookingInfo({
        date:      pickedDate!.toISOString(),
        time:      pickedTime,
        timeZone:  pickedTz,
        fullName:  `${formData.firstName} ${formData.lastName}`.trim(),
        firstName: formData.firstName,
        email:     formData.email,
      });
      setStage("confirmed");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setSubmitError(err?.message || "Something went wrong. Email anil@cocomadigital.com");
    } finally {
      setSubmitting(false);
    }
  };

  /* ══════════════════════════════════════════════════════
     STAGE 1 — Time picker
  ══════════════════════════════════════════════════════ */
  if (stage === "picker") {
    return <ScheduleMeeting onConfirm={handleTimeConfirmed} />;
  }

  /* ══════════════════════════════════════════════════════
     STAGE 3 — Booking confirmed
  ══════════════════════════════════════════════════════ */
  if (stage === "confirmed") {
    return (
      <BookingConfirmed
        date={bookingInfo.date}
        time={bookingInfo.time}
        timeZone={bookingInfo.timeZone}
        fullName={bookingInfo.fullName}
        email={bookingInfo.email}
      />
    );
  }

  /* ══════════════════════════════════════════════════════
     STAGE 2 — Booking form (original CSS-class design)
  ══════════════════════════════════════════════════════ */
  return (
    <main className="schedule-wrapper">
      <div className="schedule-grid schedule-grid--detail">

        {/* ── Left: host card ── */}
        <aside className="schedule-host-card" aria-label="Meeting host">
          <div className="schedule-host-brand">
            <Image
              src="/Images/logo/main-logo.png"
              alt=""
              className="schedule-host-brand-mark"
              width={48}
              height={48}
            />
            <span className="schedule-host-brand-name">
              cocoma <strong>digital</strong>
            </span>
          </div>

          <div className="schedule-host-portrait-wrap">
            <Image
              src={HOST_PHOTO_URL}
              alt="Anil Mahato"
              className="schedule-host-portrait"
              width={200}
              height={200}
            />
          </div>

          <h1 className="schedule-meeting-name">15-Min Discovery Call</h1>
          <p className="schedule-host-line">
            with <strong>Anil Mahato</strong>, Founder
          </p>

          <ul className="schedule-host-meta">
            <li><FaRegClock aria-hidden="true" /><span>15 min</span></li>
            <li><FaVideo aria-hidden="true" /><span>Google Meet</span></li>
            <li><FaGlobeAsia aria-hidden="true" /><span>{pickedTz || "Your local time"}</span></li>
          </ul>
        </aside>

        {/* ── Right: booking summary + 2-step form ── */}
        <section className="schedule-detail-right" aria-label="Confirm booking">

          {/* Booking summary */}
          <div className="schedule-detail-summary" role="status">
            <div className="schedule-detail-summary-head">
              <p className="schedule-detail-summary-eyebrow">You're booking</p>
              <button
                type="button"
                className="schedule-detail-change-link"
                onClick={onBackToPicker}
              >
                <FaArrowLeft aria-hidden="true" /> Change time
              </button>
            </div>
            <p className="schedule-detail-summary-line">
              <strong>{pickedDate ? formatLongDate(pickedDate) : ""}</strong> at{" "}
              <strong>{pickedTime}</strong>
              <br />
              <span className="schedule-detail-summary-tz">
                {pickedTz} · 15 min · Google Meet
              </span>
            </p>
          </div>

          {/* Step indicator */}
          <div
            className="schedule-detail-steps"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={2}
          >
            <span className={`schedule-detail-step-chip ${step >= 1 ? "is-active" : ""}`}>1</span>
            <span className={`schedule-detail-step-bar  ${step >= 2 ? "is-active" : ""}`} aria-hidden="true" />
            <span className={`schedule-detail-step-chip ${step >= 2 ? "is-active" : ""}`}>2</span>
            <span className="schedule-detail-step-label">
              {step === 1 ? "Your details" : "About your release"}
            </span>
          </div>

          {/* ── Step 1: Identity ── */}
          {step === 1 && (
            <form
              key="step-1"
              className="schedule-detail-form schedule-detail-form--enter"
              onSubmit={onContinue}
              noValidate
            >
              <h2 className="schedule-detail-form-heading">First, the basics</h2>

              <div className="schedule-detail-field-row">
                <div className="schedule-detail-field">
                  <label htmlFor="sd-firstName">First name</label>
                  <input
                    id="sd-firstName"
                    type="text"
                    name="firstName"
                    placeholder="First"
                    value={formData.firstName}
                    onChange={onChange}
                    autoComplete="given-name"
                    autoFocus
                    aria-invalid={!!errors.firstName}
                  />
                  {errors.firstName && <small className="schedule-detail-error">{errors.firstName}</small>}
                </div>
                <div className="schedule-detail-field">
                  <label htmlFor="sd-lastName">Last name</label>
                  <input
                    id="sd-lastName"
                    type="text"
                    name="lastName"
                    placeholder="Last"
                    value={formData.lastName}
                    onChange={onChange}
                    autoComplete="family-name"
                    aria-invalid={!!errors.lastName}
                  />
                  {errors.lastName && <small className="schedule-detail-error">{errors.lastName}</small>}
                </div>
              </div>

              <div className="schedule-detail-field-row">
                <div className="schedule-detail-field">
                  <label htmlFor="sd-email">Email</label>
                  <input
                    id="sd-email"
                    type="email"
                    name="email"
                    placeholder="Where should we send the invite?"
                    value={formData.email}
                    onChange={onChange}
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && <small className="schedule-detail-error">{errors.email}</small>}
                </div>

                <div className="schedule-detail-field">
                  <label htmlFor="sd-phone">
                    Phone <span style={{ fontWeight: 400, opacity: 0.5 }}>(optional)</span>
                  </label>
                  <input
                    id="sd-phone"
                    type="tel"
                    name="phone"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={onChange}
                    autoComplete="tel"
                  />
                </div>
              </div>

              <button type="submit" className="schedule-confirm-btn">
                Continue →
              </button>
            </form>
          )}

          {/* ── Step 2: Context ── */}
          {step === 2 && (
            <form
              key="step-2"
              className="schedule-detail-form schedule-detail-form--enter"
              onSubmit={onSubmit}
              noValidate
            >
              <h2 className="schedule-detail-form-heading">
                One last thing — what are you launching?
              </h2>

              <div className="schedule-detail-field">
                <label htmlFor="sd-message" className="schedule-detail-label-quiet">
                  A line or two helps me prep
                </label>
                <textarea
                  id="sd-message"
                  name="message"
                  rows={4}
                  placeholder="A film, web-series, music release or reality show — title, scale, when."
                  value={formData.message}
                  onChange={onChange}
                  autoFocus
                  aria-invalid={!!errors.message}
                />
                {errors.message && <small className="schedule-detail-error">{errors.message}</small>}
              </div>

              {submitError && (
                <p className="schedule-detail-submit-error" role="alert">{submitError}</p>
              )}

              <div className="schedule-detail-step-actions">
                <button type="button" className="schedule-detail-back-btn" onClick={onBack}>
                  ← Back
                </button>
                <button type="submit" className="schedule-confirm-btn" disabled={submitting}>
                  {submitting ? "Locking your slot…" : "Lock my slot →"}
                </button>
              </div>

              <p className="schedule-detail-fineprint">
                Google Meet link arrives by email instantly. No follow-up nags.
              </p>
            </form>
          )}

        </section>
      </div>
    </main>
  );
};

export default ScheduleMeetingDetails;
