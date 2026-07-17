// @ts-nocheck
"use client";
import React, { useMemo } from "react";
import { Link, useLocation } from "@/src/lib/navigation";
import {
  FaCheck,
  FaRegClock,
  FaVideo,
  FaGlobeAsia,
  FaEnvelope,
  FaWhatsapp,
  FaGoogle,
  FaApple,
  FaMicrosoft,
  FaCalendarPlus,
  FaArrowRight,
} from "react-icons/fa";
import {
  googleCalendarUrl,
  outlookCalendarUrl,
  icsDataUri,
} from "../../utils/calendarLinks";
import { openMailto } from "../../lib/email";


const DIRECT_EMAIL = "anil@cocomadigital.com";
const WHATSAPP_NUMBER = "+918800528125";

const HOST_PHOTO_URL =
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png";

function whatsappLink(name, dateLine) {
  const text = `Hi Anil, this is ${name || "[your name]"}. I just booked our discovery call for ${dateLine}. Looking forward!`;
  return `https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(text)}`;
}

function mailtoLink(name, dateLine) {
  const subject = `Discovery call — ${dateLine}`;
  const body = `Hi Anil,\n\nThis is ${name || "[your name]"}. I just booked our 15-min discovery call for ${dateLine}.\n\nQuick question / context for the call:\n\n— Sent from cocomadigital.com`;
  return `mailto:${DIRECT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function combineDateTime(date, time) {
  if (!date || !time) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  // time is "HH:MM" 24-hour as stored by ScheduleMeeting submit.
  const match = time.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  d.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
  return d;
}

function formatLongDate(date) {
  return new Date(date).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface BookingConfirmedProps {
  date?: Date | string;
  time?: string;
  timeZone?: string;
  fullName?: string;
  email?: string;
}

const BookingConfirmed = ({ date: dateProp, time: timeProp, timeZone: tzProp, fullName: nameProp, email: emailProp }: BookingConfirmedProps = {}) => {
  const location = useLocation();
  const loc = location.state || {};
  const date      = dateProp    ?? loc.date;
  const time      = timeProp    ?? loc.time;
  const timeZone  = tzProp      ?? loc.timeZone;
  const fullName  = nameProp    ?? loc.fullName;
  const email     = emailProp   ?? loc.email;

  // Build the calendar event details once — feeds all three buttons.
  const calendarEvent = useMemo(() => {
    const start = combineDateTime(date, time);
    if (!start) return null;
    return {
      title: "15-Min Discovery Call · Cocoma Digital",
      description:
        "15-min discovery call with Anil Mahato (Founder, Cocoma Digital). Google Meet link will be in the calendar invite emailed to you.",
      location: "Google Meet (link in invite)",
      start,
      durationMinutes: 15,
    };
  }, [date, time]);

  const dateLine = date && time ? `${formatLongDate(date)} at ${time}` : null;

  return (
    <main className="booking-confirmed-wrapper">
      <div className="booking-confirmed-inner">
        {/* ----- Hero ----- */}
        <section className="booking-confirmed-hero" aria-live="polite">
          <div className="booking-confirmed-tick" aria-hidden="true">
            <FaCheck />
          </div>
          <p className="booking-confirmed-eyebrow">Booking confirmed</p>
          <h1 className="booking-confirmed-headline">
            You're <span className="bg-highlight-yellow bg-[length:100%_100%] bg-no-repeat px-[0.15em] box-decoration-clone">locked in</span>
            {fullName ? `, ${fullName.split(" ")[0]}` : ""}.
          </h1>
          <p className="booking-confirmed-sub">
            A Google Meet invite is on its way to{" "}
            <strong>{email || "your inbox"}</strong>. See you on the call.
          </p>
        </section>

        {/* ----- Summary card ----- */}
        {dateLine && (
          <section
            className="booking-confirmed-summary"
            aria-label="Booking summary"
          >
            <div className="booking-confirmed-summary-host">
              <img
                src={HOST_PHOTO_URL}
                alt="Anil Mahato"
                className="booking-confirmed-summary-portrait"
                loading="lazy"
              />
              <div>
                <p className="booking-confirmed-summary-eyebrow">
                  15-Min Discovery Call
                </p>
                <p className="booking-confirmed-summary-host-name">
                  with <strong>Anil Mahato</strong>, Founder, Cocoma Digital
                </p>
              </div>
            </div>
            <ul className="booking-confirmed-summary-meta">
              <li>
                <FaRegClock aria-hidden="true" />
                <span>
                  <strong>{formatLongDate(date)}</strong> at{" "}
                  <strong>{time}</strong> · 15 min
                </span>
              </li>
              <li>
                <FaGlobeAsia aria-hidden="true" />
                <span>{timeZone || "Your local time"}</span>
              </li>
              <li>
                <FaVideo aria-hidden="true" />
                <span>Google Meet — link in your email invite</span>
              </li>
            </ul>
          </section>
        )}

        {/* ----- What happens next ----- */}
        <section className="booking-confirmed-next" aria-label="What happens next">
          <h2 className="booking-confirmed-section-heading">
            What happens next
          </h2>
          <ol className="booking-confirmed-steps">
            <li>
              <span className="booking-confirmed-step-num">1</span>
              <div>
                <h3>Email invite — in the next minute</h3>
                <p>
                  Calendar invite with the Google Meet link lands in{" "}
                  <strong>{email || "your inbox"}</strong>. Accept it to lock the
                  slot in your calendar.
                </p>
              </div>
            </li>
            <li>
              <span className="booking-confirmed-step-num">2</span>
              <div>
                <h3>WhatsApp nudge — 1 hour before</h3>
                <p>
                  Anil sends a quick WhatsApp ping an hour before the call so
                  you don't miss it. No spam — just one message.
                </p>
              </div>
            </li>
            <li>
              <span className="booking-confirmed-step-num">3</span>
              <div>
                <h3>The call</h3>
                <p>
                  15 minutes on Google Meet. We talk about your release. After
                  the call, a free 7-day mini-strategy lands in your inbox —
                  no obligation.
                </p>
              </div>
            </li>
          </ol>
        </section>

        {/* ----- Add to calendar ----- */}
        {calendarEvent && (
          <section
            className="booking-confirmed-calendar"
            aria-label="Add to calendar"
          >
            <h2 className="booking-confirmed-section-heading">
              <FaCalendarPlus aria-hidden="true" /> Add to your calendar
            </h2>
            <p className="booking-confirmed-section-sub">
              The email invite covers most calendars automatically. Add it
              manually if you'd rather:
            </p>
            <div className="booking-confirmed-calendar-buttons">
              <a
                className="booking-confirmed-cal-btn"
                href={googleCalendarUrl(calendarEvent)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaGoogle aria-hidden="true" /> Google
              </a>
              <a
                className="booking-confirmed-cal-btn"
                href={icsDataUri(calendarEvent)}
                download="cocoma-discovery-call.ics"
              >
                <FaApple aria-hidden="true" /> Apple
              </a>
              <a
                className="booking-confirmed-cal-btn"
                href={outlookCalendarUrl(calendarEvent)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaMicrosoft aria-hidden="true" /> Outlook
              </a>
              <a
                className="booking-confirmed-cal-btn booking-confirmed-cal-btn--ics"
                href={icsDataUri(calendarEvent)}
                download="cocoma-discovery-call.ics"
              >
                <FaCalendarPlus aria-hidden="true" /> .ics file
              </a>
            </div>
          </section>
        )}

        {/* ----- Contact Anil ----- */}
        <section
          className="booking-confirmed-contact"
          aria-label="Contact Anil before the call"
        >
          <h2 className="booking-confirmed-section-heading">
            Got something to share before the call?
          </h2>
          <p className="booking-confirmed-section-sub">
            Send Anil context, links or a brief — it'll make the 15 minutes way
            more useful.
          </p>
          <div className="booking-confirmed-contact-buttons">
            <a
              className="booking-confirmed-contact-btn"
              href={mailtoLink(fullName, dateLine || "our call")}
              onClick={(e) => {
                e.preventDefault();
                openMailto(mailtoLink(fullName, dateLine || "our call"));
              }}
            >
              <FaEnvelope aria-hidden="true" />
              <span>
                <strong>Email Anil</strong>
                <small>{DIRECT_EMAIL}</small>
              </span>
            </a>
            <a
              className="booking-confirmed-contact-btn"
              href={whatsappLink(fullName, dateLine || "our call")}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaWhatsapp aria-hidden="true" />
              <span>
                <strong>WhatsApp Anil</strong>
                <small>{WHATSAPP_NUMBER}</small>
              </span>
            </a>
          </div>
        </section>

        {/* ----- Soft cross-sell ----- */}
        <section
          className="booking-confirmed-explore"
          aria-label="In the meantime"
        >
          <h2 className="booking-confirmed-section-heading">
            While you wait — see how we launched these
          </h2>
          <p className="booking-confirmed-section-sub">
            A taste of how Cocoma turns title launches into platform moments.
          </p>
          <div className="booking-confirmed-explore-cards">
            <Link
              to="/marketing/psycho-saiyaan-youtube-campaign"
              className="booking-confirmed-explore-card"
            >
              <span className="booking-confirmed-explore-tag">Web Series</span>
              <h3>Psycho Saiyaan</h3>
              <p>35M+ views in 6 weeks · Amazon MX Player</p>
              <span className="booking-confirmed-explore-cta">
                See case study <FaArrowRight aria-hidden="true" />
              </span>
            </Link>
            <Link to="/our-work" className="booking-confirmed-explore-card">
              <span className="booking-confirmed-explore-tag">All work</span>
              <h3>Our case studies</h3>
              <p>100s of films, web-series, music & specials shipped</p>
              <span className="booking-confirmed-explore-cta">
                Browse all <FaArrowRight aria-hidden="true" />
              </span>
            </Link>
          </div>
        </section>

        <p className="booking-confirmed-fineprint">
          Need to reschedule? Email Anil directly — he replies within a day.
        </p>
      </div>
    </main>
  );
};

export default BookingConfirmed;
