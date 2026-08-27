const mongoose = require('mongoose');
const GrowthService = require('../../models/GrowthService');
const GrowthServiceSection = require('../../models/GrowthServiceSection');
const GrowthServiceFeature = require('../../models/GrowthServiceFeature');
const GrowthServiceStat = require('../../models/GrowthServiceStat');
const GrowthServiceShowcase = require('../../models/GrowthServiceShowcase');
const GrowthServiceCaseMetric = require('../../models/GrowthServiceCaseMetric');
const GrowthServiceFaq = require('../../models/GrowthServiceFaq');
const GrowthServiceCta = require('../../models/GrowthServiceCta');
const GrowthServiceContent = require('../../models/GrowthServiceContent');
const createCrudController = require('./crudFactory');
const { cascadeDelete } = require('./cascadeDelete');

/* Admin CRUD for the growth landing pages (YouTube growth, social media video
 * editing, podcast editing). One parent record per page plus seven child
 * collections, each scoped by `growthServiceId` so a list page can be filtered
 * to a single service with `?growthServiceId=…`.
 *
 * Every sub-resource is a plain crudFactory controller — index / show / store /
 * update / destroy / exportCsv / importCsv — so the admin panel's shared
 * CrudListPage + useCrud stack drives them without any bespoke wiring.
 */

// Every child collection, with the FK crudFactory and cascadeDelete scope by.
const CHILD_SPECS = [
  { model: GrowthServiceSection, fk: 'growthServiceId' },
  { model: GrowthServiceFeature, fk: 'growthServiceId' },
  { model: GrowthServiceStat, fk: 'growthServiceId' },
  { model: GrowthServiceShowcase, fk: 'growthServiceId' },
  { model: GrowthServiceCaseMetric, fk: 'growthServiceId' },
  { model: GrowthServiceFaq, fk: 'growthServiceId' },
  { model: GrowthServiceCta, fk: 'growthServiceId' },
  { model: GrowthServiceContent, fk: 'growthServiceId' },
];

// Resolve the parent service name onto every child row so the admin lists can
// show which page a record belongs to without a second request.
const SERVICE_LOOKUP = [{
  localField: 'growthServiceId',
  model: GrowthService,
  nameField: 'name',
  as: 'growthServiceName',
}];

const service = createCrudController(GrowthService, {
  searchFields: ['name', 'slug', 'metaTitle'],
  defaultSort: { displayOrder: 1, createdAt: -1 },
  slugSource: 'name',
});

const section = createCrudController(GrowthServiceSection, {
  searchFields: ['sectionKey', 'title', 'eyebrow'],
  defaultSort: { displayOrder: 1, createdAt: 1 },
  parentField: 'growthServiceId',
  filterFields: ['sectionKey', 'renderer'],
  lookups: SERVICE_LOOKUP,
  slugSource: 'title',
});

const feature = createCrudController(GrowthServiceFeature, {
  searchFields: ['title', 'description', 'sectionKey'],
  defaultSort: { displayOrder: 1, createdAt: 1 },
  parentField: 'growthServiceId',
  filterFields: ['sectionKey'],
  lookups: SERVICE_LOOKUP,
  slugSource: 'title',
});

const stat = createCrudController(GrowthServiceStat, {
  searchFields: ['label', 'value'],
  defaultSort: { displayOrder: 1, createdAt: 1 },
  parentField: 'growthServiceId',
  lookups: SERVICE_LOOKUP,
  slugSource: 'label',
});

const showcase = createCrudController(GrowthServiceShowcase, {
  searchFields: ['title', 'caption', 'sectionKey'],
  defaultSort: { displayOrder: 1, createdAt: 1 },
  parentField: 'growthServiceId',
  filterFields: ['sectionKey'],
  lookups: SERVICE_LOOKUP,
  slugSource: 'title',
});

const caseMetric = createCrudController(GrowthServiceCaseMetric, {
  searchFields: ['label'],
  defaultSort: { displayOrder: 1, createdAt: 1 },
  parentField: 'growthServiceId',
  lookups: SERVICE_LOOKUP,
  slugSource: 'label',
});

