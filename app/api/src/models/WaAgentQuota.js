'use strict';

const mongoose = require('mongoose');

/**
 * One document per SUCCESSFUL gateway write (a booking or an enquiry that
 * returned 201). Used for three things, none of which read any other
 * collection:
 *
 *   - per-sender quotas: count of `kind` for a `wa_from` in the last 24 h
 *   - idempotency: a repeat /book with the same wa_from + date + time within
 *     2 minutes is answered with the stored `result` instead of a new booking
 *   - the opaque reference the agent quoted, kept with the record it stands for
 *
 * Expires 24 h after creation through the TTL index — the quota window — so
 * the collection cannot grow without bound. Stored in Mongo rather than in
 * memory on purpose: every deploy is a `pm2 reload`, which would reset an
 * in-memory 24-hour counter.
 *
 * Nothing in here is ever returned to a caller except the replayed `result`,
 * which is a response body the gateway already sent once.
 */
const waAgentQuotaSchema = new mongoose.Schema({
  kind: { type: String, enum: ['book', 'enquiry'], required: true },
  wa_from: { type: String, required: true },
  ref: { type: String, required: true },

  // /book only — the idempotency key alongside wa_from.
  meeting_date: { type: String },
  meeting_time: { type: String },

  // The exact 201 body sent, replayed on an idempotent repeat.
  result: { type: mongoose.Schema.Types.Mixed },

  createdAt: { type: Date, default: Date.now },
}, { collection: 'wa_agent_quotas', versionKey: false });

waAgentQuotaSchema.index({ wa_from: 1, kind: 1, createdAt: -1 });
waAgentQuotaSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

module.exports = mongoose.model('WaAgentQuota', waAgentQuotaSchema);
