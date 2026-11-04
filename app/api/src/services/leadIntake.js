'use strict';

/**
 * Lead intake — the ONE place a website enquiry (and, from the WhatsApp
 * gateway, a WhatsApp enquiry) is written, announced and mirrored.
 *
 * Extracted verbatim from the `contact` handler in
 * controllers/api/contactController.js so the gateway can reuse the exact
 * sequence instead of copying it. The handler keeps its request parsing,
 * its 400 check and its response shape; only the three calls below moved.
 *
 * Sequence (unchanged):
 *   1. ContactUs.create
 *   2. owner notification email — fire-and-forget, never fails the request
 *   3. CRM mirror via the in-process ingest — fire-and-forget, never throws
 *
 * Website callers pass exactly what they always did; the two optional
 * fields (`source_page`, `channel`) default so that an unchanged caller
 * produces an unchanged record, email and CRM lead.
 */

const ContactUs = require('../models/ContactUs');
const { sendContactEnquiryEmail } = require('./bookingMailer');
const { ingestSafe: crmIngest } = require('../crm/services/leadIngest');
const logger = require('../utils/logger');

/**
 * @param {object} input
 * @param {string} input.name
 * @param {string} input.email
 * @param {string} [input.phone]
 * @param {string} [input.subject]
 * @param {string} input.message
 * @param {string} [input.source_page]  stored on the record only when given
 *   (ContactUs is strict:false); absent for website submissions, as before
 * @param {string} [input.channel='contact_form']  CRM source channel
 * @param {object} [input.raw]  extra CRM `source.raw` keys, merged after `subject`
 * @returns {Promise<import('mongoose').Document>} the saved ContactUs document
 */
const createContactEnquiry = async ({ name, email, phone, subject, message, source_page, channel, raw }) => {
  const doc = await ContactUs.create({
    name, email, phone, subject, message,
    ...(source_page ? { source_page } : {}),
  });

  // Notify the owner. Deliberately not awaited: the lead is already saved, so a
  // slow or failing SMTP must not delay or fail the submit. sendMail logs its
  // own success/failure and never throws; the catch here is only for an
  // unexpected error while building the message.
  sendContactEnquiryEmail({
    name, email, phone, subject, message, createdAt: doc.createdAt,
  }).catch((err) => {
    logger.error(`Contact enquiry email failed for ${email}: ${err.message}`);
  });

  // Mirror the enquiry into the CRM as a lead. Fire-and-forget and internally
  // guarded — the submit must never fail because the CRM is busy.
  crmIngest({
    channel: channel || 'contact_form', externalCollection: 'contact_us', externalId: doc._id,
    name, email, phone, message,
    serviceInterest: subject,
    ...(source_page ? { sourcePage: source_page } : {}),
    raw: { subject, ...(raw || {}) },
  });

  return doc;
};

module.exports = { createContactEnquiry };
