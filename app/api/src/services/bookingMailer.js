'use strict';


const { sendMail, mailFrom } = require('./mailer');
const { formatInTimeZone, IST_TIMEZONE } = require('../utils/timezone');
const logger = require('../utils/logger');

const ownerEmail = () => process.env.OWNER_EMAIL || 'anil@cocomadigital.com';
const ownerName = () => process.env.OWNER_NAME || 'Anil';
const brand = () => process.env.MAIL_BRAND || 'Cocoma Digital';

// True when the visitor booked with an owner-side address — either OWNER_EMAIL
// or the SMTP sending account (e.g. the owner testing the flow with their own
// mailbox). The visitor acknowledgement would land in the same inbox as the
// owner alert, so callers skip it to avoid duplicate mail.
const senderAddress = () => {
  const raw = mailFrom() || '';
  return ((raw.match(/<([^>]+)>/) || [])[1] || raw).trim().toLowerCase();
};
const isOwnerAddress = (email) => {
  const e = String(email || '').trim().toLowerCase();
  return e === ownerEmail().trim().toLowerCase() || (!!senderAddress() && e === senderAddress());
};

// Owner-side audience for meeting notifications: the owner plus the assigned
// team member (when the meeting has one), deduped case-insensitively.
const ownerRecipients = (assigneeEmail) => {
  const list = [ownerEmail()];
  const a = String(assigneeEmail || '').trim();
  if (a && a.toLowerCase() !== ownerEmail().trim().toLowerCase()) list.push(a);
  return list;
};
const skippedAsOwner = () =>
  Promise.resolve({ sent: false, skipped: true, reason: 'visitor email is the owner address' });

// Admin panel base URL — used to build the action links in owner emails. The
// admin SPA is served under the /admin base path (see app/admin/vite.config.ts).
const adminPanelUrl = () =>
  (process.env.ADMIN_PANEL_URL || 'https://cocomadigital.com/admin').replace(/\/+$/, '');
const meetingActionUrl = (id, action) =>
  `${adminPanelUrl()}/contact/meetings?open=${encodeURIComponent(id)}&action=${action}`;

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
  if (date || time) return [date, formatTime12(time)].filter(Boolean).join(' ') + (tz ? ` (${tz})` : '');
  const m = /Slot:\s*([^\n]+)/i.exec(b.notes || '');
  return m ? m[1].trim() : '';
};

// ── Zone-aware slot rendering ─────────────────────────────────────────────
// The single UTC instant (meeting_start_utc / createdAt) is the source of
// truth; every recipient sees it converted into THEIR zone — the visitor's
// own IANA zone, or IST for the owner/assignee — never the visitor's raw
// wall-clock string re-shown to someone else.

// Render a UTC instant in `timeZone` as "12 Aug 2026 · 10:00 AM (<tzLabel>)".
// Returns '' if the instant can't be resolved (falls back to resolveSlot()
// for legacy callers that only have the raw wall-clock fields).
const slotLine = (instant, timeZone, tzLabel) => {
  const rendered = instant && timeZone ? formatInTimeZone(instant, timeZone) : null;
  if (!rendered) return '';
  return `${rendered.date} · ${rendered.time}${tzLabel ? ` (${tzLabel})` : ''}`;
};

// The visitor's own view of a slot — their zone, labelled with their IANA name.
const userSlotLine = (b, instant) => slotLine(instant, b.meeting_timezone, b.meeting_timezone) || resolveSlot(b);

// The owner/assignee's view of the same instant — always IST.
const ownerSlotLine = (instant) => slotLine(instant, IST_TIMEZONE, 'IST');

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

// Confirm / Reject / Reschedule / Assign buttons for meeting emails — each
// deep-links into the admin panel's Meeting Requests page and opens the
// Meeting Details modal for this meeting, where the same action buttons are
// available. Renders nothing when the meeting id is unknown (legacy callers).
const btn = (href, label, styles) =>
  `<a href="${esc(href)}" style="display:inline-block;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:700;font-size:13px;margin:0 8px 8px 0;${styles}">${esc(label)}</a>`;
