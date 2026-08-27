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

  /* Mirrors slot_key for exactly as long as this meeting actually holds the
     slot (pending or confirmed), and is unset otherwise. Derived by the hook
     below — never assign it directly. The sparse unique index on it is what
     makes the reservation atomic; see the index comment. */
  slot_hold: { type: String, default: undefined },
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

  // Team member the owner delegated this meeting to (picked from the admin
  // users list). Older documents simply lack these fields until first assigned
  // — Mongoose applies the null default on read, so no migration is needed.
  assignedTo: { type: mongoose.Schema.Types.Mixed, default: null }, // { name, email }
  assignedBy: { type: mongoose.Schema.Types.Mixed, default: null },
  assignedAt: { type: Date, default: null },

  // Set once the 1-hour-before reminder email has fired, so the poller
  // never sends it twice for the same meeting.
  reminderSentAt: { type: Date, default: null },
}, { timestamps: true, collection: 'meetings' });

/** Statuses in which a meeting is still occupying its slot. */
const HOLDING_STATUSES = ['pending', 'confirmed'];

/* Keep slot_hold in step with (slot_key, status) on every write that goes
   through a document — create, confirm, reject, reschedule. Deriving it here
   rather than at each call site means a new status transition can't forget to
   release or re-take the slot. */
meetingSchema.pre('save', function syncSlotHold(next) {
  this.slot_hold = this.slot_key && HOLDING_STATUSES.includes(this.status)
    ? this.slot_key
    : undefined;
  next();
});

// Prevent two confirmed meetings at the same slot (race-proof via unique index).
meetingSchema.index(
  { slot_key: 1 },
  {
    unique: true,
    partialFilterExpression: { slot_key: { $exists: true }, status: 'confirmed' },
  }
);

/* The same guarantee one step earlier: two visitors submitting the same slot in
   the same instant would both pass the "is it taken?" read before either wrote,
   and both end up with a pending meeting. This index makes the insert itself the
   reservation — the loser gets a duplicate-key error, which the booking and
   reschedule endpoints already translate into a 409.
   Sparse on a dedicated field rather than a partial index on slot_key, because a
   partial expression matching two statuses needs MongoDB 5.3+, and redefining
   the index above would require dropping it on a live collection. */
meetingSchema.index({ slot_hold: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Meeting', meetingSchema);
