'use strict';

/**
 * Unified messaging service — email / WhatsApp / SMS.
 *
 * Free-by-default design:
 *  - email    → existing nodemailer SMTP (services/mailer.js)
 *  - whatsapp → WhatsApp Cloud API when WA_ACCESS_TOKEN + WA_PHONE_NUMBER_ID
 *               are set; otherwise FREE "link mode": the message is stored with
 *               status 'manual' and a wa.me link the agent opens to send.
 *  - sms      → Twilio (TWILIO_*) or MSG91 (MSG91_*) when configured;
 *               otherwise the send fails gracefully with a clear reason.
 *
 * Every send is queued through the Mongo scheduler (services/jobs.js) so
 * retries / scheduled sends / quiet hours work without Redis.
 */

const { CrmMessage, CrmMessageTemplate, CrmLead, CrmContact, CrmUser } = require('../models');
const mailer = require('../../services/mailer');
const logger = require('../../utils/logger');
const jobs = require('./jobs');
const timeline = require('./timeline');
const settings = require('./settings');
const realtime = require('../realtime');

/* ── helpers ────────────────────────────────────────────────────────────── */

/**
 * Reduce a phone number to bare international digits (no `+`).
 *
 * Callers prefix `+` or `whatsapp:+` themselves. Leading trunk/IDD prefixes have
 * to go first: "09770601469" and "0091 9770601469" are both how Indian numbers
 * get typed and pasted, and left alone they produce `whatsapp:+09770601469`,
 * which Twilio rejects with 21211.
 */
const normalizePhone = (phone, countryCode = '91') => {
  if (!phone) return null;
  const raw = String(phone).trim();
  const hadPlus = raw.startsWith('+');
  let digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;
  if (!hadPlus) {
    // IDD prefix ("00" + country code) — strip it and keep the country code.
    if (digits.startsWith('00')) digits = digits.slice(2);
    // National trunk prefix on an 11-digit domestic number.
    else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  }
  if (digits.length === 10) digits = String(countryCode) + digits;
  // Anything outside E.164's 8–15 digit range cannot be dialled or messaged.
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
};

const get = (obj, path) =>
  String(path).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

const renderTemplate = (str, ctx) =>
  String(str || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, p) => {
    const v = get(ctx, p);
    return v === undefined || v === null ? '' : String(v);
  });

/** Build the placeholder context for a lead/contact. */
const buildVars = async ({ lead, contact }) => {
  const person = lead || contact || {};
  const name = lead ? lead.name : [contact && contact.firstName, contact && contact.lastName].filter(Boolean).join(' ');
  let agent = null;
  if (person.ownerId) agent = await CrmUser.findById(person.ownerId).select('name email phone').lean();
  return {
    name: name || '',
    first_name: (name || '').split(' ')[0] || '',
    email: person.email || '',
    phone: person.phone || '',
    company: (lead && lead.company) || '',
    service: (lead && lead.serviceInterest) || '',
    budget: (lead && lead.budget) || '',
    agent_name: (agent && agent.name) || 'Cocoma Digital',
    agent_email: (agent && agent.email) || '',
    brand: process.env.MAIL_BRAND || 'Cocoma Digital',
  };
};

const { crmUrl } = require('../publicUrl');

const apiPublicUrl = () =>
  (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/+$/, '');

/* ── provider availability ──────────────────────────────────────────────── */

const waCloudConfigured = () => Boolean(process.env.WA_ACCESS_TOKEN && process.env.WA_PHONE_NUMBER_ID);
const twilioConfigured = () => Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_SMS_FROM);
const twilioWhatsappConfigured = () => Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);
const msg91Configured = () => Boolean(process.env.MSG91_AUTH_KEY && process.env.MSG91_SENDER_ID);

/* ── WhatsApp 24-hour customer-service window ───────────────────────────────
 * Meta only allows free-form WhatsApp text within 24 hours of the customer's
 * last inbound message. Outside it, the *only* thing that delivers is a
 * pre-approved template, and a free-form send fails with Twilio error 63016.
 *
 * The CRM used to discover this after the fact: the message was queued, sent to
 * Twilio, rejected, and marked failed with a cryptic provider string. Checking
 * up front lets the agent be told what to do while they are still looking at
 * the composer.
 */

const WA_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * When did this number last message us on WhatsApp?
 * Returns null if never — which is the normal state for a brand-new lead, and
 * means only a template can reach them.
 */
const lastInboundWhatsappAt = async (normalizedPhone) => {
  if (!normalizedPhone) return null;
  // recordInbound stores fromAddress normalised, but older rows and other
  // ingest paths may carry formatting, so match on the subscriber tail.
  const tail = String(normalizedPhone).slice(-10);
  const last = await CrmMessage.findOne({
    channel: 'whatsapp',
    direction: 'inbound',
    fromAddress: new RegExp(`${tail}$`),
  }).sort({ createdAt: -1 }).select('createdAt').lean();
  return last ? last.createdAt : null;
};

