const mongoose = require('mongoose');
const PodcastPage = require('../../models/PodcastPage');
const PodcastStat = require('../../models/PodcastStat');
const PodcastCard = require('../../models/PodcastCard');
const PodcastStage = require('../../models/PodcastStage');
const PodcastShot = require('../../models/PodcastShot');
const PodcastFaq = require('../../models/PodcastFaq');
const PodcastCta = require('../../models/PodcastCta');
const { buildS3Url } = require('../../utils/s3Upload');

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

/* Media is stored as the S3 object key — "podcast/stages/123_align.svg" — not
 * as a full URL, so the bucket or CDN in front of it can change without a
 * migration. The website is handed the resolved address instead of having to
 * know any of that. A path that starts with "/" is a file shipped inside the
 * website's own /public folder and is passed through untouched. */
const mediaUrl = (value) => buildS3Url(value || '');

/* A YouTube id inside any of the shapes a link can be copied in — watch,
 * embed, shorts, live, youtu.be, with or without -nocookie. Kept in step with
 * app/web/src/lib/videoUrl.ts, which does the same job for react-player. */
const YOUTUBE_ID = /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

/**
 * Decide what the website plays, from an uploaded file and/or a pasted URL.
 *
 * Returns { videoId, videoSrc, poster } with at most one of the first two
 * set: `videoId` is a YouTube id the page renders through its lightweight
 * click-to-play facade, `videoSrc` is a file the page hands to a <video>.
 *
 * ORDER: an uploaded file beats a pasted URL. Uploading is the more
 * deliberate act — someone who has just put a file on S3 means to use it —
 * and leaving a stale URL in the other box should not silently win. The admin
 * form clears one when you switch to the other, so this is a safety net for
 * records written before that existed or through the API directly.
 *
 * A YouTube link becomes an ID rather than a source, on purpose: the facade
 * loads a still and mounts the iframe on click, where a <video> pointed at a
 * YouTube watch page would simply fail. Everything else — Vimeo, a direct
 * .mp4, a CDN link — passes through as a source.
 *
 * THE POSTER IS DERIVED, NEVER UPLOADED. Asking an editor for a still as well
 * as a video is asking for the same thing twice, and the two drift: someone
 * swaps the video and the old frame stays. YouTube already publishes a
 * thumbnail per id, and a file plays its own first frame, so neither case
 * needs one. `hqdefault` rather than `maxresdefault` because hqdefault exists
 * for every video ever uploaded while maxresdefault 404s on anything that was
 * never available in HD — a broken image is a worse trade than a softer one,
 * and at this frame size the difference is barely visible.
 */
const youtubeStill = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

const resolveVideo = (uploadedKey, url) => {
  if (uploadedKey) {
    return { videoId: null, videoSrc: mediaUrl(uploadedKey), poster: '' };
  }

  const trimmed = String(url || '').trim();
  if (!trimmed) return { videoId: null, videoSrc: null, poster: '' };

  const match = trimmed.match(YOUTUBE_ID);
  if (match) {
    return { videoId: match[1], videoSrc: null, poster: youtubeStill(match[1]) };
  }

  return { videoId: null, videoSrc: trimmed, poster: '' };
};

/** Split a comma-separated field into a trimmed, non-empty list. */
const toCsvList = (value) =>
  String(value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

const sortByOrder = { displayOrder: 1, createdAt: 1 };

/** Rows of one band, in display order. */
const bySection = (rows, key) => rows.filter((r) => r.sectionKey === key);

/* `id` is included on every row so the website can offer an editor a direct
 * link to that specific record in the admin. These are content ids, carry
 * nothing sensitive, and are only actionable behind the admin's own auth. */
const statOut = (s) => ({
  id: s._id,
  value: s.value || '',
  label: s.label || '',
  description: s.description || '',
});

const cardOut = (c) => ({
  id: c._id,
  image: mediaUrl(c.image),
  imageAlt: c.imageAlt || '',
  icon: c.icon || '',
  step: c.step || '',
  title: c.title || '',
  body: c.body || '',
  meta: c.meta || '',
  points: toLines(c.points),
});

const ctaOut = (c) => ({
  id: c._id,
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
        /* The hero is still YouTube-id only; the key is present so one type
           describes both bands and the renderer needs no special case. */
        videoSrc: null,
        poster: mediaUrl(doc.heroPoster),
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
      backgroundImage: mediaUrl(doc.problemBgImage),
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
      /* Same shape the hero's media uses, so the page can hand it to the
         very same component rather than growing a second player. */
      media: {
        ...resolveVideo(doc.notForVideoFile, doc.notForVideoUrl),
        /* No alt and no play label. The still sits inside a button the
           renderer names for itself, and one video entered one way is the
           whole of what this band asks an editor for. */
        alt: '',
        playLabel: '',
      },
    },
    founder: {
      eyebrow: doc.founderEyebrow || '',
      name: doc.founderName || '',
      role: doc.founderRole || '',
      portrait: mediaUrl(doc.founderPortrait),
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
        id: s._id,
        diagramKey: s.diagramKey || 'none',
        image: mediaUrl(s.image),
        imageAlt: s.imageAlt || '',
        step: s.step || '',
        name: s.name || '',
        promise: s.promise || '',
        detail: s.detail || '',
        capabilities: toLines(s.capabilities),
      })),
      studioShots: shots.map((s) => ({
        id: s._id,
        image: mediaUrl(s.image),
        alt: s.alt || '',
        caption: s.caption || '',
        wide: !!s.wide,
      })),
      faqs: faqs.map((f) => ({ id: f._id, question: f.question, answer: f.answer })),
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
