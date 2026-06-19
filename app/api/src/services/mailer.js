'use strict';

/**
 * Thin nodemailer wrapper.
 *
 * Configuration comes entirely from environment variables so no credentials
 * live in the repo. If SMTP isn't configured the service degrades gracefully:
 * `sendMail` logs a warning and resolves `{ skipped: true }` instead of
 * throwing — callers (e.g. the booking flow) must never fail because email is
 * unavailable.
 *
 * Required .env keys to enable sending:
 *   SMTP_HOST       e.g. smtp.gmail.com
 *   SMTP_PORT       587 (STARTTLS) or 465 (SSL)
 *   SMTP_USER       the mailbox / SMTP username
 *   SMTP_PASS       the SMTP password or app-password
 * Optional:
 *   SMTP_SECURE     'true' for port 465, else STARTTLS is used
 *   MAIL_FROM       From header, e.g. "Cocoma Digital <no-reply@cocomadigital.com>"
 *                   (defaults to SMTP_USER)
 */

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter = null;
let initialised = false;

const isConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

// Build (once) and reuse a single pooled transporter.
const getTransporter = () => {
  if (initialised) return transporter;
  initialised = true;
  if (!isConfigured()) {
    logger.warn('Mailer: SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS) — emails are disabled.');
    transporter = null;
    return null;
  }
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    pool: true,
  });
  return transporter;
};

const mailFrom = () => process.env.MAIL_FROM || process.env.SMTP_USER;

/**
 * Send one email. Never throws — returns { sent, skipped?, error? } so callers
 * can fire-and-(optionally)-check without wrapping in try/catch.
 * @param {{to:string|string[], subject:string, html?:string, text?:string,
 *          replyTo?:string, cc?:string|string[], attachments?:Array}} opts
 */
const sendMail = async (opts) => {
  const tx = getTransporter();
  if (!tx) return { sent: false, skipped: true };
  if (!opts || !opts.to || !opts.subject) {
    logger.error('Mailer.sendMail: missing required "to"/"subject".');
    return { sent: false, error: 'missing to/subject' };
  }
  try {
    const info = await tx.sendMail({
      from: mailFrom(),
      to: opts.to,
      cc: opts.cc,
      replyTo: opts.replyTo,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      attachments: opts.attachments,
    });
    logger.info(`Mailer: sent "${opts.subject}" to ${[].concat(opts.to).join(', ')} (${info.messageId})`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    logger.error(`Mailer: failed to send "${opts.subject}" to ${[].concat(opts.to).join(', ')}: ${err.message}`);
    return { sent: false, error: err.message };
  }
};

// Verify the SMTP connection (used at boot for a friendly log line).
const verify = async () => {
  const tx = getTransporter();
  if (!tx) return false;
  try {
    await tx.verify();
    logger.info('Mailer: SMTP connection verified.');
    return true;
  } catch (err) {
    logger.error(`Mailer: SMTP verify failed: ${err.message}`);
    return false;
  }
};

module.exports = { sendMail, verify, isConfigured, mailFrom };