const isWaWindowOpen = async (normalizedPhone) => {
  const at = await lastInboundWhatsappAt(normalizedPhone);
  return Boolean(at && Date.now() - new Date(at).getTime() < WA_WINDOW_MS);
};

/**
 * Ask Twilio when this number last messaged us.
 *
 * Our own CrmMessage history is only a *mirror* of what the inbound webhook
 * delivered, and it is wrong whenever that webhook is misconfigured, was added
 * late, or dropped a delivery. Treating the mirror as authoritative produced
 * the worst possible failure: the customer had just replied, the window was
 * open, and the CRM refused the agent's message (or swapped in a template)
 * because it had no record of a reply Twilio had already received.
 *
 * Twilio knows the truth, so ask it — but only when the local mirror says
 * "closed", which is the only case where we might be wrong in the direction
 * that hurts. Returns null when the answer cannot be obtained, so callers can
 * tell "no reply" apart from "could not check".
 */
const twilioLastInboundAt = async (normalizedPhone) => {
  if (!normalizedPhone || !twilioWhatsappConfigured()) return null;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const from = encodeURIComponent(`whatsapp:+${normalizedPhone}`);
  try {
    const ctl = new AbortController();
    // An agent is waiting on this. A slow answer is worse than no answer:
    // falling through to "closed" only costs a clear error from Twilio.
    const timer = setTimeout(() => ctl.abort(), 4000);
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json?From=${from}&PageSize=1`,
      { headers: { Authorization: `Basic ${auth}` }, signal: ctl.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    const last = (data.messages || [])[0];
    return last && last.date_created ? new Date(last.date_created) : null;
  } catch (err) {
    logger.warn(`Could not check the WhatsApp window with Twilio: ${err.message}`);
    return null;
  }
};

/**
 * Is free-form WhatsApp allowed to this number right now?
 * Local history first (free, instant); Twilio only as a tie-breaker.
 */
const isWaWindowOpenAuthoritative = async (normalizedPhone) => {
  if (await isWaWindowOpen(normalizedPhone)) return { open: true, source: 'crm' };
  const at = await twilioLastInboundAt(normalizedPhone);
  if (at && Date.now() - at.getTime() < WA_WINDOW_MS) {
    logger.warn(
      `WhatsApp window for ${normalizedPhone} is open according to Twilio but the CRM has no record `
      + 'of that reply — the inbound webhook is probably not configured. Sending anyway. '
      + 'Fix: Twilio Console → Messaging → Try it out → Send a WhatsApp message → Sandbox settings.'
    );
    return { open: true, source: 'twilio' };
  }
  return { open: false, source: at ? 'twilio' : 'crm', lastInboundAt: at };
};

/**
 * The account-wide fallback Content template.
 *
 * Documented in .env.example as the fallback for messaging outside the window.
 * It is deliberately only consulted when neither the caller nor the template
 * supplies one — an admin setting this env var is explicitly opting in, but it
 * still swaps the agent's wording for approved template copy, so every use is
 * logged and recorded in the message's status history rather than being silent.
 */
const fallbackContentSid = () => process.env.TWILIO_WHATSAPP_CONTENT_SID || null;

/** The shared Twilio WhatsApp sandbox sender. */
const SANDBOX_NUMBER = '14155238886';
const isSandboxSender = () => String(process.env.TWILIO_WHATSAPP_FROM || '').includes(SANDBOX_NUMBER);

/**
 * Twilio's quick-start Content templates — the ones the console offers under
 * Messaging → Try it out → Send a WhatsApp message.
 *
 * They belong to Twilio, not to your account: `GET /v1/Content/<sid>` returns
 * 20404 and they never appear in your own Content list, yet the sandbox sender
 * is allowed to send them. That combination reads exactly like a broken SID,
 * which is why they are named here — so the checker and the boot warnings can
 * tell "borrowed sandbox template" apart from "SID that will never work".
 *
 * A production WhatsApp sender cannot use them (63024). Each still needs its
 * variables supplied, or Twilio rejects the send with 63021.
 */
const SANDBOX_QUICKSTART_SIDS = {
  HXb5b62575e6e4ff6129ad7c8efe1f983e: {
    name: 'Appointment Reminders',
    body: 'Your appointment is coming up on {{1}} at {{2}}. If you need to change it, please reply back and let us know.',
    variables: { 1: 'date', 2: 'time' },
  },
};

/**
 * Values for the fallback Content template's positional placeholders, as JSON:
 *
 *   TWILIO_WHATSAPP_CONTENT_VARS={"1":"{{name}}","2":"3pm"}
 *
 * Each value is rendered through the same `{{placeholder}}` substitution as a
 * message body, so it can carry lead data rather than a fixed string.
 *
 * This is not optional for a template that declares placeholders: Twilio
 * rejects a Content send whose variables do not match the approved template
 * with 63021, and the fallback path has no other source for them — the CRM
 * template's *named* variables belong to a different template entirely.
 */
const fallbackContentVariables = (vars = {}) => {
  const raw = String(process.env.TWILIO_WHATSAPP_CONTENT_VARS || '').trim();
  if (!raw) return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    logger.error(`TWILIO_WHATSAPP_CONTENT_VARS is not valid JSON, ignoring it: ${err.message}`);
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    logger.error('TWILIO_WHATSAPP_CONTENT_VARS must be a JSON object keyed by position, e.g. {"1":"12/1","2":"3pm"}');
    return null;
  }
  const out = {};
  for (const [k, v] of Object.entries(parsed)) {
    out[String(k)] = renderTemplate(String(v === undefined || v === null ? '' : v), vars);
  }
  return Object.keys(out).length ? out : null;
};

/**
 * POST one message to Twilio's REST API. Shared by SMS and WhatsApp — they hit
 * the same endpoint and differ only in the To/From channel prefix.
 *
 * Pass either `body` (free-form text) or `contentSid` + `contentVariables`
 * (an approved Content template, required for WhatsApp outside the 24h window).
 */
const twilioSend = async ({ to, from, body, contentSid, contentVariables, mediaUrls }) => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const params = new URLSearchParams({ To: to, From: from });
  if (contentSid) {
    params.set('ContentSid', contentSid);
    if (contentVariables && Object.keys(contentVariables).length) {
      params.set('ContentVariables', JSON.stringify(contentVariables));
    }
  } else {
    params.set('Body', body);
  }
  for (const u of mediaUrls || []) params.append('MediaUrl', u);
  // Delivery receipts land on the shared Twilio status webhook; without a public
  // URL the message still sends, it just never advances past 'sent'.
  if (process.env.API_PUBLIC_URL) {
    params.set('StatusCallback', crmUrl('/webhooks/twilio/sms-status'));
  }

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Twilio's numeric codes are far more actionable than its prose.
    const hint = {
      63003: 'Twilio could not find the recipient channel — check the To number and that it is on WhatsApp.',
      63007: 'The From address is not a valid WhatsApp sender for this account — check TWILIO_WHATSAPP_FROM.',
      63015: 'Recipient has not joined the WhatsApp sandbox — send "join <code>" to +14155238886 first. Sandbox participants also expire after 72h of inactivity and must re-join.',
      63016: 'Outside the 24-hour window — only an approved Content template delivers. Set the template\'s twilioContentSid, or TWILIO_WHATSAPP_CONTENT_SID.',
      63018: 'WhatsApp rate limit reached.',
      63021: 'The Content template variables do not match the approved template.',
      63024: 'The Content template is not approved for this WhatsApp sender.',
      21211: 'Invalid destination number (must be E.164, e.g. +919770601469).',
      21910: 'From and To are on different channels — a whatsapp: sender can only message a whatsapp: recipient.',
      20404: 'The Content SID does not exist on this Twilio account. Create a template in Messaging → Content Template Builder and use its HX… SID.',
    }[data.code];
    throw new Error(hint ? `${data.message} — ${hint}` : (data.message || `Twilio error ${res.status}`));
  }
  return data;
};

/* ── public API: queue a message ────────────────────────────────────────── */

/**
 * Create + queue an outbound message.
 * @param {{channel:'email'|'whatsapp'|'sms', leadId?, contactId?, dealId?,
 *          templateId?, subject?, body?, variables?:object, mediaUrls?:string[],
 *          scheduledFor?:Date, sentBy?, automationRunId?}} opts
 */
const sendMessage = async (opts) => {
  const { channel } = opts;
  if (!['email', 'whatsapp', 'sms'].includes(channel)) throw new Error('Invalid channel');

  const lead = opts.leadId ? await CrmLead.findById(opts.leadId).lean() : null;
  const contact = opts.contactId ? await CrmContact.findById(opts.contactId).lean() : null;
  const person = lead || contact;
  if (!person) throw new Error('leadId or contactId is required');

  const s = await settings.getSettings();
  const toAddress = channel === 'email'
    ? person.email
    : normalizePhone(person.phone, s.defaultCountryCode);
  if (!toAddress) throw new Error(channel === 'email' ? 'No email address on record' : 'No phone number on record');

  let template = null;
  if (opts.templateId) {
    template = await CrmMessageTemplate.findById(opts.templateId).lean();
    if (!template) throw new Error('Template not found');
    if (template.channel !== channel) throw new Error(`Template is for ${template.channel}, not ${channel}`);
  }

  const vars = { ...(await buildVars({ lead, contact })), ...(opts.variables || {}) };
  const body = renderTemplate(opts.body || (template && template.body) || '', vars);
  const subject = channel === 'email'
    ? renderTemplate(opts.subject || (template && template.subject) || '', vars)
    : undefined;

  // Twilio Content template (WhatsApp only). When set, Twilio renders the
  // approved template from contentVariables and `body` is just a local preview.
  // Never substituted automatically — sending outside the 24h window without one
  // must fail loudly rather than silently deliver unrelated approved content.
  let contentSid = channel === 'whatsapp'
    ? (opts.contentSid || (template && template.twilioContentSid) || null)
    : null;
  let usedFallbackTemplate = false;

  // Outside the 24-hour window nothing but an approved template will deliver.
  // Decide that here, while we can still refuse with a useful message, instead
  // of letting Twilio reject it later with error 63016.
  if (channel === 'whatsapp' && !contentSid && twilioWhatsappConfigured() && !waCloudConfigured()) {
    const { open: windowOpen } = await isWaWindowOpenAuthoritative(toAddress);
    if (!windowOpen) {
      contentSid = fallbackContentSid();
      if (contentSid) {
        usedFallbackTemplate = true;
        logger.warn(
          `WhatsApp to ${toAddress} is outside the 24-hour window — falling back to the `
          + `account template ${contentSid}. The agent's wording is kept only as a local preview.`
        );
      } else {
        const at = await lastInboundWhatsappAt(toAddress);
        // Deliberately does NOT suggest TWILIO_WHATSAPP_CONTENT_SID. Setting it
        // makes this send succeed by replacing what the agent wrote with fixed
        // approved copy — which reads like a fix and is not one.
        throw new Error(
          'Outside the 24-hour WhatsApp window'
          + (at ? ` (they last replied ${new Date(at).toISOString().slice(0, 16).replace('T', ' ')} UTC)` : ' (they have never messaged you)')
          + '. WhatsApp only delivers free-form text within 24 hours of the customer\'s last message — '
          + 'this is a Meta rule, not a CRM setting. To reach them now, send a CRM template that has an '
          + 'approved Twilio Content SID (Templates → Twilio Content SID); its wording is fixed and '
          + 'pre-approved. Otherwise reach them another way and reply here once they message you back.'
        );
      }
    }
  }

  if (!body && !contentSid) throw new Error('Message body is empty');

  // Twilio Content templates take positional variables ({{1}}, {{2}}…) while CRM
  // templates use named ones. Map name → position in the order the placeholders
  // first appear in the body, so the CRM body doubles as a readable local preview
  // of the approved template. An explicit contentVariables always wins.
  let contentVariables = null;
  if (contentSid) {
    contentVariables = opts.contentVariables || null;
    // Only map the CRM template's named variables onto positions when the SID
    // belongs to that template. The account-wide fallback is a different
    // template with its own placeholders, so its positions would not line up.
    if (!contentVariables && !usedFallbackTemplate && template && (template.variables || []).length) {
      contentVariables = Object.fromEntries(
        template.variables.map((v, i) => [String(i + 1), String(vars[v] === undefined || vars[v] === null ? '' : vars[v])])
      );
    }
    // The fallback is that different template, so its values come from
    // TWILIO_WHATSAPP_CONTENT_VARS. Sending it bare is not a lesser version of
    // sending it filled in — Twilio rejects the whole message with 63021.
    if (!contentVariables && usedFallbackTemplate) {
      contentVariables = fallbackContentVariables(vars);
      const expected = SANDBOX_QUICKSTART_SIDS[contentSid];
      if (!contentVariables && expected) {
        throw new Error(
          `The fallback template ${contentSid} ("${expected.name}") needs `
          + `${Object.keys(expected.variables).length} variable(s) — `
          + `${Object.entries(expected.variables).map(([k, v]) => `{{${k}}} ${v}`).join(', ')}. `
          + `Set TWILIO_WHATSAPP_CONTENT_VARS, e.g. `
          + `{"1":"12/1","2":"3pm"}. Without them Twilio rejects the send with 63021.`
        );
      }
    }
  }

  const msg = await CrmMessage.create({
    channel,
    direction: 'outbound',
    leadId: lead ? lead._id : undefined,
    contactId: contact ? contact._id : undefined,
    dealId: opts.dealId,
    toAddress,
    templateId: template ? template._id : undefined,
    subject,
    body,
    contentSid,
    contentVariables,
    mediaUrls: opts.mediaUrls || [],
    status: 'queued',
    sentBy: opts.sentBy || null,
    automationRunId: opts.automationRunId || null,
    scheduledFor: opts.scheduledFor || null,
    // Never let a template substitution be invisible: the agent typed one thing
    // and the customer will receive another.
    statusHistory: usedFallbackTemplate
      ? [{ status: 'queued', at: new Date(), raw: { fallbackTemplate: contentSid, reason: 'outside_24h_window' } }]
      : [],
  });

  // Show the agent their own message immediately. Delivery happens on the
  // scheduler a moment later; without this the composer clears and nothing
  // appears until the next poll, which reads as a message that went nowhere.
  realtime.emitMessage(msg);

  await jobs.schedule('message:send', opts.scheduledFor || new Date(), { messageId: msg._id.toString() });
  return msg;
};

