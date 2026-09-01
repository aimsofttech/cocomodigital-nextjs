const mongoose = require('mongoose');

/* Parent record for the podcast money page at
 * /podcast-video-editing-marketing-services.
 *
 * Everything that appears exactly once on the page lives here; repeating
 * blocks live in the sibling Podcast* collections, each scoped by
 * `podcastPageId`. Same shape as the GrowthService module so the admin's
 * shared CrudListPage / useCrud stack drives both without bespoke wiring.
 *
 * Multi-line copy is stored as plain text with one entry per line rather than
 * as an array, so the admin can edit it in an ordinary <textarea> (the panel
 * has no repeatable-field control). The public controller splits these back
 * into arrays — see controllers/api/podcastController.js.
 */
const podcastPageSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  name: { type: String, required: true, trim: true },
  /** Path this record renders at, e.g. /podcast-video-editing-marketing-services. */
  pagePath: { type: String, trim: true, default: '' },
  /** Absolute canonical page URL, used for the schema.org Service block. */
  pageUrl: { type: String, trim: true, default: '' },

  // ── Hero ────────────────────────────────────────────────────────────────
  heroEyebrow: { type: String, trim: true, default: '' },
  heroTitle: { type: String, trim: true, default: '' },
  heroSub: { type: String, default: '' },
  heroPriceBadge: { type: String, trim: true, default: '' },
  heroPriceBadgeIcon: { type: String, trim: true, default: 'dollar' },
  heroHoursBadge: { type: String, trim: true, default: '' },
  heroHoursBadgeIcon: { type: String, trim: true, default: 'clock' },
  /* Hero media. With no videoId the poster renders as a plain photograph and
   * no play button is drawn — a control that does nothing is worse than none. */
  heroVideoId: { type: String, trim: true, default: '' },
  heroPoster: { type: String, trim: true, default: '' },
  heroPosterAlt: { type: String, default: '' },
  heroPlayLabel: { type: String, trim: true, default: '' },

  // ── Credentials band ────────────────────────────────────────────────────
  signatureLine: { type: String, default: '' },
  trustCaption: { type: String, default: '' },

  // ── Problem band ────────────────────────────────────────────────────────
  problemTitle: { type: String, trim: true, default: '' },
  problemLead: { type: String, default: '' },
  /** Decorative backdrop behind the problem copy — rendered aria-hidden. */
  problemBgImage: { type: String, trim: true, default: '' },

  // ── Signal-to-Scale method band ─────────────────────────────────────────
  methodEyebrow: { type: String, trim: true, default: '' },
  methodTitle: { type: String, trim: true, default: '' },
  methodLead: { type: String, default: '' },

  // ── Services band ───────────────────────────────────────────────────────
  servicesEyebrow: { type: String, trim: true, default: '' },
  servicesTitle: { type: String, trim: true, default: '' },
  servicesLead: { type: String, default: '' },

  // ── Audience band ───────────────────────────────────────────────────────
  audienceEyebrow: { type: String, trim: true, default: '' },
  audienceTitle: { type: String, trim: true, default: '' },

  // ── Pricing band ────────────────────────────────────────────────────────
  pricingEyebrow: { type: String, trim: true, default: '' },
  pricingHeading: { type: String, trim: true, default: '' },
  pricingPrefix: { type: String, trim: true, default: '' },
  pricingFloor: { type: String, trim: true, default: '' },
  pricingUnit: { type: String, trim: true, default: '' },
  pricingLead: { type: String, default: '' },
  pricingIncludedTitle: { type: String, trim: true, default: '' },
  /** One bullet per row. */
  pricingIncluded: { type: String, default: '' },
  pricingScalesTitle: { type: String, trim: true, default: '' },
  /** One bullet per row. */
  pricingScales: { type: String, default: '' },
  pricingNote: { type: String, default: '' },

  // ── Month table ─────────────────────────────────────────────────────────
  monthEyebrow: { type: String, trim: true, default: '' },
  monthTitle: { type: String, trim: true, default: '' },
  monthLead: { type: String, default: '' },
  monthTableNote: { type: String, default: '' },
  monthColDeliverable: { type: String, trim: true, default: 'Deliverable' },
  monthColVolume: { type: String, trim: true, default: 'Volume' },
  monthColDetail: { type: String, trim: true, default: 'Detail' },

  // ── "When we are the wrong call" band ───────────────────────────────────
  notForEyebrow: { type: String, trim: true, default: '' },
  notForHeading: { type: String, trim: true, default: '' },
  notForLead: { type: String, default: '' },
  /** One disqualifier per row. */
  notForItems: { type: String, default: '' },
  notForFootnote: { type: String, default: '' },

  // ── Founder note ────────────────────────────────────────────────────────
  founderEyebrow: { type: String, trim: true, default: '' },
  founderName: { type: String, trim: true, default: '' },
  founderRole: { type: String, trim: true, default: '' },
  founderPortrait: { type: String, trim: true, default: '' },
  founderPortraitAlt: { type: String, default: '' },
  /** One paragraph per row. */
  founderLines: { type: String, default: '' },

  // ── Working across time zones band ──────────────────────────────────────
  opsEyebrow: { type: String, trim: true, default: '' },
  opsTitle: { type: String, trim: true, default: '' },

  // ── Studio strip ────────────────────────────────────────────────────────
  studioEyebrow: { type: String, trim: true, default: '' },
  studioHeading: { type: String, trim: true, default: '' },
  studioBody: { type: String, default: '' },
  studioScaleNote: { type: String, default: '' },

  // ── Process band ────────────────────────────────────────────────────────
  processEyebrow: { type: String, trim: true, default: '' },
  processTitle: { type: String, trim: true, default: '' },

  // ── Proof band ──────────────────────────────────────────────────────────
  proofEyebrow: { type: String, trim: true, default: '' },
  proofTitle: { type: String, trim: true, default: '' },
  /** One paragraph per row. */
  proofParagraphs: { type: String, default: '' },

  // ── FAQ band ────────────────────────────────────────────────────────────
  faqEyebrow: { type: String, trim: true, default: '' },
  faqTitle: { type: String, trim: true, default: '' },

  // ── Final CTA + audit form ──────────────────────────────────────────────
  finalTitle: { type: String, trim: true, default: '' },
  finalLead: { type: String, default: '' },
  /** One reassurance point per row. */
  finalPoints: { type: String, default: '' },
  auditNameLabel: { type: String, trim: true, default: 'Name' },
  auditNamePlaceholder: { type: String, trim: true, default: '' },
  auditEmailLabel: { type: String, trim: true, default: 'Email' },
  auditEmailPlaceholder: { type: String, trim: true, default: '' },
  auditShowLabel: { type: String, trim: true, default: 'Show link' },
  auditShowPlaceholder: { type: String, trim: true, default: '' },
  auditSubmitLabel: { type: String, trim: true, default: '' },
  auditSubmittingLabel: { type: String, trim: true, default: 'Sending…' },
  auditNote: { type: String, default: '' },
  auditDoneTitle: { type: String, trim: true, default: '' },
  auditDoneBody: { type: String, default: '' },
  /** Shown as a mailto link after the done-state body and inside the error. */
  auditContactEmail: { type: String, trim: true, default: '' },
  auditErrorFallback: { type: String, default: '' },
  /** Folded into the lead message as "[Type: …]" so leads stay filterable. */
  auditLeadTag: { type: String, trim: true, default: 'Podcast audit request' },

  // ── SEO / structured data ───────────────────────────────────────────────
  metaTitle: { type: String, trim: true, default: '' },
  metaDescription: { type: String, default: '' },
  /** Comma-separated focus keywords — the terms the page is written to rank for. */
  metaKeywords: { type: String, default: '' },
  /** Comma-separated supporting terms, appended after the focus keywords. */
  metaSecondaryKeywords: { type: String, default: '' },
  /** Absolute canonical URL. Falls back to pageUrl, then to the page path. */
  canonicalUrl: { type: String, trim: true, default: '' },
  /** Keep the page out of the index without unpublishing it. */
  noIndex: { type: Boolean, default: false },
  schemaName: { type: String, trim: true, default: '' },
  schemaServiceType: { type: String, trim: true, default: '' },
  schemaDescription: { type: String, default: '' },
  /** One country per row, published as schema.org areaServed. */
  schemaAreaServed: { type: String, default: '' },
  schemaAudienceType: { type: String, default: '' },
  schemaOfferCatalogName: { type: String, trim: true, default: '' },
  /** Trailing crumb label in the BreadcrumbList. */
  breadcrumbLabel: { type: String, trim: true, default: '' },

  // ── Open Graph (Facebook, LinkedIn, WhatsApp) ───────────────────────────
  /* All optional: an empty field inherits the matching meta* value, and an
   * empty ogImage falls back to the card generated at
   * <page>/opengraph-image — so the page always shares with a real picture. */
  ogTitle: { type: String, trim: true, default: '' },
  ogDescription: { type: String, default: '' },
  ogType: { type: String, enum: ['website', 'article'], default: 'website' },
  ogImage: { type: String, trim: true, default: '' },
  ogImageAlt: { type: String, default: '' },
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
  twitterImageAlt: { type: String, default: '' },

  // ── Generated share card ────────────────────────────────────────────────
  /* Copy printed onto the next/og card served at <page>/opengraph-image.
   * Kept separate from the meta copy because the card is typeset — the
   * headline has to fit two lines at 82px, which the meta title does not. */
  ogCardEyebrow: { type: String, trim: true, default: '' },
  ogCardTitle: { type: String, trim: true, default: '' },
  ogCardDescription: { type: String, default: '' },
  ogCardBadgeOne: { type: String, trim: true, default: '' },
  ogCardBadgeTwo: { type: String, trim: true, default: '' },

  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 1 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'podcast_pages' });

module.exports = mongoose.model('PodcastPage', podcastPageSchema);
