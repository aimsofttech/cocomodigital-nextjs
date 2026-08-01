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
    enum: ['scheduled', 'completed', 'no_answer', 'busy', 'cancelled', 'rescheduled', 'missed'],
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

  provider: { type: String, enum: ['manual', 'twilio'], default: 'manual' },
  providerCallSid: { type: String, index: true, sparse: true },
  fromNumber: { type: String },
  toNumber: { type: String },

  rescheduledFromId: { type: Schema.Types.ObjectId, ref: 'CrmCall' },
  createdByAutomation: { type: Boolean, default: false },

  // Set once this call has been mirrored onto the rep's external calendar, so
  // a re-sync patches the same event instead of creating a duplicate.
  googleEventId: { type: String, index: true, sparse: true },
}, { timestamps: true, collection: 'crm_calls' });

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

  provider: { type: String },                        // smtp | whatsapp_cloud | wa_link | twilio | msg91
  providerMessageId: { type: String, index: true, sparse: true },

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
  CrmMessageTemplate: mongoose.model('CrmMessageTemplate', templateSchema),
  CrmMessage: mongoose.model('CrmMessage', messageSchema),
  CrmTask: mongoose.model('CrmTask', taskSchema),
  CrmFollowUp: mongoose.model('CrmFollowUp', followUpSchema),
};