/* ── worker: actually deliver one message ───────────────────────────────── */

/**
 * The SID of an approved template that replaced the agent's wording, or null
 * when the message went out as typed. Recorded by sendMessage in the message's
 * own status history, so it survives a restart and a config change.
 */
const substitutedTemplate = (msg) => {
  const entry = (msg.statusHistory || []).find((h) => h.raw && h.raw.fallbackTemplate);
  return entry ? entry.raw.fallbackTemplate : null;
};

const pushStatus = (msg, status, raw) => {
  msg.status = status;
  msg.statusHistory.push({ status, at: new Date(), raw });
};

const deliver = async ({ messageId }) => {
  const msg = await CrmMessage.findById(messageId);
  if (!msg || !['queued'].includes(msg.status)) return;

  const lead = msg.leadId ? await CrmLead.findById(msg.leadId).lean() : null;
  const contact = msg.contactId ? await CrmContact.findById(msg.contactId).lean() : null;

  // Consent enforcement (single choke point). Contacts carry explicit flags.
  if (contact) {
    const blocked =
      contact.dnd ||
      (msg.channel === 'whatsapp' && contact.whatsappOptIn === false) ||
      (msg.channel === 'sms' && contact.smsOptIn === false) ||
      (msg.channel === 'email' && contact.emailOptIn === false);
    if (blocked) {
      pushStatus(msg, 'failed');
      msg.failReason = 'Blocked by consent / DND settings';
      await msg.save();
      realtime.emitStatus(msg);
      return;
    }

    // Stricter WhatsApp gate for production: the default-true opt-in flag is not
    // evidence of anything, so require a recorded opt-in event once enabled.
    if (msg.channel === 'whatsapp' && !contact.whatsappOptInAt) {
      const s = await settings.getSettings();
      if (s.requireExplicitWhatsappOptIn) {
        pushStatus(msg, 'failed');
        msg.failReason = 'No recorded WhatsApp opt-in for this contact';
        await msg.save();
        realtime.emitStatus(msg);
        return;
      }
    }
  }

  // Quiet hours: delay WhatsApp/SMS (email is fine any time). Only applies to
  // automated/system sends — quiet hours exist to stop rules from messaging
  // customers overnight, not to hold a reply an agent just pressed Send on.
  if (msg.channel !== 'email' && !msg.sentBy) {
    const resumeAt = await settings.quietHoursDelay();
    if (resumeAt) {
      await jobs.schedule('message:send', resumeAt, { messageId: msg._id.toString() });
      // Record the deferral on the message itself. Without this the message sits
      // at 'queued' with no explanation anywhere in the UI, which is
      // indistinguishable from a silently broken send.
      if (!msg.scheduledFor || msg.scheduledFor.getTime() !== resumeAt.getTime()) {
        msg.scheduledFor = resumeAt;
        msg.statusHistory.push({
          status: 'queued', at: new Date(), raw: { deferred: 'quiet_hours', resumeAt },
        });
        await msg.save();
        realtime.emitStatus(msg);
      }
      return;
    }
  }

  try {
    if (msg.channel === 'email') await deliverEmail(msg);
    else if (msg.channel === 'whatsapp') await deliverWhatsapp(msg);
    else await deliverSms(msg);
  } catch (err) {
    pushStatus(msg, 'failed');
    msg.failReason = err.message;
    await msg.save();
    realtime.emitStatus(msg);
    logger.error(`CRM message ${msg._id} failed: ${err.message}`);
    // Let automations react (e.g. SMS fallback when WhatsApp fails).
    require('./automation').emitEvent('message.failed', {
      entityKind: msg.leadId ? 'lead' : 'contact',
      entityId: msg.leadId || msg.contactId,
      data: { channel: msg.channel, messageId: msg._id.toString(), reason: err.message },
    }).catch(() => {});
    return;
  }

  // The provider has already accepted the message — the customer's phone will
  // buzz whatever happens next. Nothing below may throw back to the scheduler:
  // a retry would re-send a message they already have. (Previously msg.save()
  // sat outside any try, so a transient write error duplicated the send.)
  try {
    await msg.save();
    realtime.emitStatus(msg);
  } catch (err) {
    logger.error(
      `CRM message ${msg._id} was accepted by the provider but could not be saved: ${err.message}. `
      + 'It is delivered; the CRM copy may show a stale status.'
    );
    return;
  }

  const entity = msg.leadId ? { kind: 'lead', id: msg.leadId } : { kind: 'contact', id: msg.contactId };
  await timeline.record({
    entity,
    also: msg.dealId ? [{ kind: 'deal', id: msg.dealId }] : [],
    type: 'message.sent',
    // When an approved template was substituted, the customer did not receive
    // msg.body — showing it here would present the agent's unused draft as the
    // message that went out, which is how a swap goes unnoticed.
    title: msg.status === 'manual'
      ? `WhatsApp prepared (open link to send): "${msg.body.slice(0, 60)}"`
      : substitutedTemplate(msg)
        ? `WHATSAPP ${msg.status}: approved template ${substitutedTemplate(msg)} sent instead of the typed message`
        : `${msg.channel.toUpperCase()} ${msg.status}: "${(msg.subject || msg.body).slice(0, 60)}"`,
    meta: { messageId: msg._id, channel: msg.channel, status: msg.status },
    actor: msg.sentBy ? { kind: 'user', userId: msg.sentBy } : { kind: 'automation', label: 'Automation' },
  }).catch((err) => logger.error(`Timeline record failed for message ${msg._id}: ${err.message}`));
};

