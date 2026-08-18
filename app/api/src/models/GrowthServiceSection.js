const mongoose = require('mongoose');

/* One band on a growth landing page: its heading copy plus how its items are
 * laid out. `sectionKey` is the join key the item collections
 * (GrowthServiceFeature / GrowthServiceShowcase) point back at, and `renderer`
 * decides which component draws them.
 *
 * The `case-study` and `faq` renderers read their content from
 * GrowthServiceCaseMetric / GrowthServiceFaq and the parent record, so those
 * sections carry heading copy only. The `article` renderer draws the long-form
 * SEO copy blocks in GrowthServiceContent.
 */
const growthServiceSectionSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  growthServiceId: { type: mongoose.Schema.Types.Mixed, required: true },
  /** Stable key items reference (e.g. "services", "deliverables", "faq"). */
  sectionKey: { type: String, required: true, trim: true },
  renderer: {
    type: String,
    enum: ['grid', 'timeline', 'showcase', 'format-panels', 'case-study', 'faq', 'article'],
    default: 'grid',
  },
  eyebrow: { type: String, trim: true, default: '' },
  title: { type: String, trim: true, default: '' },
  description: { type: String, default: '' },
  /** "tint" is the site's alternating soft-grey section break. */
  tone: { type: String, enum: ['page', 'tint'], default: 'page' },
  /** Grid column count — matches FeatureGrid's supported values. */
  columns: { type: Number, enum: [2, 3, 4, 6], default: 3 },
  /** "row" = icon beside the copy, "stack" = icon above centred copy. */
  layout: { type: String, enum: ['row', 'stack'], default: 'row' },
  /** Tighter type + padding, used by the six-across bands. */
  compact: { type: Boolean, default: false },
  /** FAQ accordion treatment — "marked" adds the brand bullet + chevron. */
  faqVariant: { type: String, enum: ['plain', 'marked'], default: 'plain' },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 1 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'growth_service_sections' });

module.exports = mongoose.model('GrowthServiceSection', growthServiceSectionSchema);
