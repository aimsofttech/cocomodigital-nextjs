const mongoose = require('mongoose');
const GrowthService = require('../../models/GrowthService');
const GrowthServiceSection = require('../../models/GrowthServiceSection');
const GrowthServiceFeature = require('../../models/GrowthServiceFeature');
const GrowthServiceStat = require('../../models/GrowthServiceStat');
const GrowthServiceShowcase = require('../../models/GrowthServiceShowcase');
const GrowthServiceCaseMetric = require('../../models/GrowthServiceCaseMetric');
const GrowthServiceFaq = require('../../models/GrowthServiceFaq');
const GrowthServiceCta = require('../../models/GrowthServiceCta');

/* Public read API for the growth landing pages.
 *
 * `show` returns one fully-assembled page in a single round-trip: the parent
 * record with its multi-line text fields already split into arrays, plus every
 * active child row grouped the way the renderer consumes it. The web app then
 * maps section → items without any further queries or client-side joins.
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

/* Headline lines are authored one per row, with *asterisks* marking the line
 * that carries the brand marker highlight. */
const toHeadline = (value) =>
  toLines(value).map((line) => {
    const accent = /^\*.*\*$/.test(line);
    return { text: accent ? line.slice(1, -1).trim() : line, accent };
  });

const sortByOrder = { displayOrder: 1, createdAt: 1 };

// Strip audit/internal fields from a child row before it goes over the wire.
const clean = (doc) => {
  const { userId, __v, createdAt, updatedAt, ...rest } = doc;
  return rest;
};

/** Group rows by their `sectionKey` so the renderer can look items up by section. */
const groupBySection = (rows) => {
  const map = {};
  rows.forEach((row) => {
    const key = row.sectionKey || '';
    if (!map[key]) map[key] = [];
    map[key].push(row);
  });
  return map;
};

/** Shape the parent document into the payload the web renderer consumes. */
const buildService = (doc) => ({
  id: doc._id,
  slug: doc.slug,
  name: doc.name,
  pageUrl: doc.pageUrl || '',
  hero: {
    badge: { icon: doc.heroBadgeIcon || '', label: doc.heroBadgeLabel || '' },
    headline: toHeadline(doc.heroHeadline),
    paragraphs: toLines(doc.heroParagraphs),
    trust: {
      initials: toCsvList(doc.heroTrustInitials),
      label: doc.heroTrustLabel || '',
    },
    dashboardKey: doc.dashboardKey || 'none',
  },
  statsLabel: doc.statsLabel || '',
  caseStudy: {
    title: doc.caseStudyTitle || '',
    subtitle: doc.caseStudySubtitle || '',
    paragraphs: toLines(doc.caseStudyParagraphs),
    media: {
      lineOne: doc.caseMediaLineOne || '',
      lineTwo: doc.caseMediaLineTwo || '',
      accentLine: doc.caseMediaAccentLine || 'none',
      subtitle: doc.caseMediaSubtitle || '',
      badge: doc.caseMediaBadge || 'none',
    },
  },
  closing: {
    title: toLines(doc.closingTitle),
    description: doc.closingDescription || '',
    illustrationKey: doc.closingIllustrationKey || 'none',
  },
  seo: {
    title: doc.metaTitle || doc.name,
    description: doc.metaDescription || '',
    keywords: toCsvList(doc.metaKeywords),
    serviceType: doc.schemaServiceType || '',
    schemaDescription: doc.schemaDescription || doc.metaDescription || '',
  },
  displayOrder: doc.displayOrder ?? 0,
});

/**
 * GET /api/growth-services
 * Summary list of every published growth page — enough for nav links, the
 * sitemap and generateStaticParams, without the section payload.
 */
const index = async (req, res) => {
  const services = await GrowthService.find({ status: 1 })
    .sort({ displayOrder: 1, createdAt: 1 })
    .lean();

  res.json({
    status: 'success',
    data: services.map((s) => ({
      id: s._id,
      slug: s.slug,
      name: s.name,
      pageUrl: s.pageUrl || '',
      metaTitle: s.metaTitle || s.name,
      metaDescription: s.metaDescription || '',
      displayOrder: s.displayOrder ?? 0,
    })),
  });
};

/**
 * GET /api/growth-services/:slug
 * One fully-assembled page. 404s when the slug is unknown or the page is
 * unpublished, which the web client already treats as "render nothing".
 */
const show = async (req, res) => {
  const { slug } = req.params;
  const doc = await GrowthService.findOne({ slug, status: 1 }).lean();
  if (!doc) {
    return res.status(404).json({ status: 'error', message: 'Growth service not found' });
  }

  const ids = idVariants(doc._id);
  const scope = { growthServiceId: { $in: ids }, status: 1 };

  const [sections, features, stats, showcases, caseMetrics, faqs, ctas] = await Promise.all([
    GrowthServiceSection.find(scope).sort(sortByOrder).lean(),
    GrowthServiceFeature.find(scope).sort(sortByOrder).lean(),
    GrowthServiceStat.find(scope).sort(sortByOrder).lean(),
    GrowthServiceShowcase.find(scope).sort(sortByOrder).lean(),
    GrowthServiceCaseMetric.find(scope).sort(sortByOrder).lean(),
    GrowthServiceFaq.find(scope).sort(sortByOrder).lean(),
    GrowthServiceCta.find(scope).sort(sortByOrder).lean(),
  ]);

  res.json({
    status: 'success',
    data: {
      ...buildService(doc),
      sections: sections.map((s) => ({
        key: s.sectionKey,
        renderer: s.renderer || 'grid',
        eyebrow: s.eyebrow || '',
        title: s.title || '',
        description: s.description || '',
        tone: s.tone || 'page',
        columns: s.columns || 3,
        layout: s.layout || 'row',
        compact: !!s.compact,
        faqVariant: s.faqVariant || 'plain',
      })),
      // Keyed by section so the renderer resolves a section's items with a
      // lookup instead of filtering the whole list per band.
      features: groupBySection(features.map(clean)),
      showcases: groupBySection(
        showcases.map((s) => ({ ...clean(s), points: toLines(s.points) }))
      ),
      stats: stats.map((s) => ({ icon: s.icon || '', value: s.value, label: s.label })),
      caseMetrics: caseMetrics.map((m) => ({
        label: m.label,
        icon: m.icon || '',
        before: m.before || '',
        after: m.after || '',
        growth: m.growth || '',
      })),
      faqs: faqs.map((f) => ({ question: f.question, answer: f.answer })),
      ctas: {
        hero: ctas.filter((c) => c.placement === 'hero').map(clean),
        closing: ctas.filter((c) => c.placement === 'closing').map(clean),
      },
    },
  });
};

module.exports = { index, show };
