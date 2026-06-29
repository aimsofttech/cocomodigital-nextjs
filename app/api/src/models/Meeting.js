const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  userName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  companyName: { type: String, trim: true },
  meetingDate: { type: String, trim: true },
  meetingTime: { type: String, trim: true },
  meetingTimezone: { type: String, trim: true },
  meeting_start_utc: { type: Date, default: undefined },
  slot_key: { type: String, default: undefined },
  duration: { type: Number, default: 15 },
  notes: { type: String, trim: true },
  service: { type: String, trim: true },
  source_page: { type: String, trim: true },

  status: {
    type: String,
    enum: ['pending', 'confirmed', 'rejected', 'completed'],
    default: 'pending',
  },

  // Populated after admin confirms
  meetLink: { type: String, default: null },
  meetId: { type: String, default: null },
  google_event_id: { type: String, default: null },
  google_html_link: { type: String, default: null },

  confirmedBy: { type: mongoose.Schema.Types.Mixed, default: null },
  confirmedAt: { type: Date, default: null },
  rejectedAt: { type: Date, default: null },

  // Populated when an admin reschedules an expired/pending meeting to a new slot.
  rescheduledBy: { type: mongoose.Schema.Types.Mixed, default: null },
  rescheduledAt: { type: Date, default: null },
}, { timestamps: true, collection: 'meetings' });

// Prevent two confirmed meetings at the same slot (race-proof via unique index).
meetingSchema.index(
  { slot_key: 1 },
  {
    unique: true,
    partialFilterExpression: { slot_key: { $exists: true }, status: 'confirmed' },
  }
);

module.exports = mongoose.model('Meeting', meetingSchema);
