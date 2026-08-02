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

/* ── helpers ────────────────────────────────────────────────────────────── */

const normalizePhone = (phone, countryCode = '91') => {
  if (!phone) return null;
  let digits = String(phone).replace(/[^\d]/g, '');
  if (digits.length === 10) digits = countryCode + digits;
  return digits || null;
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

const apiPublicUrl = () =>
  (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/+$/, '');

/* ── provider availability ──────────────────────────────────────────────── */

const waCloudConfigured = () => Boolean(process.env.WA_ACCESS_TOKEN && process.env.WA_PHONE_NUMBER_ID);
const twilioConfigured = () => Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_SMS_FROM);
const twilioWhatsappConfigured = () => Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);
const msg91Configured = () => Boolean(process.env.MSG91_AUTH_KEY && process.env.MSG91_SENDER_ID);

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
    params.set('StatusCallback', `${apiPublicUrl()}/crm/api/webhooks/twilio/sms-status`);
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
      63015: 'Recipient has not joined the WhatsApp sandbox — send "join <code>" to +14155238886 first.',
      63016: 'Outside the 24-hour window — send an approved Content template (set TWILIO_WHATSAPP_CONTENT_SID or the template\'s twilioContentSid).',
      63018: 'WhatsApp rate limit reached.',
      21211: 'Invalid destination number (must be E.164, e.g. +919770601469).',
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
  const contentSid = channel === 'whatsapp'
    ? (opts.contentSid || (template && template.twilioContentSid) || null)
    : null;
  if (!body && !contentSid) throw new Error('Message body is empty');

  // Twilio Content templates take positional variables ({{1}}, {{2}}…) while CRM
  // templates use named ones. Map name → position in the order the placeholders
  // first appear in the body, so the CRM body doubles as a readable local preview
  // of the approved template. An explicit contentVariables always wins.
  let contentVariables = null;
  if (contentSid) {
    contentVariables = opts.contentVariables || null;
    if (!contentVariables && template && (template.variables || []).length) {
      contentVariables = Object.fromEntries(
        template.variables.map((v, i) => [String(i + 1), String(vars[v] === undefined || vars[v] === null ? '' : vars[v])])
      );
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
  });

  await jobs.schedule('message:send', opts.scheduledFor || new Date(), { messageId: msg._id.toString() });
  return msg;
};

/* ── worker: actually deliver one message ───────────────────────────────── */

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
    logger.error(`CRM message ${msg._id} failed: ${err.message}`);
    // Let automations react (e.g. SMS fallback when WhatsApp fails).
    require('./automation').emitEvent('message.failed', {
      entityKind: msg.leadId ? 'lead' : 'contact',
      entityId: msg.leadId || msg.contactId,
      data: { channel: msg.channel, messageId: msg._id.toString(), reason: err.message },
    }).catch(() => {});
    return;
  }

  await msg.save();
  const entity = msg.leadId ? { kind: 'lead', id: msg.leadId } : { kind: 'contact', id: msg.contactId };
  await timeline.record({
    entity,
    also: msg.dealId ? [{ kind: 'deal', id: msg.dealId }] : [],
    type: 'message.sent',
    title: msg.status === 'manual'
      ? `WhatsApp prepared (open link to send): "${msg.body.slice(0, 60)}"`
      : `${msg.channel.toUpperCase()} ${msg.status}: "${(msg.subject || msg.body).slice(0, 60)}"`,
    meta: { messageId: msg._id, channel: msg.channel, status: msg.status },
    actor: msg.sentBy ? { kind: 'user', userId: msg.sentBy } : { kind: 'automation', label: 'Automation' },
  });
};

const deliverEmail = async (msg) => {
  if (!mailer.isConfigured()) throw new Error('SMTP not configured');
  let html = msg.body.includes('<') ? msg.body : `<div style="font-family:Arial,sans-serif;white-space:pre-wrap">${msg.body}</div>`;
  const s = await settings.getSettings();
  if (s.emailTracking) {
    html += `<img src="${apiPublicUrl()}/crm/api/t/open/${msg._id}" width="1" height="1" style="display:none" alt=""/>`;
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

/** Record an inbound WhatsApp/SMS message; auto-creates a lead for unknown senders. */
const recordInbound = async (channel, fromPhone, body, raw) => {
  const s = await settings.getSettings();
  const phone = normalizePhone(fromPhone, s.defaultCountryCode);
  if (!phone) return null;

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
    status: 'received',
    statusHistory: [{ status: 'received', at: new Date(), raw }],
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

module.exports = {
  sendMessage, deliver, recordInbound, renderTemplate, buildVars, normalizePhone,
  waCloudConfigured, twilioConfigured, twilioWhatsappConfigured, msg91Configured,
};