const faq = createCrudController(GrowthServiceFaq, {
  searchFields: ['question', 'answer'],
  defaultSort: { displayOrder: 1, createdAt: 1 },
  parentField: 'growthServiceId',
  lookups: SERVICE_LOOKUP,
  slugSource: 'question',
});

const content = createCrudController(GrowthServiceContent, {
  searchFields: ['heading', 'body', 'sectionKey'],
  defaultSort: { displayOrder: 1, createdAt: 1 },
  parentField: 'growthServiceId',
  filterFields: ['sectionKey', 'level'],
  lookups: SERVICE_LOOKUP,
  slugSource: 'heading',
});

const cta = createCrudController(GrowthServiceCta, {
  searchFields: ['label', 'href'],
  defaultSort: { displayOrder: 1, createdAt: 1 },
  parentField: 'growthServiceId',
  filterFields: ['placement'],
  lookups: SERVICE_LOOKUP,
  slugSource: 'label',
});

/* ── Parent list: child counts ──────────────────────────────────────────────
 * Attach a `navigation` array of per-section counts so the services list can
 * render "Sections (11)", "Features (26)" … buttons that deep-link into each
 * scoped child list. Mirrors homePageSectionController's approach. */

const NAV_SEGMENTS = [
  { segment: 'sections', label: 'Sections', model: GrowthServiceSection },
  { segment: 'features', label: 'Features', model: GrowthServiceFeature },
  { segment: 'stats', label: 'Stats', model: GrowthServiceStat },
  { segment: 'showcases', label: 'Showcases', model: GrowthServiceShowcase },
  { segment: 'case-metrics', label: 'Case Metrics', model: GrowthServiceCaseMetric },
  { segment: 'faqs', label: 'FAQs', model: GrowthServiceFaq },
  { segment: 'ctas', label: 'CTAs', model: GrowthServiceCta },
  { segment: 'contents', label: 'SEO Content', model: GrowthServiceContent },
];

// FK values are Mixed: seeded rows hold ObjectIds while admin-created rows
// persist plain strings, so every grouping must match both representations.
const idVariants = (services) =>
  services.flatMap((s) => {
    const v = String(s._id);
    return mongoose.Types.ObjectId.isValid(v) ? [v, new mongoose.Types.ObjectId(v)] : [v];
  });

const attachNavigation = async (services) => {
  if (!services.length) return services;
  const ids = idVariants(services);

  const countMaps = await Promise.all(
    NAV_SEGMENTS.map(async ({ model }) => {
      const map = new Map();
      try {
        const rows = await model.aggregate([
          { $match: { growthServiceId: { $in: ids } } },
          { $group: { _id: '$growthServiceId', count: { $sum: 1 } } },
        ]);
        rows.forEach((r) => map.set(String(r._id), r.count));
      } catch (err) {
        // Best effort — a failed count must not blank the whole listing.
      }
      return map;
    })
  );

  return services.map((s) => ({
    ...s,
    navigation: NAV_SEGMENTS.map(({ segment, label }, i) => ({
      segment,
      label,
      count: countMaps[i].get(String(s._id)) || 0,
    })),
  }));
};

const index = async (req, res) => {
  const sendJson = res.json.bind(res);
  res.json = (payload) => {
    if (payload && payload.status === 'success' && Array.isArray(payload.data) && payload.data.length) {
      attachNavigation(payload.data)
        .then((data) => sendJson({ ...payload, data }))
        .catch(() => sendJson(payload));
      return res;
    }
    return sendJson(payload);
  };
  return service.index(req, res);
};

// Deleting a service removes every section, item, metric, FAQ and CTA under it
// so no orphaned rows are left behind pointing at a missing parent.
const destroy = async (req, res) => {
  const doc = await GrowthService.findById(req.params.id);
  if (!doc) return res.status(404).json({ status: 'error', message: 'Not found' });
  await cascadeDelete(req.params.id, CHILD_SPECS);
  return service.destroy(req, res);
};

module.exports = {
  service: { ...service, index, destroy },
  section,
  feature,
  stat,
  showcase,
  caseMetric,
  faq,
  cta,
  content,
};
