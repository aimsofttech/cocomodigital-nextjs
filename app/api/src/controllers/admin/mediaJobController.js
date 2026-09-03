const mongoose = require('mongoose');
const slugify = require('slugify');
const MediaJob = require('../../models/MediaJob');
const MediaAsset = require('../../models/MediaAsset');
const logger = require('../../utils/logger');

/**
 * Media jobs — the project record every uploaded asset inherits from.
 *
 * The model has existed since the taxonomy work and had no controller and
 * no route, so `client`, `clientType`, `industry`, `genre` and `nda` could
 * not be created from anywhere. Three of the nine saved searches are
 * answered from this collection, which meant three permanently empty
 * facets; and `nda` — the flag that decides whether a client's unreleased
 * material may be shown at all — could only be set by editing the
 * database by hand.
 *
 * A job is deliberately cheap: a name, a client, three classifications
 * chosen once at upload. The moment a folder is dropped is the only
 * moment those are cheaply known, because none of them can be read off a
 * photograph afterwards.
 */

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

const EDITABLE = ['name', 'client', 'clientType', 'industry', 'genre', 'nda', 'notes', 'status'];

/** The enum values, straight off the schema, so the UI never hard-codes them. */
const options = (_req, res) => {
  const pick = (field) => MediaJob.schema.path(field).enumValues;
  res.json({
    status: 'success',
    data: {
      clientType: pick('clientType'),
      industry: pick('industry'),
      genre: pick('genre'),
    },
  });
};

const toPublic = (doc, counts = {}) => ({
  id: doc._id,
  name: doc.name,
  slug: doc.slug,
  client: doc.client,
  clientType: doc.clientType,
  industry: doc.industry,
  genre: doc.genre,
  nda: doc.nda,
  notes: doc.notes,
  status: doc.status,
  assetCount: counts[String(doc._id)] || 0,
  createdAt: doc.createdAt,
});

const pickEditable = (body = {}) => {
  const patch = {};
  EDITABLE.forEach((f) => {
    if (Object.prototype.hasOwnProperty.call(body, f)) patch[f] = body[f];
  });
  if (typeof patch.nda !== 'undefined') patch.nda = Boolean(patch.nda);
  if (typeof patch.status !== 'undefined') patch.status = Number(patch.status) ? 1 : 0;
  return patch;
};

/** GET /admin/api/media-jobs */
const index = async (req, res) => {
  const filter = {};
  if (req.query.q) filter.$or = [
    { name: new RegExp(String(req.query.q).trim(), 'i') },
    { client: new RegExp(String(req.query.q).trim(), 'i') },
  ];
  if (req.query.nda === '1') filter.nda = true;
  if (req.query.status) filter.status = Number(req.query.status);

  const jobs = await MediaJob.find(filter).sort({ createdAt: -1 }).limit(200);

  /* One aggregate rather than a countDocuments per job: this list is a
   * picker and will be opened on every upload. */
  const counts = {};
  if (jobs.length) {
    const rows = await MediaAsset.aggregate([
      { $match: { job: { $in: jobs.map((j) => j._id) } } },
      { $group: { _id: '$job', n: { $sum: 1 } } },
    ]);
    rows.forEach((r) => { counts[String(r._id)] = r.n; });
  }

  res.json({ status: 'success', data: jobs.map((j) => toPublic(j, counts)) });
};

/** GET /admin/api/media-jobs/:id */
const show = async (req, res) => {
  if (!OBJECT_ID_RE.test(String(req.params.id))) {
    return res.status(404).json({ status: 'error', message: 'Not found' });
  }
  const doc = await MediaJob.findById(req.params.id);
  if (!doc) return res.status(404).json({ status: 'error', message: 'Not found' });
  const n = await MediaAsset.countDocuments({ job: doc._id });
  res.json({ status: 'success', data: toPublic(doc, { [String(doc._id)]: n }) });
};

/** POST /admin/api/media-jobs */
const create = async (req, res) => {
  const patch = pickEditable(req.body);
  if (!patch.name || !String(patch.name).trim()) {
    return res.status(400).json({
      status: 'error',
      message: 'A job needs a name. It is what people pick from at upload.',
    });
  }
  patch.slug = slugify(String(patch.name), { lower: true, strict: true });

  try {
    const doc = await MediaJob.create(patch);
    logger.info(`media job created: ${doc.name}${doc.nda ? ' (NDA)' : ''}`);
    return res.status(201).json({ status: 'success', message: 'Job created', data: toPublic(doc) });
  } catch (err) {
    /* Enum violations arrive here. The schema's own message names the
     * field and the allowed values, which is more use than "invalid". */
    return res.status(400).json({ status: 'error', message: err.message });
  }
};

/**
 * PATCH /admin/api/media-jobs/:id
 *
 * Changing `nda` fans out to every asset on the job.
 *
 * The flag is denormalised onto assets so that reads can filter it
 * without a join. That is what makes the protection reliable, and it is
 * also what makes this update a two-step: a job flipped to NDA whose
 * assets still say `nda: false` is a job that is confidential in the
 * record and public in every query. The fan-out is the price of the
 * denormalisation and it is paid here, loudly, rather than left to a
 * nightly job nobody remembers.
 */
const update = async (req, res) => {
  if (!OBJECT_ID_RE.test(String(req.params.id))) {
    return res.status(404).json({ status: 'error', message: 'Not found' });
  }
  const before = await MediaJob.findById(req.params.id);
  if (!before) return res.status(404).json({ status: 'error', message: 'Not found' });

  const patch = pickEditable(req.body);
  if (patch.name) patch.slug = slugify(String(patch.name), { lower: true, strict: true });

  let doc;
  try {
    doc = await MediaJob.findByIdAndUpdate(req.params.id, patch, {
      new: true, runValidators: true,
    });
  } catch (err) {
    return res.status(400).json({ status: 'error', message: err.message });
  }

  let fannedOut = 0;
  if (typeof patch.nda !== 'undefined' && patch.nda !== before.nda) {
    const r = await MediaAsset.updateMany({ job: doc._id }, { $set: { nda: doc.nda } });
    fannedOut = r.modifiedCount || 0;
    logger.info(
      `media job ${doc.name}: nda ${before.nda} → ${doc.nda}, ${fannedOut} asset(s) updated`,
    );
  }

  res.json({
    status: 'success',
    message: fannedOut
      ? `Job updated. ${fannedOut} asset(s) followed the NDA change.`
      : 'Job updated',
    data: toPublic(doc),
  });
};

/**
 * DELETE /admin/api/media-jobs/:id
 *
 * Refused while assets still point at it. Deleting the job would strip
 * the industry, genre and client type from every one of them and — worse
 * — orphan the NDA flag's origin, leaving assets marked confidential with
 * nothing left to say why. Detach or reassign them first, deliberately.
 */
const destroy = async (req, res) => {
  if (!OBJECT_ID_RE.test(String(req.params.id))) {
    return res.status(404).json({ status: 'error', message: 'Not found' });
  }
  const doc = await MediaJob.findById(req.params.id);
  if (!doc) return res.status(404).json({ status: 'error', message: 'Not found' });

  const n = await MediaAsset.countDocuments({ job: doc._id });
  if (n > 0) {
    return res.status(409).json({
      status: 'error',
      message: `${n} asset(s) still belong to this job. Move or remove them first — `
             + 'deleting the job would take their client, industry and genre with it.',
    });
  }

  await doc.deleteOne();
  res.json({ status: 'success', message: 'Job deleted' });
};

module.exports = { index, show, create, update, destroy, options };
