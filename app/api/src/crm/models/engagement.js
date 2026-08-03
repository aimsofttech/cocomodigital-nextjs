const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ── Calls (scheduling + logging) ───────────────────────────────────────── */
const callSchema = new Schema({
  leadId: { type: Schema.Types.ObjectId, ref: 'CrmLead', index: true },
  contactId: { type: Schema.Types.ObjectId, ref: 'CrmContact', index: true },
  dealId: { type: Schema.Types.ObjectId, ref: 'CrmDeal' },
  ownerId: { type: Schema.Types.ObjectId, ref: 'CrmUser', required: true, index: true },

  direction: { type: String, enum: ['outbound', 'inbound'], default: 'outbound' },
  purpose: { type: String, enum: ['intro', 'follow_up', 'demo', 'support', 'other'], default: 'follow_up' },

  scheduledAt: { type: Date, index: true },
  durationPlannedMin: { type: Number, default: 15 },
  reminderMinutesBefore: { type: Number, default: 15 },

  status: {
    type: String,
    enum: [
      'scheduled', 'completed', 'no_answer', 'busy', 'cancelled', 'rescheduled', 'missed',
      // Live Twilio lifecycle states. They mirror Twilio's own CallStatus values
      // so a status callback maps straight through without a lossy translation.
      'queued', 'initiated', 'ringing', 'in_progress', 'failed',
    ],
    default: 'scheduled',
    index: true,
  },
  startedAt: { type: Date },
  endedAt: { type: Date },
  durationSec: { type: Number },
  outcome: {
    type: String,
    enum: ['interested', 'not_interested', 'callback_requested', 'converted', 'wrong_number', 'voicemail', null],
    default: null,
  },
  notes: { type: String },
  recordingUrl: { type: String },
  recordingSid: { type: String, index: true, sparse: true },
  recordingDurationSec: { type: Number },

  provider: { type: String, enum: ['manual', 'twilio'], default: 'manual' },
  providerCallSid: { type: String, index: true, sparse: true },
  fromNumber: { type: String },
  toNumber: { type: String },

  /* ── Twilio failure detail ────────────────────────────────────────────────
   * Twilio reports failures two ways: a terminal CallStatus (busy/failed/
   * no-answer) and, for anything it could diagnose, a numeric ErrorCode. Both
   * are kept so the UI can show a human cause and the retry logic can decide
   * whether another attempt is worth placing at all. */
  errorCode: { type: String },
  errorMessage: { type: String },

  /* ── Retry chain ──────────────────────────────────────────────────────────
   * A retry is a NEW call document pointing back at the first attempt, rather
   * than a mutation of it. Keeping every attempt lets the history show what
   * actually happened instead of only the last outcome. */
  attemptNo: { type: Number, default: 1 },
  retryOfId: { type: Schema.Types.ObjectId, ref: 'CrmCall', index: true, sparse: true },
  retryScheduledAt: { type: Date },

  /* On a bridged call there are two legs and they disagree. The parent leg is
   * the *agent*: it reports "completed" whenever the agent's own phone
   * connected, even if the customer never picked up. The child leg is the
   * customer and is the only honest answer. Stamped when the child reports a
   * terminal status, so the parent callback knows not to overwrite it. */
  childReportedAt: { type: Date },

  // Twilio's answering-machine detection verdict: human | machine_start |
  // machine_end_beep | machine_end_silence | fax | unknown.
  answeredBy: { type: String },
  priceUsd: { type: Number },

  /* ── Automated / AI calling ───────────────────────────────────────────────
   * mode 'bridge'  → agent's phone rings first, then the lead (click-to-call).
   * mode 'auto'    → Twilio dials the lead and plays a TwiML script with no
   *                  agent on the line; keypress replies are captured.
   * mode 'inbound' → the lead called us. */
  mode: { type: String, enum: ['bridge', 'auto', 'inbound'], default: 'bridge', index: true },
  campaignId: { type: Schema.Types.ObjectId, ref: 'CrmCallCampaign', index: true, sparse: true },
  scriptId: { type: Schema.Types.ObjectId, ref: 'CrmCallScript' },
  // What the callee pressed / said during an automated call, in order.
  responses: [{ at: Date, digits: String, speech: String, step: String }],

  rescheduledFromId: { type: Schema.Types.ObjectId, ref: 'CrmCall' },
  createdByAutomation: { type: Boolean, default: false },

  // Set once this call has been mirrored onto the rep's external calendar, so
  // a re-sync patches the same event instead of creating a duplicate.
  googleEventId: { type: String, index: true, sparse: true },
}, { timestamps: true, collection: 'crm_calls' });

// Call history is always read "newest first, for one person" or "newest first,
// for one campaign" — both deserve a compound index rather than an index merge.
callSchema.index({ leadId: 1, createdAt: -1 });
callSchema.index({ contactId: 1, createdAt: -1 });
callSchema.index({ campaignId: 1, status: 1 });
callSchema.index({ ownerId: 1, createdAt: -1 });

