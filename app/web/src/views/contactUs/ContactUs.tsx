// @ts-nocheck
"use client";
import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "@/src/lib/navigation";
import { openMailto } from "@/src/lib/email";
import {
  FaCalendarPlus,
  FaWhatsapp,
  FaEnvelope,
  FaArrowRight,
} from "react-icons/fa";


const DIRECT_EMAIL = "anil@cocomadigital.com";
const WHATSAPP_NUMBER = "+918800528125";

const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
  "Hi Anil, I came in via cocomadigital.com — wanted to chat."
)}`;

const MAILTO_LINK = `mailto:${DIRECT_EMAIL}?subject=${encodeURIComponent(
  "Project enquiry"
)}`;


const INQUIRY_TYPES = [
  {
    id: "launch",
    label: "Launching a title",
    headingStep2: "One last thing — what are you launching?",
    placeholder:
      "A film, web-series, reality show or comedy special — title, scale, when.",
  },
  {
    id: "music",
    label: "Music promotion",
    headingStep2: "One last thing — tell us about the release",
    placeholder:
      "Track or album — artist, label, language, when it's dropping.",
  },
  {
    id: "youtube",
    label: "YouTube growth",
    headingStep2: "One last thing — tell us about your channel",
    placeholder:
      "Your channel — niche, current size, where you want to be in 6 months.",
  },
  {
    id: "social",
    label: "Social media growth",
    headingStep2: "One last thing — tell us about your social",
    placeholder:
      "Platforms (Instagram, YouTube, X, Facebook), current following, where you want to be.",
  },
  {
    id: "content",
    label: "Content services",
    headingStep2: "One last thing — what content do you need?",
    placeholder:
      "Format and volume — videos, shorts, edits, posters, thumbnails, carousels.",
  },
  {
    id: "revenue",
    label: "Revenue growth",
    headingStep2: "One last thing — what's the revenue goal?",
    placeholder:
      "The KPI you want to move and where you stand today — subs, views, paid conversions, monetisation.",
  },
  {
    id: "partnership",
    label: "Partnership / vendor",
    headingStep2: "One last thing — what's the partnership?",
    placeholder:
      "Your role — agency, freelancer, vendor, platform — and how you imagine working together.",
  },
  {
    id: "other",
    label: "Something else",
    headingStep2: "One last thing — what should we know?",
    placeholder:
      "Tell us a bit about it. We read every message and reply within a day.",
  },
];

export default function ContactUs() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [inquiryTypeId, setInquiryTypeId] = useState(INQUIRY_TYPES[0].id);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    message: "",
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const inquiryType = useMemo(
    () => INQUIRY_TYPES.find((t) => t.id === inquiryTypeId) || INQUIRY_TYPES[0],
    [inquiryTypeId]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateStep1 = () => {
    const e = {};
    if (!formData.fullName.trim()) e.fullName = "Tell us your name";
    if (!formData.email.trim()) e.email = "We'll write back here";
    else if (!/^\S+@\S+\.\S+$/.test(formData.email))
      e.email = "That email looks off";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!formData.message.trim())
      e.message = "A line or two helps us prep";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = (e) => {
    e.preventDefault();
    if (!validateStep1()) return;
    setStep(2);
  };

  const handleBack = () => {
    setErrors({});
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    if (!validateStep2()) return;

    // Tuck the inquiry type into the message as a `[Type: ...]`
    // prefix so Anshu can read it on the existing message column.
    // When he adds a real `inquiry_type` field on the backend we'll
    // promote this out of the message string.
    const taggedMessage = `[Type: ${inquiryType.label}]\n\n${formData.message.trim()}`;

    setSubmitting(true);
    try {
      /* POST to the API's contact-leads collection. Public create
         is enabled on the collection (anonymous form submits), so
         no auth header. The notifyLead afterChange hook fires
         off the Resend email when RESEND_API_KEY is set; lead
         saves regardless. */
      const res = await fetch("/content-api/contact-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: formData.fullName,
          email: formData.email,
          phone: "",
          message: taggedMessage,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // the API returns { errors: [{ message, field }] } on
        // validation fails — surface the first one if present.
        const firstErr = Array.isArray(body?.errors) && body.errors[0]?.message;
        throw new Error(firstErr || body?.message || `HTTP ${res.status}`);
      }
      navigate("/thank-you", {
        state: {
          successMessage: "Got it — we'll write back within a day.",
        },
      });
    } catch (err) {
      console.error("ContactUs submit failed:", err);
      setSubmitError(
        err?.message ||
        "Something went wrong. Try once more, or email anil@cocomadigital.com directly."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="contactus-wrapper">
      <div className="contactus-inner">
        {/* ----------------------------------------- *
         * Hero — broad welcome                      *
         * ----------------------------------------- */}
        <section className="contactus-hero">
          <p className="contactus-eyebrow">Let's Talk</p>
          <h1 className="contactus-headline">
            Tell us what you're{" "}
            <span className="bg-highlight-yellow bg-[length:100%_100%] bg-no-repeat px-[0.15em] box-decoration-clone">working on</span>.
          </h1>
          <p className="contactus-sub">
            Films, web-series, music, channels, campaigns — or something else
            entirely. We reply within a day.
          </p>
        </section>

        {/* ----------------------------------------- *
         * Quick channels — high-intent shortcuts     *
         * ----------------------------------------- */}
        <section
          className="contactus-channels"
          aria-label="Pick a channel to reach us"
        >
          <Link
            to="/ScheduleMeeting"
            className="contactus-channel contactus-channel--primary"
          >
            <span className="contactus-channel-icon" aria-hidden="true">
              <FaCalendarPlus />
            </span>
            <span className="contactus-channel-body">
              <strong>Book a 15-min call</strong>
              <small>Pick a slot — Google Meet · zero pressure</small>
            </span>
            <span className="contactus-channel-arrow" aria-hidden="true">
              <FaArrowRight />
            </span>
          </Link>

          <Link
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="contactus-channel"
          >
            <span className="contactus-channel-icon" aria-hidden="true">
              <FaWhatsapp />
            </span>
            <span className="contactus-channel-body">
              <strong>WhatsApp Anil</strong>
              <small>{WHATSAPP_NUMBER}</small>
            </span>
            <span className="contactus-channel-arrow" aria-hidden="true">
              <FaArrowRight />
            </span>
          </Link>

          <Link
            href={MAILTO_LINK}
            className="contactus-channel"
            onClick={(e) => { e.preventDefault(); openMailto(MAILTO_LINK); }}
          >
            <span className="contactus-channel-icon" aria-hidden="true">
              <FaEnvelope />
            </span>
            <span className="contactus-channel-body">
              <strong>Email Anil</strong>
              <small>{DIRECT_EMAIL}</small>
            </span>
            <span className="contactus-channel-arrow" aria-hidden="true">
              <FaArrowRight />
            </span>
          </Link>
        </section>

        {/* ----------------------------------------- *
         * Divider                                    *
         * ----------------------------------------- */}
        <div className="contactus-divider" role="separator">
          <span>Or, leave us a message</span>
        </div>

        {/* ----------------------------------------- *
         * Form — inquiry-type pills + 2-step          *
         * ----------------------------------------- */}
        <section className="contactus-form-section" aria-label="Contact form">
          {/* Inquiry type pills — visible from step 1; controls the
              Step 2 heading + placeholder. Sits above the step
              indicator so the user picks their context first. */}
          <div className="contactus-inquiry">
            <p className="contactus-inquiry-label">I'm here about…</p>
            <div className="contactus-inquiry-pills" role="radiogroup" aria-label="Inquiry type">
              {INQUIRY_TYPES.map((type) => {
                const active = type.id === inquiryTypeId;
                return (
                  <button
                    key={type.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`contactus-inquiry-pill ${active ? "is-active" : ""}`}
                    onClick={() => setInquiryTypeId(type.id)}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step indicator chips */}
          <div
            className="contactus-steps"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={2}
          >
            <span
              className={`contactus-step-chip ${step >= 1 ? "is-active" : ""}`}
            >
              1
            </span>
            <span
              className={`contactus-step-bar ${step >= 2 ? "is-active" : ""}`}
              aria-hidden="true"
            />
            <span
              className={`contactus-step-chip ${step >= 2 ? "is-active" : ""}`}
            >
              2
            </span>
            <span className="contactus-step-label">
              {step === 1 ? "Your details" : "About your project"}
            </span>
          </div>

          {step === 1 && (
            <form
              key="step-1"
              className="contactus-form contactus-form--enter"
              onSubmit={handleContinue}
              noValidate
            >
              <h2 className="contactus-form-heading">First, the basics</h2>

              <div className="contactus-field">
                <label htmlFor="cu-fullName">Your name</label>
                <input
                  id="cu-fullName"
                  type="text"
                  name="fullName"
                  placeholder="What should we call you?"
                  value={formData.fullName}
                  onChange={handleChange}
                  autoComplete="name"
                  autoFocus
                  aria-invalid={!!errors.fullName}
                />
                {errors.fullName && (
                  <small className="contactus-error">{errors.fullName}</small>
                )}
              </div>

              <div className="contactus-field">
                <label htmlFor="cu-email">Email</label>
                <input
                  id="cu-email"
                  type="email"
                  name="email"
                  placeholder="Where should we write back?"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <small className="contactus-error">{errors.email}</small>
                )}
              </div>

              <button type="submit" className="contactus-submit-btn">
                Continue →
              </button>
            </form>
          )}

          {step === 2 && (
            <form
              // Stable key so changing the inquiry pill while on
              // Step 2 only updates the heading + placeholder via
              // normal React reconciliation — it does NOT remount
              // the form, so the user's typed message is preserved.
              key="step-2"
              className="contactus-form contactus-form--enter"
              onSubmit={handleSubmit}
              noValidate
            >
              <h2 className="contactus-form-heading">
                {inquiryType.headingStep2}
              </h2>

              <div className="contactus-field">
                <label
                  htmlFor="cu-message"
                  className="contactus-label-quiet"
                >
                  A line or two helps us prep
                </label>
                <textarea
                  id="cu-message"
                  name="message"
                  rows="4"
                  placeholder={inquiryType.placeholder}
                  value={formData.message}
                  onChange={handleChange}
                  autoFocus
                  aria-invalid={!!errors.message}
                />
                {errors.message && (
                  <small className="contactus-error">{errors.message}</small>
                )}
              </div>

              {submitError && (
                <p className="contactus-submit-error" role="alert">
                  {submitError}
                </p>
              )}

              <div className="contactus-step-actions">
                <button
                  type="button"
                  className="contactus-back-btn"
                  onClick={handleBack}
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="contactus-submit-btn"
                  disabled={submitting}
                >
                  {submitting ? "Sending…" : "Send message →"}
                </button>
              </div>

              <p className="contactus-fineprint">
                Anil personally replies within a day. No automated follow-ups.
              </p>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
