const mongoose = require('mongoose');

/* A figure tile on the podcast page. Three bands use the same
 * {value, label, description} shape, so one collection carries them all,
 * scoped by `sectionKey`:
 *
 *   trust    → the credentials strip under the hero (description unused)
 *   problem  → the three "the recording is the cheapest part" cards
 *   scale    → the four scale-of-operation tiles in the studio strip
 *
 * Figures are stored as text so "12B+", "$600K+" and "4–8 hrs" round-trip
 * exactly as entered.
 */
const podcastStatSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  podcastPageId: { type: mongoose.Schema.Types.Mixed, required: true },
  /** Which band this tile belongs to. */
  sectionKey: { type: String, enum: ['trust', 'problem', 'scale'], required: true },
  value: { type: String, required: true, trim: true },
  label: { type: String, required: true, trim: true },
  /** Supporting line under the label. Unused by the trust strip. */
  description: { type: String, default: '' },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 1 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'podcast_stats' });

module.exports = mongoose.model('PodcastStat', podcastStatSchema);
