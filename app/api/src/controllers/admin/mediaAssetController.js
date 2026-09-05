const mongoose = require('mongoose');
const MediaAsset = require('../../models/MediaAsset');
const MediaJob = require('../../models/MediaJob');
const { buildS3Url } = require('../../utils/s3Upload');
const { removeObject, downloadTarget, urlFor } = require('../../services/mediaStorage');
const { ensureRendition, renditionUrls, isVariant } = require('../../services/mediaRenditions');
const { enqueue, describeNow, budgetStatus } = require('../../services/mediaDescriber');
const { ingestBatch } = require('../../services/mediaIngest');
const {
  publishable, pendingReview, REVIEW_STATES, SAVED_SEARCHES, clearance,
} = require('../../lib/mediaSearches');
const logger = require('../../utils/logger');

/* A 24-character hex id. Checked before anything reaches Mongo, because an
 * unparseable id raises a CastError that surfaces as a 500, and "?personId=
 * Dishan Puzari" is the first thing somebody tries. */
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

/**
 * GET /admin/media
 *
 * Query params:
 *   q          free text — matched against the media_search index
 *   tags       comma separated, ALL must be present
 *   kind       image | video
 *   rights     own | client-ip | stock | unknown
 *   publishable=1  shorthand for rights=own, sensitive=false, usable=true
 *   category, folder, describeStatus, reviewed
 *   personId   only assets where this person is named
 *   page, limit
 *
 * `publishable=1` is the one most callers want. It is the guard that
 * stops a stock photograph or a client's key art being pulled onto a
 * page that claims to show our own work.
 *
 * `personId` is an exact id match, not a text match on a name. Names are
 * not in the text index precisely so that correcting a spelling does not
 * mean rewriting every asset the person appears in.
 */
const index = async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 24, 1), 100);
  const skip = (page - 1) * limit;

  const filter = buildGovernanceFilter(req.query);

  /* Checked against the id shape rather than passed straight through: an
   * unparseable value reaches Mongo as a CastError and surfaces as a 500,
   * and "?personId=Dishan Puzari" is the obvious thing for somebody to try. */
  if (req.query.personId) {
    if (!OBJECT_ID_RE.test(String(req.query.personId))) {
      return res.status(400).json({
        status: 'error',
        message: 'personId must be a person id from /media/people, not a name.',
      });
    }
    filter['taggedPeople.person'] = req.query.personId;
  }

  if (req.query.search) {
    if (!SAVED_SEARCHES[req.query.search]) {
      return res.status(400).json({
        status: 'error',
        message: `Unknown saved search "${req.query.search}". `
               + `Try one of: ${Object.keys(SAVED_SEARCHES).join(', ')}.`,
      });
    }
    Object.assign(filter, await savedSearchFilter(req.query));
  }

  let projection = null;
  let sort = { createdAt: -1 };

  const q = (req.query.q || '').trim();
  if (q) {
    filter.$text = { $search: q };
    projection = { score: { $meta: 'textScore' } };
    sort = { score: { $meta: 'textScore' }, createdAt: -1 };
  }

  const [data, total] = await Promise.all([
    MediaAsset.find(filter, projection).sort(sort).skip(skip).limit(limit),
    MediaAsset.countDocuments(filter),
  ]);

  res.json({
    status: 'success',
    data: data.map(toPublic),
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
};

/**
 * GET /admin/media/:id
 *
 * Obeys the same filter as the listing, and returns the same shape.
 *
 * It did neither. It fetched by id alone and returned the raw Mongoose
 * document, which made it the one hole through which a rejected,
 * sensitive or NDA asset could be read in full — checksum, setBy,
 * describeMeta.costUsd, review.note and all — by anyone who could guess
 * or copy an id. A detail view that can see more than the list it was
 * reached from is a detail view nobody meant to build.
 *
 * Not-visible and not-there deliberately answer the same 404: telling a
 * caller that an id exists but is withheld is itself a disclosure.
 */
const show = async (req, res) => {
  if (!OBJECT_ID_RE.test(String(req.params.id))) {
    return res.status(404).json({ status: 'error', message: 'Not found' });
  }
  const doc = await MediaAsset.findOne({
    ...buildGovernanceFilter(req.query),
    _id: req.params.id,
  });
  if (!doc) return res.status(404).json({ status: 'error', message: 'Not found' });
  /* One extra read, on a single-document route only. The grid must never
   * do this — sixty assets would be sixty job lookups. */
  const job = doc.job
    ? await MediaJob.findById(doc.job).select('_id name client clientType industry genre nda')
    : null;
  res.json({ status: 'success', data: toDetail(doc, job) });
};

/**
 * PATCH /admin/media/:id
 *
 * A human correcting the machine. Setting any meaning field marks the
 * row reviewed, which makes it immune to a later re-describe — we must
 * never let a model overwrite a person's correction.
 */
const update = async (req, res) => {
  /* `consent` was missing from this list, which left "fix the consent on
   * this asset" with no route at all: only the approve path could set it,
   * so correcting a mistake meant approving the asset in the same breath.
   * A correction and a verdict are different acts and each needed its own
   * door. `pickEditable` is the shared allow-list — CORRECTABLE_FIELDS —
   * so the two paths cannot drift.
   *
   * Everything outside that list is dropped rather than passed through.
   * MediaAsset is declared `strict: false`, so an unfiltered $set would
   * persist whatever arbitrary keys arrived in the body. */
  const patch = pickEditable(req.body);
  if (!Object.keys(patch).length) {
    return res.status(400).json({ status: 'error', message: 'No editable fields provided.' });
  }

  /* A person changing a governance field IS the human decision setBy
   * exists to record. Without this stamp a correction made here could be
   * silently undone by the next describe run, which is the one thing the
   * whole provenance model promises cannot happen. Only the fields
   * actually present in the request are stamped — touching the caption
   * must not claim you also decided the rights. */
  CONFIRMABLE_FIELDS
    .filter((f) => Object.prototype.hasOwnProperty.call(patch, f))
    .forEach((f) => { patch[`setBy.${f}`] = 'human'; });

  patch.reviewed = 1;

  const doc = await MediaAsset.findByIdAndUpdate(req.params.id, patch, {
    new: true, runValidators: true,
  });
  if (!doc) return res.status(404).json({ status: 'error', message: 'Not found' });
  const job = doc.job
    ? await MediaJob.findById(doc.job).select('_id name client clientType industry genre nda')
    : null;
  res.json({ status: 'success', message: 'Updated', data: toDetail(doc, job) });
};

/** POST /admin/media/:id/describe — re-run the describer on one asset. */
const redescribe = async (req, res) => {
  const doc = await MediaAsset.findById(req.params.id);
  if (!doc) return res.status(404).json({ status: 'error', message: 'Not found' });
  if (doc.reviewed === 1 && req.query.force !== '1') {
    return res.status(409).json({
      status: 'error',
      message: 'This asset was corrected by a human. Pass force=1 to overwrite it.',
    });
  }
  const result = await describeNow(doc);
  res.json({ status: 'success', message: 'Described', data: result });
};

/** GET /admin/media/stats — queue depth and what the describing has cost. */
const stats = async (req, res) => {
  const [byStatus, byRights, byKind, spend] = await Promise.all([
    MediaAsset.aggregate([{ $group: { _id: '$describeStatus', n: { $sum: 1 } } }]),
    MediaAsset.aggregate([{ $group: { _id: '$rights', n: { $sum: 1 } } }]),
    MediaAsset.aggregate([{ $group: { _id: '$kind', n: { $sum: 1 } } }]),
    MediaAsset.aggregate([
      { $group: {
        _id: null,
        totalUsd: { $sum: '$describeMeta.costUsd' },
        described: { $sum: { $cond: [{ $eq: ['$describeStatus', 'done'] }, 1, 0] } },
        reusedFromChecksum: { $sum: { $cond: ['$describeMeta.copiedFromChecksum', 1, 0] } },
      } },
    ]),
  ]);

  const s = spend[0] || {};
  res.json({
    status: 'success',
    data: {
      describeStatus: Object.fromEntries(byStatus.map((r) => [r._id, r.n])),
      rights: Object.fromEntries(byRights.map((r) => [r._id, r.n])),
      kind: Object.fromEntries(byKind.map((r) => [r._id, r.n])),
      cost: {
        totalUsd: Number((s.totalUsd || 0).toFixed(4)),
        described: s.described || 0,
        reusedFromChecksum: s.reusedFromChecksum || 0,
        avgUsdPerAsset: s.described ? Number(((s.totalUsd || 0) / s.described).toFixed(5)) : 0,
      },
      budget: budgetStatus(),
    },
  });
};

/** POST /admin/media/describe-queue — drain N pending jobs. */
const runQueue = async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.body.limit, 10) || 20, 1), 200);
  const result = await enqueue(limit);
  res.json({ status: 'success', message: 'Queue run complete', data: result });
};