/* ── Call scripts (automated / AI voice calls) ──────────────────────────────
 * A script is an ordered list of steps rendered into TwiML at call time. Kept
 * as data rather than hard-coded TwiML so non-developers can edit what the
 * robot says without a deploy, and so the same script can be reused by many
 * campaigns.
 *
 * Step kinds:
 *   say     — text-to-speech (supports {{placeholders}} like message templates)
 *   play    — play an audio file from a URL
 *   gather  — say a prompt, then wait for DTMF digits and branch on them
 *   record  — record the callee's answer (voicemail-style)
 *   dial    — warm-transfer the call to a human agent's number
 *   hangup  — end the call
 */
const callScriptSchema = new Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String },
  language: { type: String, default: 'en-IN' },
  // Twilio TTS voice. Polly.* voices are the neural ones; 'alice' is legacy.
  voice: { type: String, default: 'Polly.Aditi' },
  steps: [{
    kind: { type: String, enum: ['say', 'play', 'gather', 'record', 'dial', 'hangup'], required: true },
    text: { type: String },              // say / gather prompt
    url: { type: String },               // play
    numDigits: { type: Number, default: 1 },
    timeoutSec: { type: Number, default: 5 },
    maxLengthSec: { type: Number, default: 30 },   // record
    transferTo: { type: String },        // dial — E.164
    // digit -> outcome/next-step mapping, e.g. { '1': 'interested', '2': 'not_interested' }
    branches: { type: Schema.Types.Mixed, default: {} },
  }],
  // When AMD says "machine", play this instead of the live script (or skip).
  voicemailText: { type: String },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'CrmUser' },
}, { timestamps: true, collection: 'crm_call_scripts' });

/* ── Call campaigns (bulk + scheduled outbound) ─────────────────────────────
 * The campaign holds the *policy* (who, when, how fast, how many retries); the
 * individual CrmCall documents hold the results. Progress counters are kept
 * denormalised on the campaign so the list view never has to aggregate. */
const callCampaignSchema = new Schema({
  name: { type: String, required: true, trim: true },
  mode: { type: String, enum: ['auto', 'bridge'], default: 'auto' },
  scriptId: { type: Schema.Types.ObjectId, ref: 'CrmCallScript' },
  // Agent whose phone rings first in 'bridge' mode, and the owner of the calls.
  ownerId: { type: Schema.Types.ObjectId, ref: 'CrmUser', required: true, index: true },

  // Targets are frozen at creation time so editing a lead filter later cannot
  // silently widen a campaign that is already dialling.
  targets: [{
    leadId: { type: Schema.Types.ObjectId, ref: 'CrmLead' },
    contactId: { type: Schema.Types.ObjectId, ref: 'CrmContact' },
    phone: { type: String },
    status: { type: String, enum: ['pending', 'dialing', 'done', 'failed', 'skipped'], default: 'pending' },
    callId: { type: Schema.Types.ObjectId, ref: 'CrmCall' },
    attempts: { type: Number, default: 0 },
    lastError: { type: String },
  }],

  status: {
    type: String,
    enum: ['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'],
    default: 'draft',
    index: true,
  },
  startAt: { type: Date, index: true },
  // Dialling window in the CRM timezone — outside it the runner idles rather
  // than calling people at 3am, which is both illegal in several jurisdictions
  // and the fastest way to get a number flagged as spam.
  windowStart: { type: String, default: '10:00' },
  windowEnd: { type: String, default: '19:00' },
  // Concurrency cap: how many calls may be live at once. Twilio trial and new
  // accounts are rate-limited to 1 CPS, so this doubles as a throttle.
  concurrency: { type: Number, default: 1 },
  maxAttempts: { type: Number, default: 2 },
  retryDelayMin: { type: Number, default: 60 },

  stats: {
    total: { type: Number, default: 0 },
    dialed: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    answered: { type: Number, default: 0 },
    machine: { type: Number, default: 0 },
  },
  startedAt: { type: Date },
  finishedAt: { type: Date },
  createdBy: { type: Schema.Types.ObjectId, ref: 'CrmUser' },
}, { timestamps: true, collection: 'crm_call_campaigns' });

/* ── Message templates (email / whatsapp / sms) ─────────────────────────── */
const templateSchema = new Schema({
  name: { type: String, required: true, trim: true },
  channel: { type: String, enum: ['whatsapp', 'sms', 'email'], required: true },
  subject: { type: String, trim: true },            // email only
  body: { type: String, required: true },           // supports {{placeholders}}
  variables: [{ type: String }],
  category: { type: String, trim: true },           // welcome | follow_up | meeting | promo ...
  // WhatsApp Cloud API specifics (only needed when WA cloud mode is enabled)
  waTemplateName: { type: String, trim: true },
  waLanguageCode: { type: String, default: 'en' },
  // Twilio WhatsApp specifics — a Content template SID (HX...) from the Twilio
  // Content Template Builder. Required to send outside the 24-hour window.
  // `variables` above names the ordered placeholders this template expects.
  twilioContentSid: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'CrmUser' },
}, { timestamps: true, collection: 'crm_message_templates' });

