const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ── Activity timeline (append-only; write via services/timeline.js) ────── */
const activitySchema = new Schema({
  entity: {
    kind: { type: String, required: true },  // lead | contact | deal | company
    id: { type: Schema.Types.ObjectId, required: true },
  },
  also: [{
    kind: { type: String },
    id: { type: Schema.Types.ObjectId },
  }],
  type: { type: String, required: true, index: true },
  title: { type: String, required: true },
  meta: { type: Schema.Types.Mixed },
  actor: {
    kind: { type: String, enum: ['user', 'automation', 'system', 'sync'], default: 'system' },
    userId: { type: Schema.Types.ObjectId, ref: 'CrmUser' },
    label: { type: String },
  },
}, { timestamps: true, collection: 'crm_activities' });
activitySchema.index({ 'entity.kind': 1, 'entity.id': 1, createdAt: -1 });
activitySchema.index({ 'also.kind': 1, 'also.id': 1, createdAt: -1 });

/* ── Notifications ──────────────────────────────────────────────────────── */
const notificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'CrmUser', required: true, index: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String },
  entity: {
    kind: { type: String },
    id: { type: Schema.Types.ObjectId },
  },
  isRead: { type: Boolean, default: false, index: true },
}, { timestamps: true, collection: 'crm_notifications' });
// Auto-expire notifications after 90 days.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

/* ── Documents ──────────────────────────────────────────────────────────── */
const documentSchema = new Schema({
  name: { type: String, required: true, trim: true },
  url: { type: String, required: true },
  s3Key: { type: String },
  mimeType: { type: String },
  sizeBytes: { type: Number },
  entity: {
    kind: { type: String, required: true },
    id: { type: Schema.Types.ObjectId, required: true },
  },
  category: {
    type: String,
    enum: ['proposal', 'contract', 'id_proof', 'invoice', 'media', 'other'],
    default: 'other',
  },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'CrmUser' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true, collection: 'crm_documents' });
documentSchema.index({ 'entity.kind': 1, 'entity.id': 1 });

/* ── Automation rules ───────────────────────────────────────────────────── */
const automationRuleSchema = new Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String },
  isActive: { type: Boolean, default: true, index: true },
  trigger: {
    event: { type: String, required: true },
    // event-specific config, e.g. { from: 'new', to: 'contacted' } or { idleDays: 7 }
    config: { type: Schema.Types.Mixed, default: {} },
  },
  // Flat AND list: [{ field, op, value }]
  conditions: [{
    field: { type: String },
    op: { type: String, enum: ['eq', 'ne', 'in', 'nin', 'gt', 'gte', 'lt', 'lte', 'contains', 'exists'] },
    value: { type: Schema.Types.Mixed },
  }],
  actions: [{
    type: {
      type: String,
      enum: ['send_email', 'send_whatsapp', 'send_sms', 'schedule_call', 'create_task',
             'create_followup', 'assign_owner', 'update_field', 'add_tag', 'remove_tag',
             'notify_user', 'wait'],
      required: true,
    },
    config: { type: Schema.Types.Mixed, default: {} },
  }],
  respectQuietHours: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'CrmUser' },
  lastRunAt: { type: Date },
  runCount: { type: Number, default: 0 },
}, { timestamps: true, collection: 'crm_automation_rules' });

/* ── Automation runs (execution audit) ──────────────────────────────────── */
const automationRunSchema = new Schema({
  ruleId: { type: Schema.Types.ObjectId, ref: 'CrmAutomationRule', index: true },
  ruleName: { type: String },
  triggerEvent: { type: String },
  eventData: { type: Schema.Types.Mixed },
  entity: {
    kind: { type: String },
    id: { type: Schema.Types.ObjectId },
  },
  status: { type: String, enum: ['running', 'completed', 'failed', 'skipped', 'waiting'], default: 'running' },
  skippedReason: { type: String },
  depth: { type: Number, default: 0 },
  steps: [{
    actionType: String,
    status: String,          // ok | failed | waiting
    output: Schema.Types.Mixed,
    error: String,
    at: Date,
  }],
}, { timestamps: true, collection: 'crm_automation_runs' });
automationRunSchema.index({ 'entity.kind': 1, 'entity.id': 1, createdAt: -1 });

module.exports = {
  CrmActivity: mongoose.model('CrmActivity', activitySchema),
  CrmNotification: mongoose.model('CrmNotification', notificationSchema),
  CrmDocument: mongoose.model('CrmDocument', documentSchema),
  CrmAutomationRule: mongoose.model('CrmAutomationRule', automationRuleSchema),
  CrmAutomationRun: mongoose.model('CrmAutomationRun', automationRunSchema),
};