const destroy = async (req, res) => {
  const doc = await MediaAsset.findById(req.params.id);
  if (!doc) return res.status(404).json({ status: 'error', message: 'Not found' });
  // Only drop the S3 object when no other row references the same bytes.
  const others = await MediaAsset.countDocuments({
    checksum: doc.checksum, _id: { $ne: doc._id },
  });
  if (!others && doc.key) await removeObject(doc.key);
  await doc.deleteOne();
  res.json({ status: 'success', message: 'Deleted successfully' });
};


/* ------------------------------------------------------------------
 * Merged from three parallel workstreams: upload, review and person
 * tagging. They were written independently and each returned a whole
 * controller; this file is the union, assembled by hand because none of
 * the three was a superset of the others and whichever landed last would
 * have left the routes file calling handlers that did not exist.
 *
 * The helpers below are part of that union. They were referenced by the
 * merged handlers but their declarations lived in files that did not
 * survive the merge, so `index`, `approve` and `bulk-approve` all threw
 * ReferenceError on any call. Caught by running the API rather than by
 * reading it — nothing here is covered by the four media test files,
 * which stub the controller out entirely.
 * ------------------------------------------------------------------ */

/* The largest bulk approval accepted in one request. Not a database
 * limit — a human one. Past this, "I have read every one of these"
 * stops being true, and an approval that nobody read is worth nothing. */
const MAX_BULK_APPROVE = 100;

/* The five fields a reviewer puts their name to: the governance fields a
 * model may propose but only a person may decide. Confirming one is what
 * stamps setBy to 'human', which is what stops a later describe run
 * overruling the person who was actually in the room. */
const CONFIRMABLE_FIELDS = ['rights', 'consent', 'sensitive', 'usable', 'people'];

/* What a reviewer may correct while approving. Wider than the PATCH list
 * in `update` by exactly `consent` and `people`: fixing governance at the
 * moment of approval is the point of the review step, whereas PATCH is a
 * metadata edit and has no business changing consent on its own. The two
 * lists differ deliberately — do not merge them. */
const CORRECTABLE_FIELDS = ['caption', 'altText', 'tags', 'category',
  'rights', 'consent', 'usable', 'sensitive', 'people', 'folder', 'status'];

