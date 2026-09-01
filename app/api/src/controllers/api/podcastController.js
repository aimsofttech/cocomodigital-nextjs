const mongoose = require('mongoose');
const PodcastPage = require('../../models/PodcastPage');
const PodcastStat = require('../../models/PodcastStat');
const PodcastCard = require('../../models/PodcastCard');
const PodcastStage = require('../../models/PodcastStage');
const PodcastShot = require('../../models/PodcastShot');
const PodcastFaq = require('../../models/PodcastFaq');
const PodcastCta = require('../../models/PodcastCta');

/* Public read API for the podcast money page.
 *
 * `show` returns one fully-assembled page in a single round-trip: the parent
 * record with its multi-line text fields already split into arrays, plus every
 * active child row grouped the way the renderer consumes it. The web app then
 * renders section by section without any further queries or client-side joins.
 */

// FK fields are Mixed: seeded rows hold ObjectIds while admin-created rows
// persist plain strings, so every child lookup must match both representations.
const idVariants = (id) => {
  const s = String(id);
  return mongoose.Types.ObjectId.isValid(s) ? [s, new mongoose.Types.ObjectId(s)] : [s];
};

/** Split newline-separated admin text into a trimmed, non-empty list. */
const toLines = (value) =>
  String(value ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

/** Split a comma-separated field into a trimmed, non-empty list. */
const toCsvList = (value) =>
  String(value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

const sortByOrder = { displayOrder: 1, createdAt: 1 };

/** Rows of one band, in display order. */
const bySection = (rows, key) => rows.filter((r) => r.sectionKey === key);

const statOut = (s) => ({
  value: s.value || '',
  label: s.label || '',
  description: s.description || '',
});

const cardOut = (c) => ({
  icon: c.icon || '',
  step: c.step || '',
  title: c.title || '',
  body: c.body || '',
  meta: c.meta || '',
  points: toLines(c.points),
});

const ctaOut = (c) => ({
  label: c.label || '',
  href: c.href || '',
  variant: c.variant || 'primary',
});

/** Shape the parent document into the payload the web renderer consumes. */
const buildPage = (doc) => {
  const path = doc.pagePath || (doc.slug ? `/${doc.slug}` : '');
  return {
    id: doc._id,
    slug: doc.slug,
    name: doc.name,
    path,
    pageUrl: doc.pageUrl || '',
    hero: {
      eyebrow: doc.heroEyebrow || '',
      title: doc.heroTitle || doc.name || '',
      sub: doc.heroSub || '',
      priceBadge: doc.heroPriceBadge || '',
      priceBadgeIcon: doc.heroPriceBadgeIcon || '',
      hoursBadge: doc.heroHoursBadge || '',
      hoursBadgeIcon: doc.heroHoursBadgeIcon || '',
      media: {
        /* Null rather than "" so the renderer's "is there a video?" check
           stays a plain truthiness test, matching what it did when the id
           was a hand-edited constant. */
        videoId: doc.heroVideoId || null,
        poster: doc.heroPoster || '',
        alt: doc.heroPosterAlt || '',
        playLabel: doc.heroPlayLabel || '',
      },
    },
    credentials: {
      signature: doc.signatureLine || '',
      caption: doc.trustCaption || '',
    },
    problem: {
      title: doc.problemTitle || '',
      lead: doc.problemLead || '',
      backgroundImage: doc.problemBgImage || '',
    },
    method: {
      eyebrow: doc.methodEyebrow || '',
      title: doc.methodTitle || '',
      lead: doc.methodLead || '',
    },
    services: {
      eyebrow: doc.servicesEyebrow || '',
      title: doc.servicesTitle || '',
      lead: doc.servicesLead || '',
    },
    audience: {
      eyebrow: doc.audienceEyebrow || '',
      title: doc.audienceTitle || '',
    },
    pricing: {
      eyebrow: doc.pricingEyebrow || '',
      heading: doc.pricingHeading || '',
      prefix: doc.pricingPrefix || '',
      floor: doc.pricingFloor || '',
      unit: doc.pricingUnit || '',
      lead: doc.pricingLead || '',
      includedTitle: doc.pricingIncludedTitle || '',
      included: toLines(doc.pricingIncluded),
      scalesTitle: doc.pricingScalesTitle || '',
      scales: toLines(doc.pricingScales),
      note: doc.pricingNote || '',
    },
    month: {
      eyebrow: doc.monthEyebrow || '',
      title: doc.monthTitle || '',
      lead: doc.monthLead || '',
      tableNote: doc.monthTableNote || '',
      columns: {
        deliverable: doc.monthColDeliverable || 'Deliverable',
        volume: doc.monthColVolume || 'Volume',
        detail: doc.monthColDetail || 'Detail',
      },
    },
    notFor: {
      eyebrow: doc.notForEyebrow || '',
      heading: doc.notForHeading || '',
      lead: doc.notForLead || '',
      items: toLines(doc.notForItems),
      footnote: doc.notForFootnote || '',
    },
    founder: {
      eyebrow: doc.founderEyebrow || '',
      name: doc.founderName || '',
      role: doc.founderRole || '',
      portrait: doc.founderPortrait || '',
      portraitAlt: doc.founderPortraitAlt || '',
      lines: toLines(doc.founderLines),
    },
    operations: {
      eyebrow: doc.opsEyebrow || '',
      title: doc.opsTitle || '',
    },
    studio: {
      eyebrow: doc.studioEyebrow || '',
      heading: doc.studioHeading || '',
      body: doc.studioBody || '',
      scaleNote: doc.studioScaleNote || '',
    },
    process: {
      eyebrow: doc.processEyebrow || '',
      title: doc.processTitle || '',
    },
    proof: {
      eyebrow: doc.proofEyebrow || '',
      title: doc.proofTitle || '',
      paragraphs: toLines(doc.proofParagraphs),
    },
    faq: {
      eyebrow: doc.faqEyebrow || '',
      title: doc.faqTitle || '',
    },
    final: {
      title: doc.finalTitle || '',
      lead: doc.finalLead || '',
      points: toLines(doc.finalPoints),
    },
    auditForm: {
      nameLabel: doc.auditNameLabel || 'Name',
      namePlaceholder: doc.auditNamePlaceholder || '',
      emailLabel: doc.auditEmailLabel || 'Email',
      emailPlaceholder: doc.auditEmailPlaceholder || '',
      showLabel: doc.auditShowLabel || 'Show link',
      showPlaceholder: doc.auditShowPlaceholder || '',
      submitLabel: doc.auditSubmitLabel || '',
      submittingLabel: doc.auditSubmittingLabel || 'Sending…',
      note: doc.auditNote || '',
      doneTitle: doc.auditDoneTitle || '',
      doneBody: doc.auditDoneBody || '',
      contactEmail: doc.auditContactEmail || '',
      errorFallback: doc.auditErrorFallback || '',
      leadTag: doc.auditLeadTag || '',
    },
    /* Every optional field is resolved here rather than in the web app, so the
       og/twitter copy inherits the meta copy and the canonical falls back
       through pageUrl to the page path — one fallback chain, one place. */
    seo: {
      title: doc.metaTitle || doc.name,
      description: doc.metaDescription || '',
      keywords: toCsvList(doc.metaKeywords),
      secondaryKeywords: toCsvList(doc.metaSecondaryKeywords),
      canonicalUrl: doc.canonicalUrl || doc.pageUrl || path,
      noIndex: !!doc.noIndex,
      schema: {
        name: doc.schemaName || doc.metaTitle || doc.name,
        serviceType: doc.schemaServiceType || '',
        description: doc.schemaDescription || doc.metaDescription || '',
        areaServed: toLines(doc.schemaAreaServed),
        audienceType: doc.schemaAudienceType || '',
        offerCatalogName: doc.schemaOfferCatalogName || '',
        breadcrumbLabel: doc.breadcrumbLabel || doc.name,
      },
      /* The og/twitter title and description are returned RAW — empty when the
         editor has not overridden them — rather than pre-filled from the meta
         copy. The web app's buildMetadata already owns that fallback chain, and
         its version is not the same: it appends " | Cocoma Digital" to the
         shared title and points the X card at the og image. Resolving them here
         too would win that race and silently change the tags the page has been
         publishing. Fill one in and it overrides; leave it blank and the site's
         own chain applies. */
      openGraph: {
        title: doc.ogTitle || '',
        description: doc.ogDescription || '',
        type: doc.ogType || 'website',
        image: doc.ogImage || '',
        imageAlt: doc.ogImageAlt || '',
        imageWidth: doc.ogImageWidth || 1200,
        imageHeight: doc.ogImageHeight || 630,
        imageType: doc.ogImageType || 'image/png',
      },
      twitter: {
        card: doc.twitterCard || 'summary_large_image',
        title: doc.twitterTitle || '',
        description: doc.twitterDescription || '',
        image: doc.twitterImage || '',
        imageAlt: doc.twitterImageAlt || doc.ogImageAlt || '',
      },
    },
    /* Copy printed onto the generated share card. Each field falls back to the
       matching meta value so a half-filled record still produces a real card. */
    ogCard: {
      eyebrow: doc.ogCardEyebrow || '',
      title: doc.ogCardTitle || doc.metaTitle || doc.name,
      description: doc.ogCardDescription || doc.metaDescription || '',
      badgeOne: doc.ogCardBadgeOne || '',
      badgeTwo: doc.ogCardBadgeTwo || '',
    },
    displayOrder: doc.displayOrder ?? 0,
  };
};

/**
 * GET /api/podcast-pages
 * Summary list of every published podcast page — enough for nav links, the
 * sitemap and static params, without the section payload.
 */
const index = async (req, res) => {
  const pages = await PodcastPage.find({ status: 1 })
    .sort({ displayOrder: 1, createdAt: 1 })
    .lean();

  res.json({
    status: 'success',
    data: pages.map((p) => ({
      id: p._id,
      slug: p.slug,
      name: p.name,
      path: p.pagePath || (p.slug ? `/${p.slug}` : ''),
      pageUrl: p.pageUrl || '',
      metaTitle: p.metaTitle || p.name,
      metaDescription: p.metaDescription || '',
      canonicalUrl: p.canonicalUrl || p.pageUrl || '',
      updatedAt: p.updatedAt || null,
      displayOrder: p.displayOrder ?? 0,
    })),
  });
};

/**
 * GET /api/podcast-pages/:slug
 * One fully-assembled page. 404s when the slug is unknown or the page is
 * unpublished, which the web client treats as "fall back to the shipped copy".
 */
const show = async (req, res) => {
  const { slug } = req.params;
  const doc = await PodcastPage.findOne({ slug, status: 1 }).lean();
  if (!doc) {
    return res.status(404).json({ status: 'error', message: 'Podcast page not found' });
  }

  const ids = idVariants(doc._id);
  const scope = { podcastPageId: { $in: ids }, status: 1 };

  const [stats, cards, stages, shots, faqs, ctas] = await Promise.all([
    PodcastStat.find(scope).sort(sortByOrder).lean(),
    PodcastCard.find(scope).sort(sortByOrder).lean(),
    PodcastStage.find(scope).sort(sortByOrder).lean(),
    PodcastShot.find(scope).sort(sortByOrder).lean(),
    PodcastFaq.find(scope).sort(sortByOrder).lean(),
    PodcastCta.find(scope).sort(sortByOrder).lean(),
  ]);

  res.json({
    status: 'success',
    data: {
      ...buildPage(doc),
      // Grouped by the band that draws them so the renderer never filters.
      trustStats: bySection(stats, 'trust').map(statOut),
      problemStats: bySection(stats, 'problem').map(statOut),
      scaleStats: bySection(stats, 'scale').map(statOut),
      serviceCards: bySection(cards, 'services').map(cardOut),
      audienceCards: bySection(cards, 'audiences').map(cardOut),
      operationCards: bySection(cards, 'operations').map(cardOut),
      processSteps: bySection(cards, 'process').map(cardOut),
      monthRows: bySection(cards, 'month').map(cardOut),
      stages: stages.map((s) => ({
        diagramKey: s.diagramKey || 'none',
        step: s.step || '',
        name: s.name || '',
        promise: s.promise || '',
        detail: s.detail || '',
        capabilities: toLines(s.capabilities),
      })),
      studioShots: shots.map((s) => ({
        image: s.image || '',
        alt: s.alt || '',
        caption: s.caption || '',
        wide: !!s.wide,
      })),
      faqs: faqs.map((f) => ({ question: f.question, answer: f.answer })),
      ctas: {
        hero: ctas.filter((c) => c.placement === 'hero').map(ctaOut),
        pricing: ctas.filter((c) => c.placement === 'pricing').map(ctaOut),
        founder: ctas.filter((c) => c.placement === 'founder').map(ctaOut),
        proof: ctas.filter((c) => c.placement === 'proof').map(ctaOut),
      },
    },
  });
};

module.exports = { index, show };
