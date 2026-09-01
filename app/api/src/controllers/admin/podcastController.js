const mongoose = require('mongoose');
const PodcastPage = require('../../models/PodcastPage');
const PodcastStat = require('../../models/PodcastStat');
const PodcastCard = require('../../models/PodcastCard');
const PodcastStage = require('../../models/PodcastStage');
const PodcastShot = require('../../models/PodcastShot');
const PodcastFaq = require('../../models/PodcastFaq');
const PodcastCta = require('../../models/PodcastCta');
const createCrudController = require('./crudFactory');
const { cascadeDelete } = require('./cascadeDelete');

/* Admin CRUD for the podcast money page
 * (/podcast-video-editing-marketing-services). One parent record per page plus
 * six child collections, each scoped by `podcastPageId` so a list can be
 * filtered to a single page with `?podcastPageId=…` and, where a collection
 * carries more than one band, to a single band with `?sectionKey=…`.
 *
 * Every sub-resource is a plain crudFactory controller — index / show / store /
 * update / destroy / exportCsv / importCsv — so the admin panel's shared
 * CrudListPage + useCrud stack drives them without any bespoke wiring.
 */

// Every child collection, with the FK crudFactory and cascadeDelete scope by,
// plus the media fields whose S3 objects go with the record.
const CHILD_SPECS = [
  { model: PodcastStat, fk: 'podcastPageId' },
  { model: PodcastCard, fk: 'podcastPageId' },
  { model: PodcastStage, fk: 'podcastPageId' },
  { model: PodcastShot, fk: 'podcastPageId', media: ['image'] },
  { model: PodcastFaq, fk: 'podcastPageId' },
  { model: PodcastCta, fk: 'podcastPageId' },
];

// Resolve the parent page name onto every child row so the admin lists can show
// which page a record belongs to without a second request.
const PAGE_LOOKUP = [{
  localField: 'podcastPageId',
  model: PodcastPage,
  nameField: 'name',
  as: 'podcastPageName',
}];

/* No `slugSource` on the parent, unlike the child collections below.
 * The page slug is the key the website looks this record up by, so a supplied
 * slug has to win: forcing it to be re-derived from the name would rewrite it
 * on every save. It also would not agree with what the admin form shows —
 * slugify() turns "&" into "and" while the panel's SlugField drops it — so a
 * page named "… Video Editing & Marketing Services" would be saved under a slug
 * no route asks for. Leaving slugSource off means `pickSlugSource` honours the
 * slug field, and only falls back to the name when it is left blank. */
const page = createCrudController(PodcastPage, {
  imageFields: ['heroPoster', 'problemBgImage', 'founderPortrait'],
  searchFields: ['name', 'slug', 'metaTitle', 'heroTitle'],
  defaultSort: { displayOrder: 1, createdAt: -1 },
});

const stat = createCrudController(PodcastStat, {
  searchFields: ['value', 'label', 'description'],
  defaultSort: { displayOrder: 1, createdAt: 1 },
  parentField: 'podcastPageId',
  filterFields: ['sectionKey'],
  lookups: PAGE_LOOKUP,
  slugSource: 'label',
});

const card = createCrudController(PodcastCard, {
  searchFields: ['title', 'body', 'meta', 'sectionKey'],
  defaultSort: { displayOrder: 1, createdAt: 1 },
  parentField: 'podcastPageId',
  filterFields: ['sectionKey'],
  lookups: PAGE_LOOKUP,
  slugSource: 'title',
});

const stage = createCrudController(PodcastStage, {
  searchFields: ['name', 'promise', 'detail'],
  defaultSort: { displayOrder: 1, createdAt: 1 },
  parentField: 'podcastPageId',
  filterFields: ['diagramKey'],
  lookups: PAGE_LOOKUP,
  slugSource: 'name',
});

const shot = createCrudController(PodcastShot, {
  imageFields: ['image'],
  searchFields: ['caption', 'alt'],
  defaultSort: { displayOrder: 1, createdAt: 1 },
  parentField: 'podcastPageId',
  lookups: PAGE_LOOKUP,
  slugSource: 'caption',
});