const pickEditable = (body = {}) => {
  const patch = {};
  CORRECTABLE_FIELDS.forEach((f) => {
    if (Object.prototype.hasOwnProperty.call(body, f)) patch[f] = body[f];
  });
  if (Array.isArray(patch.tags)) {
    patch.tags = patch.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
  }
  return patch;
};

/* What a field will hold once the patch lands. Approval judges the row as
 * it will be, not as it was: a reviewer who fixes `rights` and approves in
 * one request means both, and testing the stored value would reject the
 * correction they just made. */
const valueAfter = (doc, patch, field) => (
  Object.prototype.hasOwnProperty.call(patch, field) ? patch[field] : doc[field]
);

/* Why this row cannot be approved yet, in words the reviewer can act on.
 * An empty array means nothing stands in the way.
 *
 * These are refusals, not warnings. Approval is the gate publishable()
 * trusts, so anything it cannot answer for must not pass — an approved
 * row with unknown rights is worse than an unapproved one, because the
 * unapproved row is still honest about not knowing. */
const approvalBlockers = (after = {}) => {
  const out = [];
  if (!after.rights || after.rights === 'unknown') {
    out.push('rights are still unknown — record who owns this first');
  }
  if (!after.consent || after.consent === 'unknown') {
    out.push('consent is still unknown');
  }
  if (after.consent === 'refused') {
    out.push('somebody in this frame refused consent');
  }
  if (after.consent === 'minors' && after.usable) {
    out.push('this frame contains minors and is marked usable');
  }
  if (after.sensitive && after.usable) {
    out.push('marked sensitive and usable at once — it cannot be both');
  }
  return out;
};

/** The name recorded against a review, for the reviewer who is not an id. */
const reviewerName = (req) => (
  (req && req.user && (req.user.name || req.user.email)) || 'Unknown'
);

/* The $set an approval writes: the reviewer's corrections, the verdict,
 * and a setBy stamp on every field they confirmed. */
const approvalSet = (patch = {}, { confirm = [], note = '', req } = {}) => {
  const set = { ...patch };
  set['review.state'] = 'approved';
  set['review.by'] = (req && req.user && req.user._id) || null;
  set['review.byName'] = reviewerName(req);
  set['review.at'] = new Date();
  set['review.note'] = String(note || '').trim();
  set['review.fields'] = confirm;
  /* An approval is a human reading the row, so the row is reviewed —
   * whether or not any field was corrected in the same request. */
  set.reviewed = 1;
  confirm
    .filter((f) => CONFIRMABLE_FIELDS.includes(f))
    .forEach((f) => { set[`setBy.${f}`] = 'human'; });
  return set;
};

/* A tagged person reduced to what a chip needs. `person` arrives either
 * as a bare ObjectId or as a populated document, depending on whether the
 * caller populated it, and both have to render. */
const personRef = (person) => {
  if (!person) return null;
  if (person._id) {
    return { id: person._id, name: person.name || '', role: person.role || '' };
  }
  return { id: person, name: '', role: '' };
};

const toPublic = (doc) => ({
  id: doc._id,
  url: doc.url || buildS3Url(doc.key),
  key: doc.key,
  kind: doc.kind,
  caption: doc.caption,
  altText: doc.altText,
  tags: doc.tags,
  category: doc.category,
  width: doc.width,
  height: doc.height,
  duration: doc.duration,
  rights: doc.rights,
  usable: doc.usable,
  reviewed: doc.reviewed,
  sensitive: doc.sensitive,
  people: doc.people,
  namedPeople: (doc.taggedPeople || []).length,
  taggedPeople: (doc.taggedPeople || []).map((t) => ({
    tagId: t._id,
    person: personRef(t.person),
    box: t.box || null,
    note: t.note || '',
    taggedBy: t.taggedBy || null,
    taggedAt: t.taggedAt,
  })),
  describeStatus: doc.describeStatus,
  /* mediaVideo.ensurePoster() extracts a frame and writes posterKey, and
   * no projection has ever returned it — so work already paid for in CPU
   * and disk has been invisible to every client. */
  posterUrl: doc.posterKey ? buildS3Url(doc.posterKey) : null,
  /* Smaller copies where they exist. Null is the normal answer until
   * somebody opens the asset — renditions are made on first request, not
   * at ingest — and every consumer falls back to `url`. */
  ...renditionUrls(doc),
  /* What a person may do with this, decided in lib/mediaSearches so the
   * browser never restates it. */
  clearance: clearance(doc),
  /* The verdict, and who reached it. Without this any review UI has to
   * guess, and guessing defaults everything to 'proposed' — which is how
   * an already-rejected asset ends up offered for approval again.
   *
   * `review.note` is deliberately NOT here. A rejection reason is written
   * for the uploader and can name a person or a client; it belongs on the
   * detail view for someone who may act on it, not on every card in a
   * grid that a whole studio can see. */
  review: {
    state: (doc.review && doc.review.state) || 'proposed',
    byName: (doc.review && doc.review.byName) || '',
    at: (doc.review && doc.review.at) || null,
  },
  createdAt: doc.createdAt,
});


