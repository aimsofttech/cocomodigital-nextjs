const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/* ── Roles ──────────────────────────────────────────────────────────────── */
const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  isSystem: { type: Boolean, default: false },
  // When true, list/detail queries for this role are silently filtered to
  // records the user owns (ownerId / assigneeId).
  ownScope: { type: Boolean, default: false },
  permissions: [{ type: String }],
}, { timestamps: true, collection: 'crm_roles' });

/* ── Users ──────────────────────────────────────────────────────────────── */
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 4, select: false },
  phone: { type: String, trim: true },
  avatarUrl: { type: String },
  roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'CrmRole', required: true },
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date },
  notificationPrefs: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
  },
}, { timestamps: true, collection: 'crm_users' });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

userSchema.set('toJSON', {
  transform: (doc, ret) => { delete ret.password; return ret; },
});

/* ── Settings (single key/value doc) ────────────────────────────────────── */
const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true, collection: 'crm_settings' });

/* ── Audit log ──────────────────────────────────────────────────────────── */
const auditSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'CrmUser' },
  userName: { type: String },
  action: { type: String },          // e.g. 'POST /crm/api/leads'
  method: { type: String },
  path: { type: String },
  entity: {
    kind: { type: String },
    id: { type: mongoose.Schema.Types.Mixed },
  },
  body: { type: mongoose.Schema.Types.Mixed },
  ip: { type: String },
}, { timestamps: true, collection: 'crm_audit_logs' });
auditSchema.index({ createdAt: -1 });

/* ── Jobs (Mongo-backed scheduler — replaces Redis/BullMQ) ──────────────── */
const jobSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  runAt: { type: Date, required: true, index: true },
  status: {
    type: String,
    enum: ['pending', 'running', 'done', 'failed', 'cancelled'],
    default: 'pending',
    index: true,
  },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  // For cancellation / idempotent scheduling (e.g. one reminder per call).
  dedupeKey: { type: String, index: true, sparse: true },
  // Repeatable jobs re-schedule themselves after each run.
  repeatEveryMs: { type: Number },
  lockedAt: { type: Date },
  lastError: { type: String },
  finishedAt: { type: Date },
}, { timestamps: true, collection: 'crm_jobs' });
jobSchema.index({ status: 1, runAt: 1 });

module.exports = {
  CrmRole: mongoose.model('CrmRole', roleSchema),
  CrmUser: mongoose.model('CrmUser', userSchema),
  CrmSetting: mongoose.model('CrmSetting', settingSchema),
  CrmAuditLog: mongoose.model('CrmAuditLog', auditSchema),
  CrmJob: mongoose.model('CrmJob', jobSchema),
};
