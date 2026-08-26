const MediaAsset = require('../../models/MediaAsset');
const { buildS3Url, deleteFromS3 } = require('../../utils/s3Upload');
const { enqueue, describeNow, budgetStatus } = require('../../services/mediaDescriber');

/**
 * Media library — search, review and governance.
 *
 * READ PATH COSTS NOTHING. Every endpoint here is a Mongo query. No
 * model is called to answer a search, ever. Meaning was written once by
 * the describe worker; this file only reads it back.
 *
 * That is the entire economic design. Describing 10,000 assets is a
 * one-off spend in the low single-digit dollars. Searching them 10,000
 * times a month is zero. If search called a model instead, the same
 * usage would be a recurring monthly bill that grows with traffic.
 */

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
  describeStatus: doc.describeStatus,
  createdAt: doc.createdAt,
});

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
 *   page, limit
 *
 * `publishable=1` is the one most callers want. It is the guard that
 * stops a stock photograph or a client's key art being pulled onto a
 * page that claims to show our own work.
 */
const index = async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 24, 1), 100);
  const skip = (page - 1) * limit;

  const filter = { status: 1 };

  // Sensitive assets are excluded unless explicitly requested by an
  // admin reviewing the quarantine. They are never returned by default.
  if (req.query.includeSensitive === '1') {
    if (req.query.sensitive === '1') filter.sensitive = true;
  } else {
    filter.sensitive = false;
  }

  if (req.query.publishable === '1') {
    filter.rights = 'own';
    filter.usable = true;
  } else if (req.query.rights) {
    filter.rights = req.query.rights;
  }

  if (req.query.kind) filter.kind = req.query.kind;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.folder) filter.folder = req.query.folder;
  if (req.query.describeStatus) filter.describeStatus = req.query.describeStatus;
  if (req.query.reviewed) filter.reviewed = Number(req.query.reviewed);

  if (req.query.tags) {
    const tags = String(req.query.tags).split(',').map((t) => t.trim()).filter(Boolean);
    if (tags.length) filter.tags = { $all: tags };
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

const show = async (req, res) => {
  const doc = await MediaAsset.findById(req.params.id);
  if (!doc) return res.status(404).json({ status: 'error', message: 'Not found' });
  res.json({ status: 'success', data: doc });
};

/**
 * PATCH /admin/media/:id
 *
 * A human correcting the machine. Setting any meaning field marks the
 * row reviewed, which makes it immune to a later re-describe — we must
 * never let a model overwrite a person's correction.
 */
const update = async (req, res) => {
  const allowed = ['caption', 'altText', 'tags', 'category', 'rights',
                   'usable', 'sensitive', 'folder', 'status'];
  const patch = {};
  allowed.forEach((f) => {
    if (Object.prototype.hasOwnProperty.call(req.body, f)) patch[f] = req.body[f];
  });
  if (!Object.keys(patch).length) {
    return res.status(400).json({ status: 'error', message: 'No editable fields provided.' });
  }
  if (Array.isArray(patch.tags)) {
    patch.tags = patch.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
  }
  patch.reviewed = 1;

  const doc = await MediaAsset.findByIdAndUpdate(req.params.id, patch, { new: true });
  if (!doc) return res.status(404).json({ status: 'error', message: 'Not found' });
  res.json({ status: 'success', message: 'Updated successfully', data: toPublic(doc) });
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
  if (!others && doc.key) await deleteFromS3(doc.key);
  await doc.deleteOne();
  res.json({ status: 'success', message: 'Deleted successfully' });
};

module.exports = { index, show, update, redescribe, stats, runQueue, destroy };