/**
 * One asset, in full, for the detail view.
 *
 * toPublic() is the grid projection and is deliberately narrow: it is sent
 * sixty at a time to everyone who can open the library. This is sent one at
 * a time, on purpose, to someone who asked for this specific asset — so it
 * carries the fields that answer "why is this asset the way it is".
 *
 * `setBy` is the point of the whole screen. It is a Mongoose Map, which
 * serialises to {} through res.json without Object.fromEntries — the field
 * would appear to exist and always be empty, which is worse than absent.
 *
 * Still withheld, from everyone:
 *   checksum, userId          internal plumbing, no reader's business
 *   describeMeta.costUsd      per-asset spend is an operations number and
 *   describeMeta.*Tokens      is on /media/stats in aggregate already
 *   describeError             a provider stack trace helps nobody here
 *
 * `review.note` IS included. It is the rejection reason, it was written to
 * be read by the person who uploaded the asset, and withholding it is what
 * makes a rejection a dead end — the whole complaint the review flow exists
 * to answer.
 */
const toDetail = (doc, job = null) => ({
  ...toPublic(doc),
  originalName: doc.originalName || '',
  folder: doc.folder || '',
  bytes: doc.bytes || 0,
  mimetype: doc.mimetype || '',
  assetType: doc.assetType || 'unknown',
  shows: doc.shows || [],
  ocrText: doc.ocrText || '',
  consent: doc.consent,
  nda: Boolean(doc.nda),
  /* Three states, not two: a field can be decided by a person, proposed by
   * a model, or never touched at all. Absent-from-the-map is its own answer
   * and the UI has to be able to say "nobody has decided this yet". */
  setBy: doc.setBy instanceof Map
    ? Object.fromEntries(doc.setBy)
    : (doc.setBy || {}),
  reviewNote: (doc.review && doc.review.note) || '',
  reviewFields: (doc.review && doc.review.fields) || [],
  describedBy: doc.describeMeta && doc.describeMeta.describedAt
    ? {
      provider: doc.describeMeta.provider,
      model: doc.describeMeta.model,
      at: doc.describeMeta.describedAt,
      copiedFromChecksum: Boolean(doc.describeMeta.copiedFromChecksum),
    }
    : null,
  job: job
    ? {
      id: job._id, name: job.name, client: job.client,
      clientType: job.clientType, industry: job.industry,
      genre: job.genre, nda: job.nda,
    }
    : null,
  /* Why this asset is not publishable, in the same words the approve route
   * would refuse it with — so the screen can say it before the button is
   * pressed rather than after a 422. */
  blockers: approvalBlockers({
    rights: doc.rights, consent: doc.consent,
    sensitive: doc.sensitive, usable: doc.usable, people: doc.people,
  }),
  updatedAt: doc.updatedAt,
});


/**
 * GET /admin/api/media/:id/file — hand the original to a person.
 *
 * Not a plain link to `asset.url`, for three reasons that each on their
 * own would be enough:
 *
 *   - The `download` attribute is inert cross-origin. The library runs on
 *     one origin and the bytes are served from another, so a
 *     `<a download>` silently navigates to the image instead of saving it.
 *     The control would look like it worked and would not.
 *   - The stored key is `caspian/images/1788467741306_44821_shot.jpg`.
 *     That is the name that lands in a Premiere bin. Content-Disposition
 *     is the only thing that fixes it.
 *   - It survives defect D4. Every control built against `asset.url`
 *     breaks the week the caspian/ prefix goes private; this one changes
 *     in a single function in mediaStorage.
 *
 * The same governance filter as show(): if you could not have seen it in
 * the listing you cannot download it, and not-visible answers 404 exactly
 * as not-found does.
 */
const download = async (req, res) => {
  if (!OBJECT_ID_RE.test(String(req.params.id))) {
    return res.status(404).json({ status: 'error', message: 'Not found' });
  }
  const doc = await MediaAsset.findOne({
    ...buildGovernanceFilter(req.query),
    _id: req.params.id,
  });
  if (!doc) return res.status(404).json({ status: 'error', message: 'Not found' });

  /* A pull of somebody else's material is the event you want a record of
   * after a leak. Logged for every asset the clearance check does not call
   * clear — the quiet 90% would only bury the ones that matter. */
  const { level } = clearance(doc);
  if (level !== 'clear') {
    logger.info(
      `media download [${level}] ${doc._id} (${doc.originalName || doc.key}) `
      + `by ${(req.user && (req.user.name || req.user.email)) || 'unknown'}`,
    );
  }

  const name = doc.originalName || String(doc.key).split('/').pop() || 'download';

  /* ?variant= hands back a shape instead of the original. It is the same
   * route on purpose: "give me this asset" and "give me this asset as a
   * vertical" are one intention, and they must obey one governance check.
   * A separate crop-download route would be a second place to forget it. */
  const wanted = String(req.query.variant || '').trim();
  if (wanted) {
    if (!isVariant(wanted)) {
      return res.status(404).json({ status: 'error', message: 'Not a shape this library makes.' });
    }
    const url = await ensureRendition(doc, wanted);
    if (!url) {
      return res.status(422).json({
        status: 'error',
        message: 'That shape could not be made from this file.',
      });
    }
    const stem = name.replace(/\.[^.]+$/, '');
    if (String(req.query.as || '') === 'url') {
      return res.json({ status: 'success', data: { url, filename: `${stem}-${wanted}.jpg` } });
    }
    return res.redirect(302, url);
  }

  const target = downloadTarget(doc.key, doc.url);

  if (target.mode === 'missing') {
    /* The row exists and the bytes do not. Say that, rather than 404ing
     * as though the asset were unknown — one is a broken library and the
     * other is a permission answer, and they need different reactions. */
    return res.status(410).json({
      status: 'error',
      message: 'This asset\'s file is missing from storage. The record is here; the bytes are not.',
    });
  }
  /* `?as=url` answers with the location instead of the bytes.
   *
   * This route sits behind `protect`, so it needs an Authorization header
   * — and a plain <a href> cannot send one. The browser therefore cannot
   * follow a 302 from here directly. Fetching the bytes as a blob would
   * work for a photograph and is a bad idea for a 500 MB video, which
   * would be pulled entirely into the tab's memory before saving.
   *
   * So the client asks, with its header, for WHERE the file is, and then
   * navigates there itself. Today that is the object's own URL. When the
   * caspian/ prefix goes private it becomes a short-lived presigned URL
   * and this contract does not change. */
  if (String(req.query.as || '') === 'url') {
    return res.json({
      status: 'success',
      data: {
        url: target.mode === 'file'
          ? `${urlFor(doc.key)}`
          : target.url,
        filename: name,
        clearance: clearance(doc),
      },
    });
  }

  if (target.mode === 'file') {
    return res.download(target.path, name, (err) => {
      if (err && !res.headersSent) {
        res.status(410).json({ status: 'error', message: 'That file could not be read from storage.' });
      }
    });
  }
  return res.redirect(302, target.url);
};