/* ── Messages (unified log: whatsapp / sms / email) ─────────────────────── */
const messageSchema = new Schema({
  channel: { type: String, enum: ['whatsapp', 'sms', 'email'], required: true, index: true },
  direction: { type: String, enum: ['outbound', 'inbound'], default: 'outbound' },
  leadId: { type: Schema.Types.ObjectId, ref: 'CrmLead', index: true },
  contactId: { type: Schema.Types.ObjectId, ref: 'CrmContact', index: true },
  dealId: { type: Schema.Types.ObjectId, ref: 'CrmDeal' },
  toAddress: { type: String, required: true, index: true },  // phone or email
  fromAddress: { type: String },

  templateId: { type: Schema.Types.ObjectId, ref: 'CrmMessageTemplate' },
  subject: { type: String },
  body: { type: String },
  mediaUrls: [{ type: String }],

  status: {
    type: String,
    // 'manual' = free WhatsApp link mode: the CRM prepared a wa.me link that an
    // agent opens & sends by hand (no paid API involved).
    enum: ['queued', 'sent', 'delivered', 'read', 'failed', 'bounced', 'replied', 'manual', 'received'],
    default: 'queued',
    index: true,
  },
  statusHistory: [{ status: String, at: Date, raw: Schema.Types.Mixed }],
  failReason: { type: String },
  waLink: { type: String },                          // wa.me link (free mode)

  provider: { type: String },                        // smtp | whatsapp_cloud | wa_link | twilio | twilio_whatsapp | msg91
  providerMessageId: { type: String, index: true, sparse: true },

  // Twilio Content template send (WhatsApp outside the 24h window). When set,
  // Twilio renders the approved template itself and `body` holds only a local
  // preview for the inbox/timeline.
  contentSid: { type: String },
  contentVariables: { type: Schema.Types.Mixed },

  sentBy: { type: Schema.Types.ObjectId, ref: 'CrmUser' },  // null → automation/system
  automationRunId: { type: Schema.Types.ObjectId, ref: 'CrmAutomationRun' },
  scheduledFor: { type: Date },
  openedAt: { type: Date },
}, { timestamps: true, collection: 'crm_messages' });
messageSchema.index({ channel: 1, toAddress: 1, createdAt: -1 });

/* ── Tasks ──────────────────────────────────────────────────────────────── */
const taskSchema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String },
  type: { type: String, enum: ['todo', 'call', 'email', 'whatsapp', 'meeting', 'document'], default: 'todo' },
  leadId: { type: Schema.Types.ObjectId, ref: 'CrmLead', index: true },
  contactId: { type: Schema.Types.ObjectId, ref: 'CrmContact', index: true },
  dealId: { type: Schema.Types.ObjectId, ref: 'CrmDeal' },
  assigneeId: { type: Schema.Types.ObjectId, ref: 'CrmUser', required: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'CrmUser' },
  dueAt: { type: Date, index: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['open', 'in_progress', 'done', 'cancelled'], default: 'open', index: true },
  completedAt: { type: Date },
  completedBy: { type: Schema.Types.ObjectId, ref: 'CrmUser' },
  reminderAt: { type: Date },
  overdueNotifiedAt: { type: Date },
  automationRunId: { type: Schema.Types.ObjectId, ref: 'CrmAutomationRun' },
}, { timestamps: true, collection: 'crm_tasks' });

/* ── Follow-ups ─────────────────────────────────────────────────────────── */
const followUpSchema = new Schema({
  leadId: { type: Schema.Types.ObjectId, ref: 'CrmLead', index: true },
  contactId: { type: Schema.Types.ObjectId, ref: 'CrmContact', index: true },
  dealId: { type: Schema.Types.ObjectId, ref: 'CrmDeal' },
  ownerId: { type: Schema.Types.ObjectId, ref: 'CrmUser', required: true, index: true },
  dueAt: { type: Date, required: true, index: true },
  note: { type: String },
  channelHint: { type: String, enum: ['call', 'whatsapp', 'sms', 'email', 'any'], default: 'any' },
  status: { type: String, enum: ['pending', 'done', 'snoozed', 'cancelled'], default: 'pending', index: true },
  snoozedUntil: { type: Date },
  doneAt: { type: Date },
  escalatedAt: { type: Date },
  automationRunId: { type: Schema.Types.ObjectId, ref: 'CrmAutomationRun' },
}, { timestamps: true, collection: 'crm_follow_ups' });

module.exports = {
  CrmCall: mongoose.model('CrmCall', callSchema),
  CrmCallScript: mongoose.model('CrmCallScript', callScriptSchema),
  CrmCallCampaign: mongoose.model('CrmCallCampaign', callCampaignSchema),
  CrmMessageTemplate: mongoose.model('CrmMessageTemplate', templateSchema),
  CrmMessage: mongoose.model('CrmMessage', messageSchema),
  CrmTask: mongoose.model('CrmTask', taskSchema),
  CrmFollowUp: mongoose.model('CrmFollowUp', followUpSchema),
};
