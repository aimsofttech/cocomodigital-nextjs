const mongoose = require('mongoose');

/* Parent record for a growth landing page (YouTube growth, social video
 * editing, podcast editing). Everything that appears exactly once on the page
 * lives here; repeating blocks live in the sibling GrowthService* collections,
 * each scoped by `growthServiceId`.
 *
 * Multi-line copy is stored as plain text with one entry per line rather than
 * as an array, so the admin can edit it in an ordinary <textarea> (the panel
 * has no repeatable-field control). The public controller splits these back
 * into arrays — see controllers/api/growthServiceController.js.
 */
const growthServiceSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  name: { type: String, required: true, trim: true },
  /** Canonical page URL, used for the schema.org Service block. */
  pageUrl: { type: String, trim: true, default: '' },

  // ── Hero ────────────────────────────────────────────────────────────────
  heroBadgeIcon: { type: String, trim: true, default: '' },
  heroBadgeLabel: { type: String, trim: true, default: '' },
  /** One headline line per row. Wrap a line in *asterisks* to render it with
   *  the brand marker highlight (e.g. "*YouTube Growth*"). */
  heroHeadline: { type: String, default: '' },
  /** One paragraph per row. */
  heroParagraphs: { type: String, default: '' },
  /** Comma-separated initials behind the stacked avatar placeholders. */
  heroTrustInitials: { type: String, trim: true, default: '' },
  heroTrustLabel: { type: String, trim: true, default: '' },
  /** Which built-in dashboard mock renders beside the hero copy. */
  dashboardKey: { type: String, enum: ['channel', 'social', 'podcast', 'none'], default: 'channel' },

  // ── Stats band ──────────────────────────────────────────────────────────
  /** Accessible label for the KPI row under the hero. */
  statsLabel: { type: String, trim: true, default: '' },

  // ── Case study ──────────────────────────────────────────────────────────
  caseStudyTitle: { type: String, trim: true, default: '' },
  caseStudySubtitle: { type: String, trim: true, default: '' },
  /** One paragraph per row. */
  caseStudyParagraphs: { type: String, default: '' },
  caseMediaLineOne: { type: String, trim: true, default: '' },
  caseMediaLineTwo: { type: String, trim: true, default: '' },
  /** Which of the two media lines carries the brand colour. */
  caseMediaAccentLine: { type: String, enum: ['one', 'two', 'none'], default: 'two' },
  caseMediaSubtitle: { type: String, trim: true, default: '' },
  caseMediaBadge: { type: String, enum: ['youtube', 'play', 'mic', 'none'], default: 'none' },

  // ── Closing CTA band ────────────────────────────────────────────────────
  /** One line per row; every line after the first renders on its own line. */
  closingTitle: { type: String, default: '' },
  closingDescription: { type: String, default: '' },
  closingIllustrationKey: { type: String, enum: ['youtube', 'social', 'podcast', 'none'], default: 'youtube' },

  // ── SEO / structured data ───────────────────────────────────────────────
  metaTitle: { type: String, trim: true, default: '' },
  metaDescription: { type: String, default: '' },
  /** Comma-separated keywords. */
  metaKeywords: { type: String, default: '' },
  schemaServiceType: { type: String, trim: true, default: '' },
  schemaDescription: { type: String, default: '' },

  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 1 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'growth_services' });

module.exports = mongoose.model('GrowthService', growthServiceSchema);