/**
 * Which fields is the reviewer putting their name to?
 *
 * An explicitly empty array means "I am claiming nothing about the
 * governance" and MUST be honoured. The previous test — `Array.isArray(x)
 * && x.length` — collapsed [] into the same branch as a missing key and
 * stamped all five fields setBy 'human', so a one-click approval from a
 * grid tile recorded that a person had personally decided the rights,
 * consent, sensitivity, usability and headcount of an asset they had seen
 * only as a thumbnail. setBy is worth something only if it is never wrong.
 *
 * A MISSING key still defaults to all five, which is the contract the
 * approve docblock describes and existing callers were written against.
 * That default is a footgun pointing the wrong way — forgetting a field
 * should claim less, not more — and it is worth changing, but changing a
 * reviewed contract silently is not this commit's job. Flagged for Anshu.
 *
 * Unknown names are dropped rather than stored: review.fields feeds a
 * setBy stamp, and an arbitrary string there would write an arbitrary key
 * into a collection declared `strict: false`.
 */
const readConfirm = (body = {}) => {
  if (!Array.isArray(body.confirm)) return CONFIRMABLE_FIELDS;
  return body.confirm.filter((f) => CONFIRMABLE_FIELDS.includes(f));
};


/**
 * GET /admin/api/media/:id/rendition/:variant
 *
 * A smaller copy, made on the spot if this is the first time anyone has
 * asked for it. Redirects to the file rather than proxying the bytes, so
 * the API is not in the path of every thumbnail on every grid.
 *
 * Falls back to the original when a rendition cannot be made — an image
 * already smaller than the target, a format sharp cannot decode, a video,
 * or sharp missing entirely. A slow picture beats a broken one, and this
 * whole layer is an optimisation rather than a feature anyone asked for
 * by name.
 */
const rendition = async (req, res) => {
  const { variant } = req.params;
  if (!OBJECT_ID_RE.test(String(req.params.id)) || !isVariant(variant)) {
    return res.status(404).json({ status: 'error', message: 'Not found' });
  }
  const doc = await MediaAsset.findOne({
    ...buildGovernanceFilter(req.query),
    _id: req.params.id,
  });
  if (!doc) return res.status(404).json({ status: 'error', message: 'Not found' });

  const url = await ensureRendition(doc, variant) || doc.url;
  if (!url) return res.status(404).json({ status: 'error', message: 'Not found' });
  return res.redirect(302, url);
};


/**
 * POST /admin/api/media/rendition-queue — make the missing thumbnails.
 *
 * The grid cannot generate these itself: an <img src> carries no
 * Authorization header, so it can only ever use a rendition that already
 * exists. Something has to make the first one, and doing it inside the
 * listing would mean sixty fetches and sixty resizes on a page load.
 *
 * So it is a queue, drained deliberately, exactly like describing. Small
 * batches by default because each item is a download plus a decode plus
 * an encode, and this shares a VPS with the website.
 */
const runRenditionQueue = async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.body.limit, 10) || 25, 1), 100);

  const pending = await MediaAsset.find({
    kind: 'image',
    status: 1,
    'renditions.thumb': { $exists: false },
  }).sort({ createdAt: -1 }).limit(limit);

  let made = 0;
  let skipped = 0;
  for (const doc of pending) {
    /* Sequential. Each item is a network fetch and a libvips decode;
     * running twenty-five at once on a shared host is how the website
     * next door starts timing out. */
    // eslint-disable-next-line no-await-in-loop
    const url = await ensureRendition(doc, 'thumb');
    if (url) made += 1; else skipped += 1;
  }

  const remaining = await MediaAsset.countDocuments({
    kind: 'image', status: 1, 'renditions.thumb': { $exists: false },
  });

  res.json({
    status: 'success',
    message: `${made} made, ${skipped} did not need one.`,
    data: { considered: pending.length, made, skipped, remaining },
  });
};

/**
 * Translate query params into the filter every read must obey.
 *
 * This lives in one function and is exported because it is the guard,
 * not a convenience. `mediaPersonController` searches the same
 * collection by person and calls this rather than assembling its own
 * conditions; a second entrance with its own idea of what is safe is
 * exactly how a sensitive photograph or a stock image escapes, and that
 * escape would be invisible for as long as both filters happened to
 * agree.
 *
 * Text search is NOT built here — it needs a matching projection and
 * sort, which only the caller that ranks by score has any use for.
 */
