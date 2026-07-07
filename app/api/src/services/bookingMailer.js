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

// Convert a 24h "HH:mm" / "HH:mm:ss" time string to "h:mm AM/PM". Returns the
// input unchanged if it doesn't look like a time string.
const formatTime12 = (time) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(time || '').trim());
  if (!m) return time;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${min} ${period}`;
};

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
    // Show the service, slot and the visitor's own message back to them, but not
    // their contact fields (name/email/phone/company) — no point echoing those.
    detailRows(
      { service: booking.service, message: booking.message, notes: booking.notes },
      slot,
      meetLink
    ),
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
      fromName: visitorName,
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

// ── Meeting request flow (pending → confirmed / rejected) ────────────────────

/**
 * Step 1: User submits a meeting request — status becomes "pending".
 * No Meet link yet. Notify user (wait for approval) and owner (review needed).
 */
const sendMeetingRequestEmails = async (booking = {}) => {
  const slot = resolveSlot(booking);
  const visitorName = booking.name || booking.userName || 'there';

  const ownerHtml = shell(
    'New Meeting Request',
    row('Name', visitorName) +
    row('Email', booking.email) +
    row('Phone', booking.phone) +
    row('Company', booking.companyName || booking.company) +
    row('Service', booking.service) +
    row('Requested Slot', slot) +
    row('Notes', booking.notes || booking.message),
    `A user has requested a 15-minute meeting. Please review and confirm the meeting request from the admin panel.`
  );

  const userHtml = shell(
    'Meeting Request Received',
    row('Name', visitorName) +
    row('Requested Slot', slot) +
    row('Duration', '15 Minutes'),
    `Thank you for booking a meeting. Your request has been submitted successfully. Please wait for admin confirmation. You will receive a meeting link once your meeting is approved.`
  );

  const [owner, user] = await Promise.allSettled([
    sendMail({
      to: ownerEmail(),
      replyTo: booking.email,
      // Owner's inbox shows the requester, not a generic label: the From
      // display name and the subject both carry the visitor's name.
      fromName: visitorName,
      subject: `New Meeting Request from ${visitorName}${slot ? ` — ${slot}` : ''}`,
      html: ownerHtml,
      text: `A user has requested a 15-minute meeting.\nName: ${visitorName}\nEmail: ${booking.email}\nSlot: ${slot || 'n/a'}\n\nPlease review in the admin panel.`,
    }),
    booking.email
      ? sendMail({
          to: booking.email,
          replyTo: ownerEmail(),
          subject: 'Meeting Request Received',
          html: userHtml,
          text: `Thank you for booking a meeting. Your request has been submitted successfully. Please wait for admin confirmation. You will receive a meeting link once your meeting is approved.`,
        })
      : Promise.resolve({ sent: false, skipped: true }),
  ]);

  const unwrap = (r) => (r.status === 'fulfilled' ? r.value : { sent: false, error: r.reason?.message });
  const result = { owner: unwrap(owner), user: unwrap(user) };
  logger.info(`Meeting request emails: owner=${JSON.stringify(result.owner.sent ?? result.owner.skipped)} user=${JSON.stringify(result.user.sent ?? result.user.skipped)}`);
  return result;
};

/**
 * Step 4: Admin confirms the meeting — send Meet link to both parties.
 */
const sendMeetingConfirmedEmails = async (booking = {}) => {
  const dateDisplay = booking.meetingDate || booking.meeting_date;
  const timeDisplay = formatTime12(booking.meetingTime || booking.meeting_time);
  const slot = [dateDisplay, timeDisplay].filter(Boolean).join(' ');
  const visitorName = booking.name || booking.userName || 'there';
  const meetLink = booking.meetLink || '';

  const userHtml = shell(
    'Meeting Confirmed',
    meetRow(meetLink) +
    row('Date', dateDisplay) +
    row('Time', timeDisplay) +
    row('Duration', '15 Minutes'),
    `Your meeting request has been approved. Please join the meeting using the link below.`
  );

  const ownerHtml = shell(
    'Meeting Scheduled Successfully',
    meetRow(meetLink) +
    row('User Name', visitorName) +
    row('Email', booking.email) +
    row('Phone', booking.phone) +
    row('Date', dateDisplay) +
    row('Time', timeDisplay),
    `A meeting has been confirmed with the following user.`
  );

  const [owner, user] = await Promise.allSettled([
    sendMail({
      to: ownerEmail(),
      replyTo: booking.email,
      fromName: visitorName,
      subject: `Meeting Scheduled with ${visitorName}${slot ? ` — ${slot}` : ''}`,
      html: ownerHtml,
      text: `Meeting confirmed.\nUser: ${visitorName} (${booking.email})\nSlot: ${slot || 'n/a'}\nGoogle Meet: ${meetLink || 'n/a'}`,
    }),
    booking.email
      ? sendMail({
          to: booking.email,
          replyTo: ownerEmail(),
          subject: 'Meeting Confirmed',
          html: userHtml,
          text: `Your meeting request has been approved.\nDate: ${dateDisplay || 'n/a'}\nTime: ${timeDisplay || 'n/a'}\nDuration: 15 Minutes\nGoogle Meet: ${meetLink || 'n/a'}`,
        })
      : Promise.resolve({ sent: false, skipped: true }),
  ]);

  const unwrap = (r) => (r.status === 'fulfilled' ? r.value : { sent: false, error: r.reason?.message });
  const result = { owner: unwrap(owner), user: unwrap(user) };
  logger.info(`Meeting confirmed emails: owner=${JSON.stringify(result.owner.sent ?? result.owner.skipped)} user=${JSON.stringify(result.user.sent ?? result.user.skipped)}`);
  return result;
};

/**
 * Admin reschedules an expired/pending meeting to a new slot — notify both
 * parties with the updated date/time and the (re)generated Meet link.
 */
const sendMeetingRescheduledEmails = async (booking = {}) => {
  const dateDisplay = booking.meetingDate || booking.meeting_date;
  const timeDisplay = formatTime12(booking.meetingTime || booking.meeting_time);
  const slot = [dateDisplay, timeDisplay].filter(Boolean).join(' ');
  const visitorName = booking.name || booking.userName || 'there';
  const meetLink = booking.meetLink || '';

  const userHtml = shell(
    'Meeting Rescheduled',
    meetRow(meetLink) +
    row('Date', dateDisplay) +
    row('Time', timeDisplay) +
    row('Duration', '15 Minutes'),
    `Your meeting has been rescheduled to a new time. Please join using the link below at the new scheduled time.`
  );

  const ownerHtml = shell(
    'Meeting Rescheduled',
    meetRow(meetLink) +
    row('User Name', visitorName) +
    row('Email', booking.email) +
    row('Phone', booking.phone) +
    row('Date', dateDisplay) +
    row('Time', timeDisplay),
    `The meeting with the following user has been rescheduled to a new time.`
  );

  const [owner, user] = await Promise.allSettled([
    sendMail({
      to: ownerEmail(),
      replyTo: booking.email,
      fromName: visitorName,
      subject: `Meeting Rescheduled with ${visitorName}${slot ? ` — ${slot}` : ''}`,
      html: ownerHtml,
      text: `Meeting rescheduled.\nUser: ${visitorName} (${booking.email})\nSlot: ${slot || 'n/a'}\nGoogle Meet: ${meetLink || 'n/a'}`,
    }),
    booking.email
      ? sendMail({
          to: booking.email,
          replyTo: ownerEmail(),
          subject: 'Your Meeting Has Been Rescheduled',
          html: userHtml,
          text: `Your meeting has been rescheduled.\nDate: ${dateDisplay || 'n/a'}\nTime: ${timeDisplay || 'n/a'}\nDuration: 15 Minutes\nGoogle Meet: ${meetLink || 'n/a'}`,
        })
      : Promise.resolve({ sent: false, skipped: true }),
  ]);

  const unwrap = (r) => (r.status === 'fulfilled' ? r.value : { sent: false, error: r.reason?.message });
  const result = { owner: unwrap(owner), user: unwrap(user) };
  logger.info(`Meeting rescheduled emails: owner=${JSON.stringify(result.owner.sent ?? result.owner.skipped)} user=${JSON.stringify(result.user.sent ?? result.user.skipped)}`);
  return result;
};

/**
 * Step 5: Admin rejects the meeting — notify the user only.
 */
const sendMeetingRejectedEmail = async (booking = {}) => {
  const visitorName = booking.name || booking.userName || 'there';

  const userHtml = shell(
    'Meeting Request Rejected',
    row('Name', visitorName),
    `We regret to inform you that your meeting request could not be approved at this time.`
  );

  const result = await sendMail({
    to: booking.email,
    replyTo: ownerEmail(),
    subject: 'Meeting Request Rejected',
    html: userHtml,
    text: `We regret to inform you that your meeting request could not be approved at this time.`,
  });

  logger.info(`Meeting rejected email: user=${JSON.stringify(result.sent ?? result.skipped)}`);
  return result;
};

module.exports = {
  sendBookingEmails,
  sendMeetingRequestEmails,
  sendMeetingConfirmedEmails,
  sendMeetingRejectedEmail,
  sendMeetingRescheduledEmails,
  ownerEmail,
};
