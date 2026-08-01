const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ── Leads ──────────────────────────────────────────────────────────────── */
const leadSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true, index: true },
  phone: { type: String, trim: true, index: true },
  company: { type: String, trim: true },
  designation: { type: String, trim: true },

  source: {
    channel: {
      type: String,
      enum: ['contact_form', 'marketing_form', 'consultation', 'meeting',
             'whatsapp_inbound', 'manual', 'import', 'referral'],
      default: 'manual',
    },
    externalId: { type: String },
    externalCollection: { type: String },
    sourcePage: { type: String },
    raw: { type: Schema.Types.Mixed },
  },
  serviceInterest: { type: String, trim: true },
  budget: { type: String, trim: true },
  message: { type: String, trim: true },

  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'junk'],
    default: 'new',
    index: true,
  },
  lostReason: { type: String },
  score: { type: Number, default: 0 },
  rating: { type: String, enum: ['hot', 'warm', 'cold'], default: 'warm' },

  ownerId: { type: Schema.Types.ObjectId, ref: 'CrmUser', index: true },
  assignedAt: { type: Date },
  assignedBy: { type: Schema.Types.ObjectId, ref: 'CrmUser' },

  convertedContactId: { type: Schema.Types.ObjectId, ref: 'CrmContact' },
  convertedDealId: { type: Schema.Types.ObjectId, ref: 'CrmDeal' },
  convertedAt: { type: Date },

  tags: [{ type: String }],
  lastActivityAt: { type: Date, index: true },
  nextFollowUpAt: { type: Date, index: true },
  idleNotifiedAt: { type: Date },
  callAttempts: { type: Number, default: 0 },
  deletedAt: { type: Date, default: null },
}, { timestamps: true, collection: 'crm_leads' });

leadSchema.index({ status: 1, ownerId: 1 });
// Sync idempotency: one lead per external source record.
leadSchema.index(
  { 'source.externalCollection': 1, 'source.externalId': 1 },
  { unique: true, partialFilterExpression: { 'source.externalId': { $exists: true, $type: 'string' } } }
);

/* ── Companies ──────────────────────────────────────────────────────────── */
const companySchema = new Schema({
  name: { type: String, required: true, trim: true, index: true },
  website: { type: String, trim: true },
  industry: { type: String, trim: true },
  size: { type: String, trim: true },
  gstin: { type: String, trim: true },
  address: {
    line1: String, line2: String, city: String, state: String, country: String, pincode: String,
  },
  ownerId: { type: Schema.Types.ObjectId, ref: 'CrmUser' },
  tags: [{ type: String }],
  deletedAt: { type: Date, default: null },
}, { timestamps: true, collection: 'crm_companies' });

/* ── Contacts (customers) ───────────────────────────────────────────────── */
const contactSchema = new Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true, index: true },
  phone: { type: String, trim: true, index: true },
  altPhone: { type: String, trim: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'CrmCompany', index: true },
  designation: { type: String, trim: true },
  lifecycle: { type: String, enum: ['lead', 'customer', 'past_customer'], default: 'customer' },
  originLeadId: { type: Schema.Types.ObjectId, ref: 'CrmLead' },
  ownerId: { type: Schema.Types.ObjectId, ref: 'CrmUser', index: true },

  // Consent / compliance flags — enforced in the message worker.
  whatsappOptIn: { type: Boolean, default: true },
  smsOptIn: { type: Boolean, default: true },
  emailOptIn: { type: Boolean, default: true },
  dnd: { type: Boolean, default: false },

  address: {
    line1: String, line2: String, city: String, state: String, country: String, pincode: String,
  },
  tags: [{ type: String }],
  notes: { type: String },
  lastActivityAt: { type: Date },
  deletedAt: { type: Date, default: null },
}, { timestamps: true, collection: 'crm_contacts' });

/* ── Pipelines ──────────────────────────────────────────────────────────── */
const pipelineSchema = new Schema({
  name: { type: String, required: true, trim: true },
  isDefault: { type: Boolean, default: false },
  stages: [{
    key: { type: String, required: true },
    label: { type: String, required: true },
    order: { type: Number, default: 0 },
    probability: { type: Number, default: 0 },   // 0–100
  }],
}, { timestamps: true, collection: 'crm_pipelines' });

/* ── Deals ──────────────────────────────────────────────────────────────── */
const dealSchema = new Schema({
  title: { type: String, required: true, trim: true },
  contactId: { type: Schema.Types.ObjectId, ref: 'CrmContact', index: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'CrmCompany' },
  leadId: { type: Schema.Types.ObjectId, ref: 'CrmLead' },
  pipelineId: { type: Schema.Types.ObjectId, ref: 'CrmPipeline' },
  stageKey: { type: String, index: true },
  value: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  expectedCloseDate: { type: Date },
  wonAt: { type: Date },
  lostAt: { type: Date },
  lostReason: { type: String },
  ownerId: { type: Schema.Types.ObjectId, ref: 'CrmUser', index: true },
  stageHistory: [{
    stageKey: String,
    enteredAt: Date,
    byUserId: { type: Schema.Types.Mixed },
  }],
  tags: [{ type: String }],
  deletedAt: { type: Date, default: null },
}, { timestamps: true, collection: 'crm_deals' });

module.exports = {
  CrmLead: mongoose.model('CrmLead', leadSchema),
  CrmCompany: mongoose.model('CrmCompany', companySchema),
  CrmContact: mongoose.model('CrmContact', contactSchema),
  CrmPipeline: mongoose.model('CrmPipeline', pipelineSchema),
  CrmDeal: mongoose.model('CrmDeal', dealSchema),
};