const buildGovernanceFilter = (query = {}) => {
  const filter = { status: 1 };

  // Sensitive assets are excluded unless explicitly requested by an
  // admin reviewing the quarantine. They are never returned by default.
  if (query.includeSensitive === '1') {
    if (query.sensitive === '1') filter.sensitive = true;
  } else {
    filter.sensitive = false;
  }

  /* NDA is excluded from every read that spans jobs.
   *
   * mediaSearches states this contract in a comment and nothing enforced
   * it, which was defect D3: an unreleased client still sat in the default
   * listing. The rule here is deliberately not an opt-in flag any caller
   * can set — it is scoped to intent. Browsing the library is a read
   * across jobs, so NDA is out. Asking for one named job (`?job=<id>`) is
   * a read the caller has already had to identify, so NDA is in.
   *
   * `$ne: true` rather than `false` because rows written before this field
   * existed have no value at all, and `nda: false` would not match them —
   * it would hide the entire pre-existing library instead of the NDA part
   * of it. */
  if (query.job) {
    filter.job = query.job;
  } else {
    filter.nda = { $ne: true };
  }

  /* publishable is a single door with one definition, and it lives in
   * lib/mediaSearches so the API, the saved searches and the tests cannot
   * drift apart. Spreading it here rather than restating its conditions
   * is the point — the last time these were hand-rolled at a call site,
   * the review requirement was simply missing from this branch while
   * publishable() already had it.
   *
   * It is applied LAST of the governance rules so nothing in the query
   * string can loosen it: a caller asking for publishable=1 alongside
   * rights=stock, sensitive=1 or reviewState=proposed gets the safe
   * answer, not the one they asked for. */
  if (query.publishable === '1') {
    Object.assign(filter, publishable());
  } else {
    if (query.rights) filter.rights = query.rights;

    // Only meaningful outside publishable, which pins the state itself.
    if (query.reviewState && query.reviewState !== 'all') {
      filter['review.state'] = query.reviewState;
    }
  }

  if (query.kind) filter.kind = query.kind;
  if (query.category) filter.category = query.category;
  if (query.folder) filter.folder = query.folder;
  if (query.describeStatus) filter.describeStatus = query.describeStatus;
  if (query.reviewed) filter.reviewed = Number(query.reviewed);

  if (query.tags) {
    const tags = String(query.tags).split(',').map((t) => t.trim()).filter(Boolean);
    if (tags.length) filter.tags = { $all: tags };
  }

  return filter;
};

/**
 * POST /admin/media/upload — the front door.
 *
 * Multipart, field name `files`, one drop of a folder per request. This
 * is the endpoint that replaces "put it in the Box folder and tell
 * somebody", so it is built for a batch: every file gets its own verdict
 * and one bad file never costs the other nineteen their upload.
 *
 * Optional, and applied to the WHOLE drop:
 *
 *   jobId    the MediaJob every file inherits. Industry, genre, client and
 *            client type live on the job because none of them can be seen
 *            in a photograph — so the moment a folder is dropped is the
 *            only moment they are cheaply known. Afterwards somebody has
 *            to remember, file by file, what the shoot was for, and they
 *            will not.
 *   folder   free-text grouping, as on the asset
 *   rights   own | client-ip | stock | unknown
 *   consent  released | staff | not-required | unknown | minors | refused
 *   dedupe   'row' (default) keeps a row per dropped file even when the
 *            bytes are already stored, so the second filename and job
 *            survive; 'skip' writes nothing and points at what is there,
 *            which is what you want when a folder was dropped twice.
 *
 * Nothing here describes anything. Files land at 'pending' and the
 * describe run stays a separate, admin-triggered call — an upload that
 * waited on a vision model would put a paid API call on a path a person
 * is watching, which is the one thing this design refuses to do.
 */
const upload = async (req, res) => {
  const files = req.files || [];
  if (!files.length) {
    return res.status(400).json({
      status: 'error',
      message: 'No files provided. Send them as multipart form-data in a field named "files".',
    });
  }

  /* Resolved BEFORE a single byte is stored. A wrong job is invisible
   * afterwards: nobody looking at the photograph can tell that the
   * industry and genre it inherited belong to a different shoot. */
  let job = null;
  const jobId = String(req.body.jobId || '').trim();
  if (jobId) {
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ status: 'error', message: `"${jobId}" is not a valid job id.` });
    }
    job = await MediaJob.findById(jobId).select('_id name client industry genre nda');
    if (!job) {
      return res.status(400).json({
        status: 'error',
        message: 'That media job does not exist. Create the job first, then upload into it.',
      });
    }
  }

  /* rights and consent are the two governance calls a person can make at
   * upload and a model cannot make at all. Recording them in setBy is what
   * stops a later describe run quietly overruling the person who was
   * actually in the room. */
  const governance = {};
  const setBy = {};
  for (const field of ['rights', 'consent']) {
    const value = String(req.body[field] || '').trim();
    if (!value) continue;
    const allowed = MediaAsset.schema.path(field).enumValues;
    if (!allowed.includes(value)) {
      return res.status(400).json({
        status: 'error',
        message: `${field} must be one of: ${allowed.join(', ')}.`,
      });
    }
    governance[field] = value;
    setBy[field] = 'human';
  }
  if (job) setBy.job = 'human';

  const { summary, results } = await ingestBatch({
    files,
    job: job ? job._id : null,
    nda: job ? Boolean(job.nda) : false,
    folder: String(req.body.folder || '').trim().slice(0, 120),
    governance,
    setBy,
    userId: req.user ? req.user._id : null,
    dedupe: req.body.dedupe === 'skip' ? 'skip' : 'row',
  });

  const stored = summary.uploaded + summary.duplicate;
  const notStored = summary.rejected + summary.failed;

  /* 201 when anything was stored, even if some files were refused: a
   * partial batch is a success with notes, and a client that treats it as
   * a failure would re-upload the nineteen files that worked. */
  return res.status(stored ? 201 : 400).json({
    status: stored ? 'success' : 'error',
    message: stored
      ? `${summary.uploaded} uploaded, ${summary.duplicate} already in the library, ${notStored} not stored.`
      : 'Nothing was stored. Every file has a reason below.',
    data: {
      job: job ? { id: job._id, name: job.name } : null,
      summary,
      results: results.map((r) => ({
        originalName: r.originalName,
        status: r.status,
        reason: r.reason,
        kind: r.kind,
        bytes: r.bytes,
        duplicateOf: r.duplicateOf,
        asset: r.asset ? toPublic(r.asset) : null,
      })),
    },
  });
};

