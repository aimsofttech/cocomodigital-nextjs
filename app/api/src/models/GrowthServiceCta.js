const mongoose = require('mongoose');

/* A call-to-action button. `placement` decides which band it renders in:
 * "hero" (under the hero copy) or "closing" (the near-black closing band).
 */
const growthServiceCtaSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  growthServiceId: { type: mongoose.Schema.Types.Mixed, required: true },
  placement: { type: String, enum: ['hero', 'closing'], default: 'hero' },
  label: { type: String, required: true, trim: true },
  href: { type: String, required: true, trim: true },
  /** "solid" = filled, "outline" = bordered. */
  variant: { type: String, enum: ['solid', 'outline'], default: 'solid' },
  /** Registry name from the web app's icon map (e.g. "FiPlay"). */
  icon: { type: String, trim: true, default: '' },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 1 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'growth_service_ctas' });

module.exports = mongoose.model('GrowthServiceCta', growthServiceCtaSchema);
