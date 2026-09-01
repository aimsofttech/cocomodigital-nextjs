const mongoose = require('mongoose');

/* A button or link on the podcast page. `placement` decides which band it
 * renders in:
 *
 *   hero     → under the hero copy
 *   pricing  → the footer of the pricing card
 *   founder  → under the founder note
 *   proof    → the two secondary links in the proof band
 *
 * `variant` maps to the page's two button treatments: "primary" is the filled
 * yellow button with a trailing arrow, "secondary" is the bordered link.
 */
const podcastCtaSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  podcastPageId: { type: mongoose.Schema.Types.Mixed, required: true },
  placement: {
    type: String,
    enum: ['hero', 'pricing', 'founder', 'proof'],
    default: 'hero',
  },
  label: { type: String, required: true, trim: true },
  href: { type: String, required: true, trim: true },
  variant: { type: String, enum: ['primary', 'secondary'], default: 'primary' },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 1 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'podcast_ctas' });

module.exports = mongoose.model('PodcastCta', podcastCtaSchema);