/**
 * GET /admin/media/review
 *
 * The approval queue — what is waiting on a person, oldest first.
 *
 *   state=proposed|approved|rejected|all   default proposed
 *   ready=1        only rows the machine has finished describing, i.e.
 *                  the ones that actually have a proposal to judge
 *   kind, folder, page, limit
 *
 * Two things it does differently from search, both deliberate:
 *
 * It sorts oldest-first. Search is a feed and shows the newest upload;
 * a queue is worked from the back or the backlog never empties.
 *
 * It does NOT hide sensitive assets. Every other read path in this file
 * excludes them by default, and here that default would be exactly
 * wrong: the photograph the describer flagged for having a child in
 * frame is the single row most in need of a human ruling, and hiding it
 * from the only screen where that ruling can be made leaves it sitting
 * at 'proposed' forever.
 */
const reviewQueue = async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 24, 1), 100);
  const skip = (page - 1) * limit;

  const state = String(req.query.state || 'proposed');
  if (state !== 'all' && !REVIEW_STATES.includes(state)) {
    return res.status(400).json({
      status: 'error',
      message: `Unknown review state "${state}". Use one of: ${REVIEW_STATES.join(', ')}, all.`,
    });
  }

  const filter = { status: 1 };

  if (state === 'proposed') Object.assign(filter, pendingReview());
  else if (state !== 'all') filter['review.state'] = state;

  if (req.query.ready === '1') filter.describeStatus = 'done';
  else if (req.query.describeStatus) filter.describeStatus = req.query.describeStatus;

  if (req.query.kind) filter.kind = req.query.kind;
  if (req.query.folder) filter.folder = req.query.folder;

  const [data, total, counts] = await Promise.all([
    MediaAsset.find(filter, null).sort({ createdAt: 1 }).skip(skip).limit(limit),
    MediaAsset.countDocuments(filter),
    /* $ifNull, again because of the rows that predate the field. Without it
     * the whole existing library aggregates under a null key and the queue
     * depth the reviewer sees is a number for an empty bucket. */
    MediaAsset.aggregate([
      { $match: { status: 1 } },
      { $group: { _id: { $ifNull: ['$review.state', 'proposed'] }, n: { $sum: 1 } } },
    ]),
  ]);

  const depth = { proposed: 0, approved: 0, rejected: 0 };
  (counts || []).forEach((row) => { depth[row._id] = row.n; });

  res.json({
    status: 'success',
    data: data.map(toPublic),
    counts: depth,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
};

/**
 * POST /admin/media/:id/approve
 *
 * Body: { note?, confirm?: [field], ...corrections }
 *
 * Corrections are the same fields PATCH accepts and are applied in the
 * same request, because "I should be able to edit that whenever I
 * approve it" is one action to the reviewer and pretending otherwise
 * costs them a round trip per fix.
 *
 * `confirm` names the fields the reviewer is putting their name to, and
 * defaults to all of them — approving a row means having read it. Those
 * fields are what gets stamped into setBy.
 */
const approve = async (req, res) => {
  const doc = await MediaAsset.findById(req.params.id);
  if (!doc) return res.status(404).json({ status: 'error', message: 'Not found' });

  const patch = pickEditable(req.body);
  const confirm = readConfirm(req.body);

  const after = {};
  ['rights', 'consent', 'sensitive', 'usable', 'people']
    .forEach((f) => { after[f] = valueAfter(doc, patch, f); });

  const blockers = approvalBlockers(after);
  if (blockers.length) {
    return res.status(422).json({
      status: 'error',
      message: `Cannot approve: ${blockers.join('; ')}.`,
      data: { blockers },
    });
  }

  const updated = await MediaAsset.findByIdAndUpdate(
    req.params.id,
    approvalSet(patch, { confirm, note: req.body.note, req }),
    { new: true, runValidators: true },
  );
  res.json({ status: 'success', message: 'Approved', data: toPublic(updated) });
};

/**
 * POST /admin/media/:id/reject
 *
 * Body: { reason }  — required.
 *
 * `usable` is cleared as well as the verdict recorded. publishable()
 * already excludes anything not approved, so this is belt and braces;
 * it is here because a row that reads `usable: true` and `rejected` in
 * the same breath is a contradiction somebody eventually writes a query
 * around, and the query they write will be the wrong one.
 *
 * `reviewed` is deliberately left alone. A rejection is often "the
 * description is wrong", not "the file is wrong", and locking the
 * describer out of the row would make the obvious next step — fix the
 * provider, re-run it — impossible without a force flag. If the
 * describer does run again, the row goes to describeStatus 'done' and
 * stays 'rejected', which is the two axes behaving exactly as intended.
 */
const reject = async (req, res) => {
  const reason = String(req.body.reason || req.body.note || '').trim();
  if (reason.length < 3) {
    return res.status(400).json({
      status: 'error',
      message: 'A rejection needs a reason. Without one the asset returns to the '
             + 'queue and the next reviewer has to work out the objection again.',
    });
  }

  const doc = await MediaAsset.findByIdAndUpdate(req.params.id, {
    usable: false,
    'setBy.usable': 'human',
    'review.state': 'rejected',
    'review.by': (req.user && req.user._id) || null,
    'review.byName': reviewerName(req),
    'review.at': new Date(),
    'review.note': reason,
    'review.fields': [],
  }, { new: true, runValidators: true });

  if (!doc) return res.status(404).json({ status: 'error', message: 'Not found' });
  res.json({ status: 'success', message: 'Rejected', data: toPublic(doc) });
};

/**
 * POST /admin/media/review/bulk-approve
 *
 * Body: { ids: [], note?, confirm?: [field] }
 *
 * The same guards run per asset, and anything that trips one is skipped
 * with its reason rather than approved along with the rest. That is the
 * whole difference between a bulk action and a rubber stamp: a folder of
 * fifty edit-floor photographs goes through in one click, and the two in
 * it whose rights are still unknown come back named, so the reviewer
 * finds out now instead of finding out from a page.
 */
const bulkApprove = async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids.filter(Boolean) : [];
  if (!ids.length) {
    return res.status(400).json({ status: 'error', message: 'No asset ids provided.' });
  }
  if (ids.length > MAX_BULK_APPROVE) {
    return res.status(400).json({
      status: 'error',
      message: `Approve at most ${MAX_BULK_APPROVE} assets at a time.`,
    });
  }

  const confirm = readConfirm(req.body);

  const docs = await MediaAsset.find({ _id: { $in: ids } });
  const approved = [];
  const skipped = [];
  const ops = [];

  docs.forEach((doc) => {
    const blockers = approvalBlockers({
      rights: doc.rights,
      consent: doc.consent,
      sensitive: doc.sensitive,
      usable: doc.usable,
      people: doc.people,
    });
    if (blockers.length) {
      skipped.push({ id: doc._id, reason: blockers.join('; ') });
      return;
    }
    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: approvalSet({}, { confirm, note: req.body.note, req }) },
      },
    });
    approved.push(doc._id);
  });

  const found = new Set(docs.map((d) => String(d._id)));
  ids.filter((id) => !found.has(String(id)))
    .forEach((id) => skipped.push({ id, reason: 'not found' }));

  if (ops.length) await MediaAsset.bulkWrite(ops);
  if (skipped.length) {
    logger.warn(`media bulk-approve by ${reviewerName(req)}: `
      + `${approved.length} approved, ${skipped.length} skipped`);
  }

  res.json({
    status: 'success',
    message: `Approved ${approved.length} of ${ids.length}.`,
    data: { approved, skipped },
  });
};


