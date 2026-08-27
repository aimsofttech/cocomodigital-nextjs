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

  // ── Media alt text ──────────────────────────────────────────────────────
  /* The hero mock, the case-study card and the closing illustration are drawn
   * as inline SVG rather than <img>, so they carry an accessible name instead
   * of an alt attribute. Blank means "decorative" and the graphic is hidden
   * from assistive tech entirely, which is the correct default for a mock. */
  heroMediaAlt: { type: String, trim: true, default: '' },
  caseMediaAlt: { type: String, trim: true, default: '' },
  closingMediaAlt: { type: String, trim: true, default: '' },

  // ── SEO / structured data ───────────────────────────────────────────────
  metaTitle: { type: String, trim: true, default: '' },
  metaDescription: { type: String, default: '' },
  /** Comma-separated focus keywords — the terms the page is written to rank for. */
  metaKeywords: { type: String, default: '' },
  /** Comma-separated supporting terms, appended after the focus keywords. */
  metaSecondaryKeywords: { type: String, default: '' },
  /** Absolute canonical URL. Falls back to pageUrl, then to /services/<slug>. */
  canonicalUrl: { type: String, trim: true, default: '' },
  /** Keep a page out of the index without unpublishing it. */
  noIndex: { type: Boolean, default: false },
  schemaServiceType: { type: String, trim: true, default: '' },
  schemaDescription: { type: String, default: '' },

  // ── Open Graph (Facebook, LinkedIn, WhatsApp) ───────────────────────────
  /* All optional: an empty field inherits the matching meta* value, and an
   * empty ogImage falls back to the generated card at
   * /services/<slug>/opengraph-image — so a page always shares with a real
   * picture even when nothing here is filled in. */
  ogTitle: { type: String, trim: true, default: '' },
  ogDescription: { type: String, default: '' },
  ogType: { type: String, enum: ['website', 'article'], default: 'website' },
  ogImage: { type: String, trim: true, default: '' },
  ogImageAlt: { type: String, trim: true, default: '' },
  ogImageWidth: { type: Number, default: 1200 },
  ogImageHeight: { type: Number, default: 630 },
  ogImageType: { type: String, trim: true, default: 'image/png' },

  // ── Twitter / X card ────────────────────────────────────────────────────
  twitterCard: {
    type: String,
    enum: ['summary_large_image', 'summary'],
    default: 'summary_large_image',
  },
  twitterTitle: { type: String, trim: true, default: '' },
  twitterDescription: { type: String, default: '' },
  twitterImage: { type: String, trim: true, default: '' },
  twitterImageAlt: { type: String, trim: true, default: '' },

  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 1 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'growth_services' });

module.exports = mongoose.model('GrowthService', growthServiceSchema);
