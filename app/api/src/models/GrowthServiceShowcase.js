const mongoose = require('mongoose');

/* A panel in a `showcase` or `format-panels` section.
 *
 *  - showcase      → the social page's per-platform cards (9:16 mock + bullets)
 *  - format-panels → the podcast page's audio / video quality panels
 *
 * `points` is newline-separated text rather than an array so the admin can edit
 * it in a plain <textarea>; the public controller splits it into a list.
 */
const growthServiceShowcaseSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  growthServiceId: { type: mongoose.Schema.Types.Mixed, required: true },
  /** Matches GrowthServiceSection.sectionKey. */
  sectionKey: { type: String, required: true, trim: true },
  /** Registry name from the web app's icon map (e.g. "FaInstagram"). */
  icon: { type: String, trim: true, default: '' },
  title: { type: String, required: true, trim: true },
  /** Headline printed inside the mock frame (showcase panels only). */
  caption: { type: String, trim: true, default: '' },
  /** Engagement figure printed under the caption (showcase panels only). */
  metric: { type: String, trim: true, default: '' },
  /** Corner badge inside the mock frame. */
  mediaBadge: { type: String, enum: ['ratio', 'play', 'video', 'none'], default: 'none' },
  /** Surface treatment for format panels: brand-tinted or soft grey. */
  tone: { type: String, enum: ['brand', 'soft', 'page'], default: 'page' },
  /** Watermark glyph in the panel's bottom-right (format panels only). */
  watermarkIcon: { type: String, trim: true, default: '' },
  /** One check-bullet per row. */
  points: { type: String, default: '' },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 1 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'growth_service_showcases' });

module.exports = mongoose.model('GrowthServiceShowcase', growthServiceShowcaseSchema);
