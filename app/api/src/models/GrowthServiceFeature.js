const mongoose = require('mongoose');

/* An icon-card inside a `grid` section, or a numbered step inside a `timeline`
 * section (which ignores the icon). Every icon-card band across the three
 * pages — services, deliverables, problems, why-choose-us, content formats —
 * is the same {icon, title, description} shape, so one collection covers them
 * all, scoped by `sectionKey`.
 */
const growthServiceFeatureSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  growthServiceId: { type: mongoose.Schema.Types.Mixed, required: true },
  /** Matches GrowthServiceSection.sectionKey. */
  sectionKey: { type: String, required: true, trim: true },
  /** Registry name from the web app's icon map (e.g. "FiTarget"). */
  icon: { type: String, trim: true, default: '' },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 1 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'growth_service_features' });

module.exports = mongoose.model('GrowthServiceFeature', growthServiceFeatureSchema);
