'use strict';

/**
 * Handlers for the WhatsApp agent gateway (routes/api/waAgent.js).
 *
 * By the time a handler runs, req.body is the CLEANED copy produced by
 * validation/waAgent.js — every field present is a bounded, tag-free string.
 * Handlers map that onto the shared intake services the website uses, and
 * answer in the gateway's own shape: never a Mongoose document, never an
 * `_id`, never a stack trace.
 */

const crypto = require('crypto');
const { createContactEnquiry } = require('../../services/leadIntake');

/** Where these records come from — stored on the record and sent to the CRM. */
const SOURCE_PAGE = 'whatsapp';
const CRM_CHANNEL_ENQUIRY = 'whatsapp_inbound';

/**
 * Short opaque reference the agent can quote back to the person. 8 characters
 * from an alphabet without look-alikes (no 0/O, 1/I/L), ~40 bits of entropy.
 * Not a database id and not derivable from one.
 */
const REF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newRef = () => {
  const bytes = crypto.randomBytes(8);
  let out = '';
  for (const b of bytes) out += REF_ALPHABET[b % REF_ALPHABET.length];
  return out;
};

/**
 * POST /api/wa-agent/enquiry
 *
 * The WhatsApp twin of the website's Contact Us form: same collection, same
 * owner email, same CRM mirror — with the sender's number as the phone, the
 * service as the subject, and a `[via WhatsApp · ref …]` prefix on the
 * message, the way the website prefixes `[Type: …]`, so the origin and the
 * reference are visible in the admin panel's message column and in the email.
 */
const enquiry = async (req, res) => {
  const { wa_from, name, email, service, message } = req.body;
  const ref = newRef();

  await createContactEnquiry({
    name,
    email,
    phone: wa_from,
    subject: service,
    message: `[via WhatsApp · ref ${ref}]\n\n${message}`,
    source_page: SOURCE_PAGE,
    channel: CRM_CHANNEL_ENQUIRY,
    raw: { via: 'whatsapp', wa_ref: ref },
  });

  res.status(201).json({ ok: true, ref });
};

module.exports = { enquiry, newRef, SOURCE_PAGE, CRM_CHANNEL_ENQUIRY };