const meetingActionsRow = (meetingId) =>
  meetingId
    ? `<tr><td colspan="2" style="padding:14px 0 4px">` +
    btn(meetingActionUrl(meetingId, 'confirm'), 'Confirm Meeting', 'background:#0b63f6;color:#fff') +
    btn(meetingActionUrl(meetingId, 'reject'), 'Reject Meeting', 'background:#ef4444;color:#fff') +
    btn(meetingActionUrl(meetingId, 'reschedule'), 'Reschedule Meeting', 'background:#9333ea;color:#fff') +
    btn(meetingActionUrl(meetingId, 'assign'), 'Assign Meeting', 'background:#0d9488;color:#fff') +
    `<div style="margin-top:6px;font-size:12px;color:#666">These open this meeting's details in the admin panel — you may be asked to sign in first.</div>` +
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
    !booking.email
      ? Promise.resolve({ sent: false, skipped: true, reason: 'no visitor email' })
      : isOwnerAddress(booking.email)
        ? skippedAsOwner()
        : sendMail({
          to: booking.email,
          replyTo: ownerEmail(),
          subject: meetLink
            ? `Your call with ${brand()} is booked${slot ? ` — ${slot}` : ''}`
            : `Your call with ${brand()} — request received`,
          html: userHtml,
          text: `Hi ${visitorName}, your booking${slot ? ` for ${slot}` : ''} is confirmed.${meetText}`,
        }),
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
  const visitorName = booking.name || booking.userName || 'there';
  const userSlot = userSlotLine(booking, booking.meeting_start_utc);
  const ownerSlot = ownerSlotLine(booking.meeting_start_utc);
  const bookedOnOwner = slotLine(booking.createdAt, IST_TIMEZONE, 'IST');
  const bookedOnUser = slotLine(booking.createdAt, booking.meeting_timezone, booking.meeting_timezone);

  const ownerHtml = shell(
    'New Meeting Request',
    row('Name', visitorName) +
    row('Email', booking.email) +
    row('Phone', booking.phone) +
    row('Company', booking.companyName || booking.company) +
    row('Service', booking.service) +
    row('Booked On (IST)', bookedOnOwner) +
    row('Requested Slot (IST)', ownerSlot) +
    row("Visitor's Local Time", userSlot) +
    row('Notes', booking.notes || booking.message) +
    meetingActionsRow(booking.meetingId),
    `A user has requested a 15-minute meeting. Please review and confirm the meeting request from the admin panel.`
  );

  const userHtml = shell(
    'Meeting Request Received',
    row('Name', visitorName) +
    row('Booked On', bookedOnUser) +
    row('Requested Slot', userSlot) +
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
      subject: `New Meeting Request from ${visitorName}${ownerSlot ? ` — ${ownerSlot}` : ''}`,
      html: ownerHtml,
      text:
        `A user has requested a 15-minute meeting.\nName: ${visitorName}\nEmail: ${booking.email}\nSlot (IST): ${ownerSlot || 'n/a'}\nVisitor's local time: ${userSlot || 'n/a'}\n\nPlease review in the admin panel.` +
        (booking.meetingId
          ? `\n\nConfirm: ${meetingActionUrl(booking.meetingId, 'confirm')}\nReject: ${meetingActionUrl(booking.meetingId, 'reject')}\nReschedule: ${meetingActionUrl(booking.meetingId, 'reschedule')}\nAssign: ${meetingActionUrl(booking.meetingId, 'assign')}`
          : ''),
    }),
    !booking.email
      ? Promise.resolve({ sent: false, skipped: true })
      : isOwnerAddress(booking.email)
        ? skippedAsOwner()
        : sendMail({
          to: booking.email,
          replyTo: ownerEmail(),
          subject: 'Meeting Request Received',
          html: userHtml,
          text: `Thank you for booking a meeting. Your request has been submitted successfully. Please wait for admin confirmation. You will receive a meeting link once your meeting is approved.`,
        }),
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
  const visitorName = booking.name || booking.userName || 'there';
  const meetLink = booking.meetLink || '';
  const userSlot = formatInTimeZone(booking.meeting_start_utc, booking.meeting_timezone);
  const ownerSlot = formatInTimeZone(booking.meeting_start_utc, IST_TIMEZONE);
  const userSlotText = userSlotLine(booking, booking.meeting_start_utc);
  const ownerSlotText = ownerSlotLine(booking.meeting_start_utc);

  const userHtml = shell(
    'Meeting Confirmed',
    meetRow(meetLink) +
    row('Date', userSlot?.date) +
    row('Time', userSlot?.time) +
    row('Time Zone', booking.meeting_timezone) +
    row('Duration', '15 Minutes'),
    `Your meeting request has been approved. Please join the meeting using the link below.`
  );

  const ownerHtml = shell(
    'Meeting Scheduled Successfully',
    meetRow(meetLink) +
    row('User Name', visitorName) +
    row('Email', booking.email) +
    row('Phone', booking.phone) +
    row('Date (IST)', ownerSlot?.date) +
    row('Time (IST)', ownerSlot?.time) +
    row("Visitor's Local Time", userSlotText),
    `A meeting has been confirmed with the following user.`
  );

  const [owner, user] = await Promise.allSettled([
    sendMail({
      // The assigned team member (if any) receives the same owner-side mail.
      to: ownerRecipients(booking.assigneeEmail),
      replyTo: booking.email,
      fromName: visitorName,
      subject: `Meeting Scheduled with ${visitorName}${ownerSlotText ? ` — ${ownerSlotText}` : ''}`,
      html: ownerHtml,
      text: `Meeting confirmed.\nUser: ${visitorName} (${booking.email})\nSlot (IST): ${ownerSlotText || 'n/a'}\nVisitor's local time: ${userSlotText || 'n/a'}\nGoogle Meet: ${meetLink || 'n/a'}`,
    }),
    !booking.email
      ? Promise.resolve({ sent: false, skipped: true })
      : isOwnerAddress(booking.email)
        ? skippedAsOwner()
        : sendMail({
          to: booking.email,
          replyTo: ownerEmail(),
          subject: 'Meeting Confirmed',
          html: userHtml,
          text: `Your meeting request has been approved.\nDate: ${userSlot?.date || 'n/a'}\nTime: ${userSlot?.time || 'n/a'}\nTime Zone: ${booking.meeting_timezone || 'n/a'}\nDuration: 15 Minutes\nGoogle Meet: ${meetLink || 'n/a'}`,
        }),
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
  const visitorName = booking.name || booking.userName || 'there';
  const meetLink = booking.meetLink || '';
  const userSlot = formatInTimeZone(booking.meeting_start_utc, booking.meeting_timezone);
  const ownerSlot = formatInTimeZone(booking.meeting_start_utc, IST_TIMEZONE);
  const userSlotText = userSlotLine(booking, booking.meeting_start_utc);
  const ownerSlotText = ownerSlotLine(booking.meeting_start_utc);

  const userHtml = shell(
    'Meeting Rescheduled',
    meetRow(meetLink) +
    row('Date', userSlot?.date) +
    row('Time', userSlot?.time) +
    row('Time Zone', booking.meeting_timezone) +
    row('Duration', '15 Minutes'),
    `Your meeting has been rescheduled to a new time. Please join using the link below at the new scheduled time.`
  );

  const ownerHtml = shell(
    'Meeting Rescheduled',
    meetRow(meetLink) +
    row('User Name', visitorName) +
    row('Email', booking.email) +
    row('Phone', booking.phone) +
    row('Date (IST)', ownerSlot?.date) +
    row('Time (IST)', ownerSlot?.time) +
    row("Visitor's Local Time", userSlotText),
    `The meeting with the following user has been rescheduled to a new time.`
  );

  const [owner, user] = await Promise.allSettled([
    sendMail({
      // The assigned team member (if any) receives the same owner-side mail.
      to: ownerRecipients(booking.assigneeEmail),
      replyTo: booking.email,
      fromName: visitorName,
      subject: `Meeting Rescheduled with ${visitorName}${ownerSlotText ? ` — ${ownerSlotText}` : ''}`,
      html: ownerHtml,
      text: `Meeting rescheduled.\nUser: ${visitorName} (${booking.email})\nSlot (IST): ${ownerSlotText || 'n/a'}\nVisitor's local time: ${userSlotText || 'n/a'}\nGoogle Meet: ${meetLink || 'n/a'}`,
    }),
    !booking.email
      ? Promise.resolve({ sent: false, skipped: true })
      : isOwnerAddress(booking.email)
        ? skippedAsOwner()
        : sendMail({
          to: booking.email,
          replyTo: ownerEmail(),
          subject: 'Your Meeting Has Been Rescheduled',
          html: userHtml,
          text: `Your meeting has been rescheduled.\nDate: ${userSlot?.date || 'n/a'}\nTime: ${userSlot?.time || 'n/a'}\nTime Zone: ${booking.meeting_timezone || 'n/a'}\nDuration: 15 Minutes\nGoogle Meet: ${meetLink || 'n/a'}`,
        }),
  ]);

  const unwrap = (r) => (r.status === 'fulfilled' ? r.value : { sent: false, error: r.reason?.message });
  const result = { owner: unwrap(owner), user: unwrap(user) };
  logger.info(`Meeting rescheduled emails: owner=${JSON.stringify(result.owner.sent ?? result.owner.skipped)} user=${JSON.stringify(result.user.sent ?? result.user.skipped)}`);
  return result;
};

/**
 * Step 5: Admin rejects the meeting — notify the user. When the meeting is
 * assigned to a team member, the owner and the assignee also get a rejection
 * notice; unassigned meetings keep the original user-only behaviour.
 */
const sendMeetingRejectedEmail = async (booking = {}) => {
  const visitorName = booking.name || booking.userName || 'there';
  const userSlot = userSlotLine(booking, booking.meeting_start_utc);

  const userHtml = shell(
    'Meeting Request Rejected',
    row('Name', visitorName) +
    row('Requested Slot', userSlot),
    `We regret to inform you that your meeting request could not be approved at this time.`
  );

  const result = await sendMail({
    to: booking.email,
    replyTo: ownerEmail(),
    subject: 'Meeting Request Rejected',
    html: userHtml,
    text: `We regret to inform you that your meeting request could not be approved at this time.${userSlot ? `\nRequested slot: ${userSlot}` : ''}`,
  });

  if (booking.assigneeEmail) {
    const ownerSlot = ownerSlotLine(booking.meeting_start_utc);
    const ownerHtml = shell(
      'Meeting Rejected',
      row('User Name', visitorName) +
      row('Email', booking.email) +
      row('Slot (IST)', ownerSlot),
      `The meeting request from <strong>${esc(visitorName)}</strong> has been rejected.`
    );
    await sendMail({
      to: ownerRecipients(booking.assigneeEmail),
      subject: `Meeting Rejected — ${visitorName}`,
      html: ownerHtml,
      text: `The meeting request from ${visitorName} (${booking.email}) has been rejected.${ownerSlot ? `\nSlot (IST): ${ownerSlot}` : ''}`,
    });
  }

  logger.info(`Meeting rejected email: user=${JSON.stringify(result.sent ?? result.skipped)}`);
  return result;
};

/**
 * Owner delegates a meeting to a team member — notify the assignee (with the
 * same action buttons as the owner alert, so they can act directly) and send
 * the owner an assignment receipt.
 */
const sendMeetingAssignedEmails = async (booking = {}, assignee = {}) => {
  // Assignee + owner are both owner-side staff — always IST, never the
  // visitor's own zone re-labelled.
  const ownerSlot = ownerSlotLine(booking.meeting_start_utc) || resolveSlot(booking);
  const visitorName = booking.name || booking.userName || 'there';
  // Always the owner's name (OWNER_NAME) — not the logged-in admin account,
  // which may be a shared/test login like "demo".
  const assigner = ownerName();
  const meetLink = booking.meetLink || '';

  const assigneeHtml = shell(
    'Meeting Assigned to You',
    meetRow(meetLink) +
    row('User Name', visitorName) +
    row('Email', booking.email) +
    row('Phone', booking.phone) +
    row('Company', booking.companyName || booking.company) +
    row('Service', booking.service) +
    row('Slot (IST)', ownerSlot) +
    row('Status', booking.status) +
    row('Notes', booking.notes || booking.message) +
    meetingActionsRow(booking.meetingId),
    `<strong>${esc(assigner)}</strong> has assigned you a meeting with <strong>${esc(visitorName)}</strong>. Please review and take action using the buttons below.`
  );

  const ownerHtml = shell(
    'Meeting Assigned',
    row('Assigned To', `${assignee.name} (${assignee.email})`) +
    row('User Name', visitorName) +
    row('Email', booking.email) +
    row('Slot (IST)', ownerSlot),
    `You have assigned <strong>${esc(visitorName)}</strong>'s meeting to <strong>${esc(assignee.name)}</strong>.`
  );

  const [toAssignee, toOwner] = await Promise.allSettled([
    sendMail({
      to: assignee.email,
      replyTo: booking.email,
      subject: `${assigner} has assigned you a meeting — ${visitorName}${ownerSlot ? ` (${ownerSlot})` : ''}`,
      html: assigneeHtml,
      text:
        `${assigner} has assigned you a meeting.\nUser: ${visitorName} (${booking.email})\nSlot (IST): ${ownerSlot || 'n/a'}` +
        (booking.meetingId
          ? `\n\nConfirm: ${meetingActionUrl(booking.meetingId, 'confirm')}\nReject: ${meetingActionUrl(booking.meetingId, 'reject')}\nReschedule: ${meetingActionUrl(booking.meetingId, 'reschedule')}\nAssign: ${meetingActionUrl(booking.meetingId, 'assign')}`
          : ''),
    }),
    // No receipt when the owner assigned the meeting to their own address.
    isOwnerAddress(assignee.email)
      ? Promise.resolve({ sent: false, skipped: true, reason: 'assignee is the owner address' })
      : sendMail({
        to: ownerEmail(),
        subject: `You have assigned ${visitorName}'s meeting to ${assignee.name}`,
        html: ownerHtml,
        text: `You have assigned ${visitorName}'s meeting to ${assignee.name} (${assignee.email}). Slot (IST): ${ownerSlot || 'n/a'}`,
      }),
  ]);

  const unwrap = (r) => (r.status === 'fulfilled' ? r.value : { sent: false, error: r.reason?.message });
  const result = { assignee: unwrap(toAssignee), owner: unwrap(toOwner) };
  logger.info(`Meeting assigned emails: assignee=${JSON.stringify(result.assignee.sent ?? result.assignee.skipped)} owner=${JSON.stringify(result.owner.sent ?? result.owner.skipped)}`);
  return result;
};

/**
 * ~1-hour-before reminder — fired once per confirmed meeting by the poller in
 * ./reminderService. Visitor sees their own zone, owner (+ assignee) see IST.
 */
const sendMeetingReminderEmails = async (booking = {}) => {
  const visitorName = booking.name || booking.userName || 'there';
  const meetLink = booking.meetLink || '';
  const userSlotDisplay = formatInTimeZone(booking.meeting_start_utc, booking.meeting_timezone);
  const userSlot = userSlotLine(booking, booking.meeting_start_utc);
  const ownerSlot = ownerSlotLine(booking.meeting_start_utc);

  const userHtml = shell(
    'Your call starts in 1 hour',
    meetRow(meetLink) +
    row('Date', userSlotDisplay?.date) +
    row('Time', userSlotDisplay?.time) +
    row('Time Zone', booking.meeting_timezone) +
    row('Duration', '15 Minutes'),
    `Just a reminder — your call with ${esc(brand())} starts in about an hour. Join using the link below at the scheduled time.`
  );

  const ownerHtml = shell(
    'Meeting Reminder — starts in 1 hour',
    meetRow(meetLink) +
    row('User Name', visitorName) +
    row('Email', booking.email) +
    row('Phone', booking.phone) +
    row('Slot (IST)', ownerSlot),
    `Reminder: your meeting with <strong>${esc(visitorName)}</strong> starts in about an hour.`
  );

  const [owner, user] = await Promise.allSettled([
    sendMail({
      to: ownerRecipients(booking.assigneeEmail),
      replyTo: booking.email,
      fromName: visitorName,
      subject: `Reminder: meeting with ${visitorName} in 1 hour${ownerSlot ? ` — ${ownerSlot}` : ''}`,
      html: ownerHtml,
      text: `Reminder: meeting with ${visitorName} (${booking.email}) starts in about an hour.\nSlot (IST): ${ownerSlot || 'n/a'}\nGoogle Meet: ${meetLink || 'n/a'}`,
    }),
    !booking.email
      ? Promise.resolve({ sent: false, skipped: true })
      : isOwnerAddress(booking.email)
        ? skippedAsOwner()
        : sendMail({
          to: booking.email,
          replyTo: ownerEmail(),
          subject: 'Reminder: your call starts in 1 hour',
          html: userHtml,
          text: `Your call starts in about an hour.\nSlot: ${userSlot || 'n/a'}\nGoogle Meet: ${meetLink || 'n/a'}`,
        }),
  ]);

  const unwrap = (r) => (r.status === 'fulfilled' ? r.value : { sent: false, error: r.reason?.message });
  const result = { owner: unwrap(owner), user: unwrap(user) };
  logger.info(`Meeting reminder emails: owner=${JSON.stringify(result.owner.sent ?? result.owner.skipped)} user=${JSON.stringify(result.user.sent ?? result.user.skipped)}`);
  return result;
};

// Like `row`, but keeps the visitor's paragraph breaks — a Contact Us message
// is free-text and collapses into one blob without this.
const multilineRow = (label, value) =>
  value
    ? `<tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap;vertical-align:top">${esc(label)}</td>` +
    `<td style="padding:4px 0;color:#111">${esc(value).replace(/\r?\n/g, '<br>')}</td></tr>`
    : '';

/**
 * Notify the owner of a new Contact Us submission.
 *
 * Best-effort by design: `sendMail` never throws and never rejects, so the
 * visitor's form submit can't fail because SMTP is down or misconfigured. The
 * lead is already persisted by the time this runs — email is a notification,
 * not part of the write path.
 *
 * @param {object} lead { name, email, phone, subject, message, createdAt }
 * @returns {Promise<{sent:boolean, skipped?:boolean, error?:string}>}
 */
const sendContactEnquiryEmail = async (lead = {}) => {
  // Both of these land in the Subject header, which is CRLF-delimited — collapse
  // any newlines the visitor typed so they can't inject extra headers.
  const headerSafe = (v, max = 120) =>
    String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').trim().slice(0, max);

  const visitorName = headerSafe(lead.name) || 'Website visitor';
  const subjectLabel = headerSafe(lead.subject);
  const receivedIst = formatInTimeZone(lead.createdAt || new Date(), IST_TIMEZONE);

  const html = shell(
    'New contact enquiry',
    row('Name', lead.name) +
    row('Email', lead.email) +
    row('Phone', lead.phone) +
    row('Subject', lead.subject) +
    multilineRow('Message', lead.message) +
    row('Received (IST)', receivedIst ? `${receivedIst.date} · ${receivedIst.time}` : ''),
    `New message from the Contact Us form on ${esc(brand())}.` +
    (lead.email ? ' Reply to this email to respond to them directly.' : '')
  );

  const text =
    `New contact enquiry\n\n` +
    `Name: ${lead.name || 'n/a'}\n` +
    `Email: ${lead.email || 'n/a'}\n` +
    `Phone: ${lead.phone || 'n/a'}\n` +
    `Subject: ${lead.subject || 'n/a'}\n` +
    `Received (IST): ${receivedIst ? `${receivedIst.date} ${receivedIst.time}` : 'n/a'}\n\n` +
    `Message:\n${lead.message || 'n/a'}\n`;

  return sendMail({
    to: ownerEmail(),
    // Reply goes straight to the visitor rather than the SMTP mailbox.
    replyTo: lead.email || undefined,
    fromName: visitorName,
    subject: `New enquiry: ${visitorName}${subjectLabel ? ` — ${subjectLabel}` : ''}`,
    html,
    text,
  });
};

module.exports = {
  sendBookingEmails,
  sendContactEnquiryEmail,
  sendMeetingRequestEmails,
  sendMeetingConfirmedEmails,
  sendMeetingRejectedEmail,
  sendMeetingRescheduledEmails,
  sendMeetingAssignedEmails,
  sendMeetingReminderEmails,
  ownerEmail,
};
