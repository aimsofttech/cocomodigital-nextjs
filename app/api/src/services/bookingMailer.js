'use strict';

/**
 * Booking notification emails.
 *
 * When a visitor books a discovery call on /ScheduleMeeting, notify BOTH:
 *   1. the website owner (Anil)  — a lead/booking alert, reply-to the visitor
 *   2. the visitor               — an acknowledgement of their request
 *
 * Owner address comes from OWNER_EMAIL (falls back to anil@cocomadigital.com).
 * All sends are best-effort and never throw (see ./mailer).
 */

const { sendMail } = require('./mailer');
const logger = require('../utils/logger');

const ownerEmail = () => process.env.OWNER_EMAIL || 'anil@cocomadigital.com';
const brand = () => process.env.MAIL_BRAND || 'Cocoma Digital';

const esc = (v) =>
  String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Derive a readable slot line from structured fields, or parse it out of the
// free-text `notes` the booking page sends ("Slot: 2026-06-20 14:30 (Asia/Kolkata)").
const resolveSlot = (b) => {
  const date = b.meeting_date || b.slot_date;
  const time = b.meeting_time || b.slot_time;
  const tz = b.meeting_timezone || b.slot_timezone || b.timezone;
  if (date || time) return [date, time].filter(Boolean).join(' ') + (tz ? ` (${tz})` : '');
  const m = /Slot:\s*([^\n]+)/i.exec(b.notes || '');
  return m ? m[1].trim() : '';
};

const row = (label, value) =>
  value ? `<tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap;vertical-align:top">${esc(label)}</td><td style="padding:4px 0;color:#111">${esc(value)}</td></tr>` : '';

// Prominent "Join Google Meet" button + the raw link (so it's clickable even
// where the button styling is stripped). Renders nothing if no link.
const meetRow = (link) =>
  link
    ? `<tr><td colspan="2" style="padding:10px 0 4px">` +
      `<a href="${esc(link)}" style="display:inline-block;background:#00897b;color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:700;font-size:14px">Join Google Meet</a>` +
      `<div style="margin-top:8px;font-size:12px;color:#666;word-break:break-all">${esc(link)}</div>` +
      `</td></tr>`
    : '';

const shell = (title, bodyRows, intro) => `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;border:1px solid #eee;border-radius:10px;overflow:hidden">
    <div style="background:#0b63f6;color:#fff;padding:18px 24px;font-size:18px;font-weight:700">${esc(title)}</div>
    <div style="padding:20px 24px;color:#222;font-size:14px;line-height:1.6">
      ${intro ? `<p style="margin:0 0 14px">${intro}</p>` : ''}
      <table style="border-collapse:collapse;width:100%">${bodyRows}</table>
    </div>
    <div style="padding:14px 24px;background:#fafafa;color:#999;font-size:12px;border-top:1px solid #eee">
      ${esc(brand())} — automated message
    </div>
  </div>`;

const detailRows = (b, slot, meetLink) =>
  meetRow(meetLink) +
  row('Name', b.name) +
  row('Email', b.email) +
  row('Phone', b.phone) +
  row('Company', b.company) +
  row('Service', b.service) +
  row('Requested slot', slot) +
  row('Message', b.message || b.notes);

/**
 * Fire the owner + visitor booking emails. Best-effort, non-blocking.
 * @param {object} booking { name, email, phone, company, service, message, notes,
 *                            meeting_date?, meeting_time?, meeting_timezone?, source_page? }
 * @returns {Promise<{owner:object, user:object}>}
 */
const sendBookingEmails = async (booking = {}) => {
  const slot = resolveSlot(booking);
  const visitorName = booking.name || 'there';
  // Google Meet join link (accept a few possible field names).
  const meetLink = booking.meetLink || booking.meet_link || booking.googleMeetLink || '';
  const meetText = meetLink ? `\nJoin Google Meet: ${meetLink}` : '';

  // 1) Owner (Anil) — booking alert, reply goes straight to the visitor.
  const ownerHtml = shell(
    'New meeting booking',
    detailRows(booking, slot, meetLink),
    `You have a new discovery-call booking from <strong>${esc(visitorName)}</strong>.` +
      (meetLink ? ' The Google Meet link is below — it will open at the booked time.' : '')
  );

  // 2) Visitor — acknowledgement.
  const userHtml = shell(
    meetLink ? 'Your call is booked' : 'We received your booking request',
    detailRows({ service: booking.service }, slot, meetLink),
    `Hi ${esc(booking.name ? String(booking.name).split(' ')[0] : 'there')}, thanks for booking a call with ${esc(brand())}. ` +
      (meetLink
        ? `Your call${slot ? ` for <strong>${esc(slot)}</strong>` : ''} is confirmed — join using the Google Meet button below at the scheduled time.`
        : `We've received your request${slot ? ` for <strong>${esc(slot)}</strong>` : ''} and will confirm shortly.`) +
      ` If you need to reach us, just reply to this email.`
  );

  const [owner, user] = await Promise.allSettled([
    sendMail({
      to: ownerEmail(),
      replyTo: booking.email,
      subject: `New booking: ${visitorName}${slot ? ` — ${slot}` : ''}`,
      html: ownerHtml,
      text: `New booking from ${visitorName} (${booking.email}). Slot: ${slot || 'n/a'}.${meetText}`,
    }),
    booking.email
      ? sendMail({
          to: booking.email,
          replyTo: ownerEmail(),
          subject: meetLink
            ? `Your call with ${brand()} is booked${slot ? ` — ${slot}` : ''}`
            : `Your call with ${brand()} — request received`,
          html: userHtml,
          text: `Hi ${visitorName}, your booking${slot ? ` for ${slot}` : ''} is confirmed.${meetText}`,
        })
      : Promise.resolve({ sent: false, skipped: true, reason: 'no visitor email' }),
  ]);

  const unwrap = (r) => (r.status === 'fulfilled' ? r.value : { sent: false, error: r.reason?.message });
  const result = { owner: unwrap(owner), user: unwrap(user) };
  logger.info(`Booking emails: owner=${JSON.stringify(result.owner.sent ?? result.owner.skipped)} user=${JSON.stringify(result.user.sent ?? result.user.skipped)}`);
  return result;
};

module.exports = { sendBookingEmails, ownerEmail };
