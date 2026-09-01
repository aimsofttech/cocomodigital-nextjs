const mongoose = require('mongoose');

/* A repeating item on the podcast page. Five bands are the same
 * {icon, title, body, meta, points} shape underneath, so one collection
 * carries them all, scoped by `sectionKey`:
 *
 *   services    → the eight service cards   (icon, title, body, points = tags)
 *   audiences   → the three audience cards  (icon, title, body, meta = signal)
 *   operations  → the three time-zone cards (icon, title, body)
 *   process     → the three process steps   (step, title, meta = duration, body)
 *   month       → the monthly deliverables table
 *                 (title = deliverable, meta = volume, body = detail)
 *
 * A band only fills the fields it draws; the rest stay empty and the admin
 * form for each list shows only the ones that apply.
 */
const podcastCardSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  podcastPageId: { type: mongoose.Schema.Types.Mixed, required: true },
  /** Which band this item belongs to. */
  sectionKey: {
    type: String,
    enum: ['services', 'audiences', 'operations', 'process', 'month'],
    required: true,
  },
  /** Registry name from the page's icon set (e.g. "video", "mic", "clock"). */
  icon: { type: String, trim: true, default: '' },
  /** Printed ordinal, e.g. "01". Process steps only. */
  step: { type: String, trim: true, default: '' },
  title: { type: String, required: true, trim: true },
  body: { type: String, default: '' },
  /** Short qualifier: the audience signal, the step duration, the volume. */
  meta: { type: String, trim: true, default: '' },
  /** One tag per row. Service cards only. */
  points: { type: String, default: '' },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 1 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'podcast_cards' });

module.exports = mongoose.model('PodcastCard', podcastCardSchema);