/**
 * GET /admin/media/searches
 *
 * The nine ways people actually ask for media, with a live count each.
 *
 * These were written in lib/mediaSearches and then referenced by nothing:
 * no route exposed them, so the vocabulary the taxonomy work produced was
 * unreachable from any client. This is that route.
 *
 * Three of them are marked `requiresJob`: industry, genre and client type
 * cannot be read off a photograph, so they are answered from the job
 * record and are empty until jobs exist. They are returned anyway, with
 * the flag and their available values, because a chip that is visibly
 * empty is information and a chip that is silently missing is not.
 */
const savedSearches = async (req, res) => {
  const base = buildGovernanceFilter(req.query);

  const rows = await Promise.all(
    Object.entries(SAVED_SEARCHES).map(async ([key, def]) => {
      const row = {
        key,
        label: def.label,
        note: def.note || '',
        requiresJob: Boolean(def.requiresJob),
        values: [],
        count: 0,
      };

      if (def.requiresJob) {
        /* The distinct values that actually exist, so the UI offers real
         * options rather than an empty dropdown. NDA jobs are excluded:
         * a client type nobody may know about is not a facet. */
        row.values = (await MediaJob.distinct(key, { nda: { $ne: true } }))
          .filter(Boolean).sort();
        const jobIds = await MediaJob.find({ nda: { $ne: true } }).distinct('_id');
        row.count = jobIds.length
          ? await MediaAsset.countDocuments({ ...base, ...def.filter(jobIds) })
          : 0;
      } else {
        row.count = await MediaAsset.countDocuments({ ...base, ...def.filter() });
      }
      return row;
    }),
  );

  res.json({ status: 'success', data: rows });
};

/**
 * Turn ?search=<key> (+ ?value=) into filter conditions.
 *
 * Kept out of buildGovernanceFilter because the job-derived searches need
 * a database round trip and that function is deliberately synchronous and
 * pure — it is the guard, and a guard that can await is a guard that can
 * be forgotten in a branch.
 */
const savedSearchFilter = async (query = {}) => {
  const def = SAVED_SEARCHES[query.search];
  if (!def) return null;
  if (!def.requiresJob) return def.filter();

  const jobFilter = { nda: { $ne: true } };
  if (query.value) jobFilter[query.search] = query.value;
  const jobIds = await MediaJob.find(jobFilter).distinct('_id');
  return def.filter(jobIds);
};

module.exports = {
  savedSearches,
  download,
  rendition,
  runRenditionQueue,
  // ingest
  upload,
  // browse
  index,
  show,
  update,
  // review
  reviewQueue,
  approve,
  reject,
  bulkApprove,
  // describe
  redescribe,
  runQueue,
  stats,
  // lifecycle
  destroy,
  // shared with mediaPersonController so person search cannot become a
  // laxer door into the library than this one
  buildGovernanceFilter,
  toPublic,
};