const deliverEmail = async (msg) => {
  if (!mailer.isConfigured()) throw new Error('SMTP not configured');
  let html = msg.body.includes('<') ? msg.body : `<div style="font-family:Arial,sans-serif;white-space:pre-wrap">${msg.body}</div>`;
  const s = await settings.getSettings();
  if (s.emailTracking) {
    // Loaded by the recipient's mail client from the public internet, so it has
    // the same reachability requirement as a provider webhook.
    html += `<img src="${crmUrl(`/t/open/${msg._id}`)}" width="1" height="1" style="display:none" alt=""/>`;
  }
  const result = await mailer.sendMail({ to: msg.toAddress, subject: msg.subject || '(no subject)', html });
  if (!result.sent) throw new Error(result.error || 'SMTP send failed/skipped');
  msg.provider = 'smtp';
  msg.providerMessageId = result.messageId;
  pushStatus(msg, 'sent');
};

const deliverWhatsapp = async (msg) => {
  if (waCloudConfigured()) {
    const res = await fetch(`https://graph.facebook.com/v19.0/${process.env.WA_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WA_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: msg.toAddress,
        type: 'text',
        text: { body: msg.body },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data.error && data.error.message) || `WhatsApp API error ${res.status}`);
    msg.provider = 'whatsapp_cloud';
    msg.providerMessageId = data.messages && data.messages[0] && data.messages[0].id;
    pushStatus(msg, 'sent', data);
  } else if (twilioWhatsappConfigured()) {
    const data = await twilioSend({
      to: `whatsapp:+${msg.toAddress.replace(/^\+/, '')}`,
      from: process.env.TWILIO_WHATSAPP_FROM,
      body: msg.body,
      contentSid: msg.contentSid,
      contentVariables: msg.contentVariables,
      mediaUrls: msg.mediaUrls,
    });
    msg.provider = 'twilio_whatsapp';
    msg.providerMessageId = data.sid;
    pushStatus(msg, 'sent', data);
  } else {
    // FREE link mode — agent opens the link and taps send. No API charges.
    msg.provider = 'wa_link';
    msg.waLink = `https://wa.me/${msg.toAddress}?text=${encodeURIComponent(msg.body)}`;
    pushStatus(msg, 'manual');
  }
};

const deliverSms = async (msg) => {
  if (twilioConfigured()) {
    const data = await twilioSend({
      to: `+${msg.toAddress.replace(/^\+/, '')}`,
      from: process.env.TWILIO_SMS_FROM,
      body: msg.body,
    });
    msg.provider = 'twilio';
    msg.providerMessageId = data.sid;
    pushStatus(msg, 'sent', data);
  } else if (msg91Configured()) {
    const res = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: { authkey: process.env.MSG91_AUTH_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: process.env.MSG91_SENDER_ID,
        mobiles: msg.toAddress,
        // MSG91 flow/DLT template id comes from the template's category field if used.
        message: msg.body,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `MSG91 error ${res.status}`);
    msg.provider = 'msg91';
    pushStatus(msg, 'sent', data);
  } else {
    throw new Error('SMS provider not configured (set TWILIO_* or MSG91_* env vars)');
  }
};

/* ── inbound (webhooks) ─────────────────────────────────────────────────── */

/**
 * Record an inbound WhatsApp/SMS message; auto-creates a lead for unknown senders.
 *
 * @param {object} [opts]
 * @param {string} [opts.providerMessageId] Twilio MessageSid / Meta message id.
 *   Used to make this idempotent: providers re-deliver a webhook whenever they
 *   do not get a fast 2xx, and both of ours ack *before* processing, so a slow
 *   database write is enough to have the same reply recorded twice.
 * @param {string[]} [opts.mediaUrls] Images/documents attached to the reply.
 */
const recordInbound = async (channel, fromPhone, body, raw, opts = {}) => {
  const s = await settings.getSettings();
  const phone = normalizePhone(fromPhone, s.defaultCountryCode);
  if (!phone) return null;

  const { providerMessageId, mediaUrls } = opts;
  if (providerMessageId) {
    const seen = await CrmMessage.findOne({ providerMessageId, direction: 'inbound' }).lean();
    if (seen) {
      logger.info(`Ignoring duplicate inbound ${channel} webhook for ${providerMessageId}`);
      return seen;
    }
  }

  const tail = phone.slice(-10);
  let lead = await CrmLead.findOne({ phone: new RegExp(`${tail}$`), deletedAt: null }).sort({ createdAt: -1 });
  let contact = null;
  if (!lead) contact = await CrmContact.findOne({ phone: new RegExp(`${tail}$`), deletedAt: null });
  if (!lead && !contact) {
    lead = await CrmLead.create({
      name: `WhatsApp ${tail}`,
      phone,
      source: { channel: 'whatsapp_inbound', raw: { firstMessage: body } },
      status: 'new',
    });
    await timeline.record({
      entity: { kind: 'lead', id: lead._id },
      type: 'lead.created',
      title: 'Lead auto-created from inbound WhatsApp',
      actor: { kind: 'system' },
    });
  }

  const msg = await CrmMessage.create({
    channel,
    direction: 'inbound',
    leadId: lead ? lead._id : undefined,
    contactId: contact ? contact._id : undefined,
    toAddress: 'inbox',
    fromAddress: phone,
    body: body || '',
    mediaUrls: mediaUrls || [],
    providerMessageId: providerMessageId || undefined,
    status: 'received',
    statusHistory: [{ status: 'received', at: new Date(), raw }],
  });

  // Push it to every open inbox before the slower bookkeeping below. This is
  // the whole point of the realtime layer: the agent sees the reply appear
  // while the customer is still looking at their phone.
  realtime.emitMessage(msg, {
    name: (lead && lead.name) || (contact && `${contact.firstName || ''} ${contact.lastName || ''}`.trim()) || phone,
  });

  // A customer messaging us first is opt-in under Meta policy, and it also opens
  // the 24-hour window — so record it as consent if we don't already have proof.
  if (contact && channel === 'whatsapp' && !contact.whatsappOptInAt) {
    contact.whatsappOptIn = true;
    contact.whatsappOptInAt = new Date();
    contact.whatsappOptInSource = 'inbound_message';
    await contact.save();
  }

  const entity = lead ? { kind: 'lead', id: lead._id } : { kind: 'contact', id: contact._id };
  await timeline.record({
    entity,
    type: 'message.received',
    title: `${channel.toUpperCase()} reply: "${String(body || '').slice(0, 80)}"`,
    meta: { messageId: msg._id },
    actor: { kind: 'system' },
  });

  const ownerId = (lead && lead.ownerId) || (contact && contact.ownerId);
  if (ownerId) {
    await require('./notify').notify(ownerId, {
      type: 'message.received',
      title: `New ${channel} reply from ${(lead && lead.name) || (contact && contact.firstName) || phone}`,
      body: String(body || '').slice(0, 120),
      entity,
    });
  }

  await require('./automation').emitEvent('message.replied', {
    entityKind: entity.kind,
    entityId: entity.id,
    data: { channel, body: String(body || '').slice(0, 200) },
  });

  return msg;
};

/* ── inbound reconciliation ─────────────────────────────────────────────────
 * A safety net for replies the webhook never delivered.
 *
 * The webhook is the fast path and stays the primary route. But it is a single
 * point of failure that lives outside this codebase — in the Twilio Console —
 * and when it is unset, wrong, or pointing at a tunnel that has since died,
 * every customer reply is lost silently. Twilio answers them with its own
 * canned "Configure your WhatsApp Sandbox's Inbound URL" message and the CRM
 * never learns the conversation happened.
 *
 * Twilio keeps those messages regardless, so we can go and fetch them. This
 * mirrors calls:reconcile, which exists for the same reason on the voice side.
 *
 * recordInbound() is idempotent on providerMessageId, so anything the webhook
 * already delivered is skipped — the two paths cannot double up.
 */

/** How far back to look. Comfortably beyond one poll interval, to absorb outages. */
const RECONCILE_WINDOW_MS = 6 * 60 * 60 * 1000;

const reconcileInboundWhatsapp = async () => {
  if (!twilioWhatsappConfigured()) return { checked: 0, imported: 0 };
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  // Inbound messages are the ones addressed *to* our WhatsApp sender.
  const to = encodeURIComponent(process.env.TWILIO_WHATSAPP_FROM);
  const since = new Date(Date.now() - RECONCILE_WINDOW_MS).toISOString().slice(0, 10);

  let imported = 0; let checked = 0;
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`
      + `?To=${to}&PageSize=50&DateSent%3E=${since}`,
      { headers: { Authorization: `Basic ${auth}` } }
    );
    if (!res.ok) {
      logger.warn(`Inbound reconcile: Twilio returned ${res.status}`);
      return { checked, imported };
    }
    const data = await res.json().catch(() => ({}));
    // Oldest first, so a burst of replies is recorded in the order they were
    // actually sent rather than reversed.
    const inbound = (data.messages || [])
      .filter((m) => m.direction === 'inbound')
      .reverse();

    for (const m of inbound) {
      checked++;
      // eslint-disable-next-line no-await-in-loop
      const seen = await CrmMessage.findOne({ providerMessageId: m.sid }).select('_id').lean();
      if (seen) continue;
      // eslint-disable-next-line no-await-in-loop
      const saved = await recordInbound('whatsapp', m.from, m.body || '', m, {
        providerMessageId: m.sid,
        mediaUrls: [],
      });
      if (saved) {
        imported++;
        logger.warn(
          `Inbound reconcile: imported WhatsApp reply ${m.sid} from ${m.from} that the webhook never delivered. `
          + 'Configure the sandbox inbound URL for instant delivery.'
        );
      }
    }
  } catch (err) {
    logger.error(`Inbound reconcile failed: ${err.message}`);
  }
  return { checked, imported };
};

/* ── startup sanity check ───────────────────────────────────────────────── */

// Without a public URL Twilio has nowhere to post delivery receipts or replies,
// so messages stall at 'sent' and the inbox stays empty. Both symptoms look like
// a broken integration rather than a missing env var, so say so at boot.
if (twilioWhatsappConfigured() && !process.env.API_PUBLIC_URL) {
  logger.warn(
    'Twilio WhatsApp is configured but API_PUBLIC_URL is empty — delivery statuses ' +
    'and inbound replies will not be received. Set it to the public HTTPS URL of this API.'
  );
}
if (String(process.env.TWILIO_WHATSAPP_FROM || '').includes('14155238886')) {
  logger.warn(
    'TWILIO_WHATSAPP_FROM is the shared Twilio sandbox number — recipients must send ' +
    '"join <code>" first and sessions expire after 72h. Not usable in production.'
  );
}
// A Twilio quick-start template. Borrowed, not owned — fine from the sandbox,
// but a production sender is not approved to send it (63024).
const quickstart = SANDBOX_QUICKSTART_SIDS[process.env.TWILIO_WHATSAPP_CONTENT_SID];
if (quickstart && isSandboxSender()) {
  logger.warn(
    `TWILIO_WHATSAPP_CONTENT_SID is Twilio's shared "${quickstart.name}" quick-start template. ` +
    'It works from the sandbox sender, but it is not yours: it will not appear in your Content ' +
    'list and stops working the moment you move to your own WhatsApp sender. Fine for testing.'
  );
} else if (quickstart) {
  logger.warn(
    `TWILIO_WHATSAPP_CONTENT_SID is Twilio's shared "${quickstart.name}" quick-start template, but ` +
    `TWILIO_WHATSAPP_FROM is not the sandbox — a production sender is not approved to send it ` +
    '(63024). Build your own in Messaging → Content Template Builder. Check: node scripts/check-whatsapp.js'
  );
}
// A quick-start template still has required placeholders, and Twilio rejects the
// whole message when they are missing — the fallback failing is worst exactly
// when it is needed, so say so at boot rather than at send time.
if (quickstart && !process.env.TWILIO_WHATSAPP_CONTENT_VARS) {
  logger.warn(
    `No TWILIO_WHATSAPP_CONTENT_VARS set, but "${quickstart.name}" needs ` +
    `${Object.entries(quickstart.variables).map(([k, v]) => `{{${k}}} ${v}`).join(', ')}. ` +
    'Sends outside the 24-hour window will fail with 63021 until you set it, e.g. ' +
    'TWILIO_WHATSAPP_CONTENT_VARS={"1":"12/1","2":"3pm"}'
  );
}
if (twilioWhatsappConfigured() && !process.env.TWILIO_WHATSAPP_CONTENT_SID) {
  logger.warn(
    'No TWILIO_WHATSAPP_CONTENT_SID set — WhatsApp will only reach customers who messaged ' +
    'you in the last 24 hours. Everyone else needs an approved Content template.'
  );
}

module.exports = {
  sendMessage, deliver, recordInbound, renderTemplate, buildVars, normalizePhone,
  waCloudConfigured, twilioConfigured, twilioWhatsappConfigured, msg91Configured,
  lastInboundWhatsappAt, isWaWindowOpen, isWaWindowOpenAuthoritative, twilioLastInboundAt,
  reconcileInboundWhatsapp, fallbackContentSid, WA_WINDOW_MS,
  fallbackContentVariables, isSandboxSender, SANDBOX_NUMBER, SANDBOX_QUICKSTART_SIDS,
};
