const mongoose = require('mongoose');

const freeConsultationItemSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  consultation_category_id: { type: mongoose.Schema.Types.Mixed, default: null },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  company: { type: String, trim: true },
  message: { type: String, trim: true },
  budget: { type: String, trim: true },
  is_read: { type: Number, enum: [0, 1], default: 0 },

  // ── Meeting-slot booking fields ───────────────────────────────
  // Present only on /schedule-meeting bookings (not general leads).
  meeting_start_utc: { type: Date, default: undefined }, // exact instant of the slot
  // Canonical slot identifier: the UTC instant truncated to the minute
  // ("YYYY-MM-DDTHH:mm"). Two bookings for the same instant share this key.
  slot_key: { type: String, default: undefined },
  meeting_status: { type: String, enum: ['confirmed', 'cancelled'], default: undefined },
}, { timestamps: true, strict: false, collection: 'free_consultation_item' });

// Hard double-booking guard: at most one *confirmed* booking per slot. This is
// race-proof — concurrent inserts for the same slot make the 2nd fail with a
// duplicate-key (E11000) error, which the controller turns into a 409. The
// partial filter keeps the index limited to real bookings (leads have no
// slot_key) and frees a slot when a booking is cancelled.
freeConsultationItemSchema.index(
  { slot_key: 1 },
  {
    unique: true,
    partialFilterExpression: { slot_key: { $exists: true }, meeting_status: 'confirmed' },
  }
);

module.exports = mongoose.model('FreeConsultationItem', freeConsultationItemSchema);