const faq = createCrudController(PodcastFaq, {
  searchFields: ['question', 'answer'],
  defaultSort: { displayOrder: 1, createdAt: 1 },
  parentField: 'podcastPageId',
  lookups: PAGE_LOOKUP,
  slugSource: 'question',
});

const cta = createCrudController(PodcastCta, {
  searchFields: ['label', 'href'],
  defaultSort: { displayOrder: 1, createdAt: 1 },
  parentField: 'podcastPageId',
  filterFields: ['placement'],
  lookups: PAGE_LOOKUP,
  slugSource: 'label',
});

/* ── Parent list: per-band counts ───────────────────────────────────────────
 * Attach a `navigation` array so the pages list can render one button per
 * band — "Services (8)", "FAQs (11)" … — each deep-linking into the child list
 * already scoped to that page AND that band. Mirrors growthServiceController's
 * approach, with the section filter added so an editor lands on the exact band
 * they clicked rather than a mixed list. */

const NAV_SEGMENTS = [
  { segment: 'stat', label: 'Trust Stats', model: PodcastStat, filter: { sectionKey: 'trust' } },
  { segment: 'stat', label: 'Problem Stats', model: PodcastStat, filter: { sectionKey: 'problem' } },
  { segment: 'stage', label: 'Method Stages', model: PodcastStage },
  { segment: 'card', label: 'Services', model: PodcastCard, filter: { sectionKey: 'services' } },
  { segment: 'card', label: 'Audiences', model: PodcastCard, filter: { sectionKey: 'audiences' } },
  { segment: 'card', label: 'Month Table', model: PodcastCard, filter: { sectionKey: 'month' } },
  { segment: 'card', label: 'Time Zones', model: PodcastCard, filter: { sectionKey: 'operations' } },
  { segment: 'card', label: 'Process', model: PodcastCard, filter: { sectionKey: 'process' } },
  { segment: 'shot', label: 'Studio Shots', model: PodcastShot },
  { segment: 'stat', label: 'Scale Stats', model: PodcastStat, filter: { sectionKey: 'scale' } },
  { segment: 'faq', label: 'FAQs', model: PodcastFaq },
  { segment: 'cta', label: 'CTAs', model: PodcastCta },
];

// FK values are Mixed: seeded rows hold ObjectIds while admin-created rows
// persist plain strings, so every grouping must match both representations.
const idVariants = (pages) =>
  pages.flatMap((p) => {
    const v = String(p._id);
    return mongoose.Types.ObjectId.isValid(v) ? [v, new mongoose.Types.ObjectId(v)] : [v];
  });

const attachNavigation = async (pages) => {
  if (!pages.length) return pages;
  const ids = idVariants(pages);

  const countMaps = await Promise.all(
    NAV_SEGMENTS.map(async ({ model, filter = {} }) => {
      const map = new Map();
      try {
        const rows = await model.aggregate([
          { $match: { podcastPageId: { $in: ids }, ...filter } },
          { $group: { _id: '$podcastPageId', count: { $sum: 1 } } },
        ]);
        rows.forEach((r) => map.set(String(r._id), r.count));
      } catch (err) {
        // Best effort — a failed count must not blank the whole listing.
      }
      return map;
    })
  );

  return pages.map((p) => ({
    ...p,
    navigation: NAV_SEGMENTS.map(({ segment, label, filter }, i) => ({
      segment,
      label,
      sectionKey: filter ? filter.sectionKey : undefined,
      count: countMaps[i].get(String(p._id)) || 0,
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
  return page.index(req, res);
};

// Deleting a page removes every stat, card, stage, shot, FAQ and CTA under it
// so no orphaned rows are left behind pointing at a missing parent.
const destroy = async (req, res) => {
  const doc = await PodcastPage.findById(req.params.id);
  if (!doc) return res.status(404).json({ status: 'error', message: 'Not found' });
  await cascadeDelete(req.params.id, CHILD_SPECS);
  return page.destroy(req, res);
};

module.exports = {
  page: { ...page, index, destroy },
  stat,
  card,
  stage,
  shot,
  faq,
  cta,
};
