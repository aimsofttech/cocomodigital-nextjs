const mongoose = require('mongoose');
const MediaPerson = require('../../models/MediaPerson');
const MediaAsset = require('../../models/MediaAsset');
const { generateSlug } = require('../../utils/helpers');
const { buildGovernanceFilter, toPublic } = require('./mediaAssetController');
const logger = require('../../utils/logger');
const { suggestFor } = require('../../lib/peopleSuggestions');

/**
 * Person tagging — "this is Dishan Puzari".
 *
 * Two rules shape everything below.
 *
 * 1. A NAME IS ALWAYS HUMAN-SET. There is no path from the describe
 *    worker to a name and there must never be one. The model can count
 *    heads; it cannot tell Anil from any other bearded man in a black
 *    t-shirt, and a wrong name on a client's photograph is not a bad
 *    guess we can quietly fix — it is a claim Cocoma made in writing.
 *
 * 2. NAMING SOMEBODY MUST NOT WIDEN WHAT IS PUBLISHABLE. Every query
 *    here runs through the same governance filter the main search uses,
 *    so /media/people/:id/assets cannot become the lax door that
 *    /media is not. The library holds client key art and photographs of
 *    a child in the office next to our own edit-floor shots; a second
 *    entrance with its own idea of what is safe is how one of those
 *    escapes.
 *
 * Like the rest of the media module, nothing in this file calls a model
 * or spends a rupee. It is Mongo, start to finish.
 */

// Reading the allowed values off the schema instead of retyping them is
// what stops this file and the model disagreeing after someone adds a
// release state and only updates one of the two.
const KINDS = MediaPerson.schema.path('kind').enumValues;
const RELEASES = MediaPerson.schema.path('release').enumValues;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const fail = (res, code, message, data) =>
  res.status(code).json({ status: 'error', message, ...(data ? { data } : {}) });

const personPublic = (doc, assetCount) => ({
  id: doc._id,
  name: doc.name,
  slug: doc.slug,
  kind: doc.kind,
  role: doc.role,
  email: doc.email,
  release: doc.release,
  notes: doc.notes,
  status: doc.status,
  ...(assetCount === undefined ? {} : { assetCount }),
  createdAt: doc.createdAt,
});

/**
 * Turn whatever the client sent into a stored box, or refuse it.
 *
 * The refusal matters more than the storage. By a wide margin the
 * likeliest integration bug is a UI handing us the pixel rect its canvas
 * produced — `{ x: 1420, y: 380, w: 210, h: 260 }`. Clamped into range
 * that becomes a full-frame smear pinned to one corner, which looks like
 * a working feature and is not. So anything above 1 is rejected with the
 * arithmetic the caller needs, rather than salvaged.
 *
 * Six decimal places is finer than one pixel on an 8K frame, and keeps
 * a forty-face group shot from carrying forty float tails.
 */
const EPS = 1e-6;
const normaliseBox = (raw) => {
  if (raw === undefined || raw === null || raw === '') return { box: null };
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { error: 'box must be an object with x, y, w and h as 0-1 fractions.' };
  }

  const v = {};
  for (const k of ['x', 'y', 'w', 'h']) {
    const n = Number(raw[k]);
    if (!Number.isFinite(n)) return { error: `box.${k} must be a number between 0 and 1.` };
    v[k] = n;
  }

  if (v.x > 1 + EPS || v.y > 1 + EPS || v.w > 1 + EPS || v.h > 1 + EPS) {
    return {
      error: 'box must be 0-1 fractions of the frame, not pixels. Divide x and w '
           + 'by the rendered width and y and h by the rendered height.',
    };
  }
  if (v.x < -EPS || v.y < -EPS) return { error: 'box.x and box.y cannot be negative.' };
  if (v.w <= 0 || v.h <= 0) return { error: 'box.w and box.h must be greater than zero.' };
  if (v.x + v.w > 1 + EPS || v.y + v.h > 1 + EPS) {
    return { error: 'box runs off the frame: x + w and y + h must not exceed 1.' };
  }

  const round = (n) => Math.min(Math.max(Number(n.toFixed(6)), 0), 1);
  return { box: { x: round(v.x), y: round(v.y), w: round(v.w), h: round(v.h) } };
};

/**
 * GET /admin/media/people
 *
 * Query params: q, kind, release, includeInactive=1, withCounts=1, page, limit
 *
 * `q` is a regex and not a text index on purpose. This collection is
 * about sixty rows; a collection scan over sixty documents is cheaper
 * than the write cost and the maintenance of an index, and Mongo's one
 * text index per collection is a budget worth not spending here.
 */
const listPeople = async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 200);
  const skip = (page - 1) * limit;

  const filter = {};
  // Leavers stay tagged in historic photographs but are off the picker
  // by default, so nobody attributes next week's shoot to somebody who
  // left in March.
  if (req.query.includeInactive !== '1') filter.status = 1;
  if (req.query.kind && KINDS.includes(req.query.kind)) filter.kind = req.query.kind;
  if (req.query.release && RELEASES.includes(req.query.release)) filter.release = req.query.release;

  const q = (req.query.q || '').trim();
  if (q) filter.name = { $regex: escapeRegex(q), $options: 'i' };

  const [people, total] = await Promise.all([
    MediaPerson.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    MediaPerson.countDocuments(filter),
  ]);

  // Counts are opt-in. They are a second aggregation over media_assets,
  // and the picker that runs on every keystroke does not need them.
  let counts = null;
  if (req.query.withCounts === '1' && people.length) {
    const ids = people.map((p) => p._id);
    const rows = await MediaAsset.aggregate([
      { $match: { status: 1, 'taggedPeople.person': { $in: ids } } },
      { $unwind: '$taggedPeople' },
      { $match: { 'taggedPeople.person': { $in: ids } } },
      { $group: { _id: '$taggedPeople.person', n: { $sum: 1 } } },
    ]);
    counts = new Map(rows.map((r) => [String(r._id), r.n]));
  }

  res.json({
    status: 'success',
    message: 'People fetched successfully',
    data: people.map((p) => personPublic(p, counts ? (counts.get(String(p._id)) || 0) : undefined)),
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
};

/**
 * POST /admin/media/people
 *
 * A duplicate is refused rather than created, and the refusal hands back
 * the row that already exists so the UI can offer "use this one". Two
 * rows for one person is the failure this directory exists to prevent:
 * it splits "every photograph of Dishan" in half and the half you get
 * still looks like a complete answer.
 */
const createPerson = async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return fail(res, 400, 'A name is required.');

  const kind = KINDS.includes(req.body.kind) ? req.body.kind : 'internal';
  const release = RELEASES.includes(req.body.release) ? req.body.release : 'unknown';
  const email = String(req.body.email || '').trim().toLowerCase();
  if (email && !EMAIL_RE.test(email)) return fail(res, 400, 'That email address is not valid.');

  const slug = generateSlug(name);
  if (!slug) return fail(res, 400, 'That name does not produce a usable identifier.');

  const existing = await MediaPerson.findOne({ slug });
  if (existing) {
    return fail(res, 409, `${existing.name} is already in the directory.`, personPublic(existing));
  }

  try {
    const doc = await MediaPerson.create({
      name,
      slug,
      kind,
      release,
      role: String(req.body.role || '').trim(),
      email,
      notes: String(req.body.notes || '').trim(),
      status: req.body.status === 0 ? 0 : 1,
      userId: (req.user && req.user._id) || null,
    });
    return res.status(201).json({
      status: 'success', message: 'Person added successfully', data: personPublic(doc),
    });
  } catch (err) {
    // The unique index is the real guarantee; the findOne above only
    // makes the common case a friendly 409 rather than a 500.
    if (err.code === 11000) {
      return fail(res, 409, 'Somebody with that name is already in the directory.');
    }
    logger.error(`mediaPerson create failed: ${err.message}`);
    return fail(res, 400, err.message);
  }
};

/**
 * PATCH /admin/media/people/:personId
 *
 * Renaming re-derives the slug, so the dedupe key tracks the name it is
 * meant to dedupe. Without that a typo fixed today leaves the collision
 * guard pointing at the typo forever.
 */
const updatePerson = async (req, res) => {
  const { personId } = req.params;
  if (!mongoose.isValidObjectId(personId)) return fail(res, 400, 'Invalid person id.');

  const patch = {};
  if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
    const name = String(req.body.name || '').trim();
    if (!name) return fail(res, 400, 'A name is required.');
    const slug = generateSlug(name);
    if (!slug) return fail(res, 400, 'That name does not produce a usable identifier.');
    const clash = await MediaPerson.findOne({ slug, _id: { $ne: personId } });
    if (clash) return fail(res, 409, `${clash.name} already uses that name.`, personPublic(clash));
    patch.name = name;
    patch.slug = slug;
  }
  if (req.body.kind !== undefined) {
    if (!KINDS.includes(req.body.kind)) return fail(res, 400, `kind must be one of: ${KINDS.join(', ')}`);
    patch.kind = req.body.kind;
  }
  if (req.body.release !== undefined) {
    if (!RELEASES.includes(req.body.release)) {
      return fail(res, 400, `release must be one of: ${RELEASES.join(', ')}`);
    }
    patch.release = req.body.release;
  }
  if (req.body.email !== undefined) {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (email && !EMAIL_RE.test(email)) return fail(res, 400, 'That email address is not valid.');
    patch.email = email;
  }
  if (req.body.role !== undefined) patch.role = String(req.body.role || '').trim();
  if (req.body.notes !== undefined) patch.notes = String(req.body.notes || '').trim();
  if (req.body.status !== undefined) patch.status = Number(req.body.status) === 0 ? 0 : 1;

  if (!Object.keys(patch).length) {
    return fail(res, 400, 'No editable fields provided.');
  }

  const doc = await MediaPerson.findByIdAndUpdate(personId, patch, { new: true });
  if (!doc) return fail(res, 404, 'Person not found');
  res.json({ status: 'success', message: 'Updated successfully', data: personPublic(doc) });
};

/**
 * POST /admin/media/:id/people   { personId, box?, note? }
 *
 * Idempotent per person. A click-to-tag UI double-fires constantly —
 * a double click, a re-submitted form, an impatient second tap on a slow
 * connection — and the useful model of this data is "who is in this
 * photograph", not "how many times did somebody say so". Tagging a
 * person who is already tagged therefore updates their entry instead of
 * adding a second one.
 *
 * The trade-off, stated so it is a choice and not an accident: one
 * person cannot be boxed twice in the same frame (they appear once, and
 * again in a monitor behind them). That has not come up; a second entry
 * per person would make every "is this person tagged" check a
 * multi-result problem, which has.
 *
 * `box` is optional, and only replaced when the key is present in the
 * body — send `box: null` to clear one, omit it to leave it alone.
 */
const tag = async (req, res) => {
  const assetId = req.params.id;
  const personId = req.body.personId || req.body.person;
  if (!mongoose.isValidObjectId(assetId)) return fail(res, 400, 'Invalid asset id.');
  if (!mongoose.isValidObjectId(personId)) {
    return fail(res, 400, 'A personId is required. Create the person in the directory first.');
  }

  const [asset, person] = await Promise.all([
    MediaAsset.findById(assetId).select('_id taggedPeople usable'),
    // Deliberately not filtered on status: a leaver is still the person
    // in a 2024 photograph, and refusing to name them would make the
    // archive permanently wrong to protect a picker default.
    MediaPerson.findById(personId),
  ]);
  if (!asset) return fail(res, 404, 'Asset not found');
  if (!person) return fail(res, 404, 'Person not found. Add them to the directory first.');

  const hasBox = Object.prototype.hasOwnProperty.call(req.body, 'box');
  const { box, error } = normaliseBox(hasBox ? req.body.box : null);
  if (error) return fail(res, 400, error);

  const note = String(req.body.note || '').trim();
  const taggedBy = (req.user && req.user._id) || null;
  const warnings = [];

  /* Naming somebody who refused a release makes the asset unpublishable,
   * and the flag is dropped here rather than left to a reviewer noticing
   * a warning. Note the direction: this only ever REMOVES publishability.
   * It cannot grant it, so at worst somebody re-ticks `usable` after
   * resolving the release — the opposite mistake puts a person who said
   * no on a Cocoma page.
   *
   * The tag itself is never blocked. Knowing they are in the frame is
   * precisely what makes excluding it possible; refusing to record it
   * would destroy the only evidence. */
  const mustDemote = person.release === 'refused' && asset.usable === true;
  if (mustDemote) {
    warnings.push(`${person.name} has refused a release, so this asset is no longer marked usable.`);
    logger.warn(`mediaPerson: asset ${asset._id} demoted to usable=false — ${person.name} refused release`);
  }

  /* `|| []` because a projection that ever stops including the array would
   * otherwise turn a tag click into a 500. The select above does include it;
   * the guard is for the day somebody trims that string. */
  const already = (asset.taggedPeople || []).some((t) => String(t.person) === String(person._id));
  let doc;

  if (already) {
    const set = {
      'taggedPeople.$.taggedBy': taggedBy,
      'taggedPeople.$.taggedAt': new Date(),
    };
    if (hasBox) set['taggedPeople.$.box'] = box;
    if (note) set['taggedPeople.$.note'] = note;
    if (mustDemote) set.usable = false;
    doc = await MediaAsset.findOneAndUpdate(
      { _id: asset._id, 'taggedPeople.person': person._id },
      { $set: set },
      { new: true },
    );
  } else {
    // The `$ne` in the filter is the concurrency guard: two clicks that
    // race both read "not tagged", and without it both would push.
    const update = {
      $push: {
        taggedPeople: {
          _id: new mongoose.Types.ObjectId(),
          person: person._id,
          taggedBy,
          taggedAt: new Date(),
          box,
          note,
        },
      },
    };
    if (mustDemote) update.$set = { usable: false };
    doc = await MediaAsset.findOneAndUpdate(
      { _id: asset._id, 'taggedPeople.person': { $ne: person._id } },
      update,
      { new: true },
    );
  }

  // Null means we lost the race — the other request already put the
  // asset in the state we wanted, so read it back rather than erroring.
  if (!doc) doc = await MediaAsset.findById(asset._id);
  if (!doc) return fail(res, 404, 'Asset not found');

  res.json({
    status: 'success',
    message: already ? 'Tag updated successfully' : `Tagged as ${person.name}`,
    data: {
      ...toPublic(doc),
      person: personPublic(person),
      ...(warnings.length ? { warnings } : {}),
    },
  });
};

/**
 * DELETE /admin/media/:id/people/:personId   (optional ?tagId=)
 *
 * Removes the person from the photograph, which is what the button in
 * the UI means. `tagId` narrows it to one entry, which only matters if a
 * future change ever allows two boxes for one person; today it is a
 * no-op that costs nothing to support and saves a route later.
 */
const untag = async (req, res) => {
  const { id, personId } = req.params;
  if (!mongoose.isValidObjectId(id)) return fail(res, 400, 'Invalid asset id.');
  if (!mongoose.isValidObjectId(personId)) return fail(res, 400, 'Invalid person id.');

  const asset = await MediaAsset.findById(id).select('_id taggedPeople');
  if (!asset) return fail(res, 404, 'Asset not found');

  const match = { person: new mongoose.Types.ObjectId(personId) };
  if (req.query.tagId && mongoose.isValidObjectId(req.query.tagId)) {
    match._id = new mongoose.Types.ObjectId(req.query.tagId);
  }

  const before = (asset.taggedPeople || []).length;
  const doc = await MediaAsset.findByIdAndUpdate(
    id, { $pull: { taggedPeople: match } }, { new: true },
  );
  if (!doc) return fail(res, 404, 'Asset not found');
  const removed = before - (doc.taggedPeople || []).length;

  if (!removed) return fail(res, 404, 'That person is not tagged in this asset.');

  /* `usable` is not restored here. It was cleared by a human decision or
   * by a refused release, and untagging is not evidence that whatever
   * caused it has been resolved. Re-granting publishability is a
   * deliberate edit through PATCH /media/:id. */
  res.json({
    status: 'success',
    message: 'Tag removed successfully',
    data: { ...toPublic(doc), removed },
  });
};

/**
 * GET /admin/media/people/:personId/assets
 *
 * "Every photograph with Dishan in it." Runs through the SAME governance
 * filter as the main search — sensitive excluded unless two explicit
 * flags are passed, publishable=1 forcing rights=own — because a second
 * way into the library with its own idea of what is safe is how a
 * client's talent ends up on a careers page.
 */
const assetsByPerson = async (req, res) => {
  const { personId } = req.params;
  if (!mongoose.isValidObjectId(personId)) return fail(res, 400, 'Invalid person id.');

  const person = await MediaPerson.findById(personId);
  if (!person) return fail(res, 404, 'Person not found');

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 24, 1), 100);
  const skip = (page - 1) * limit;

  const filter = buildGovernanceFilter(req.query);
  filter['taggedPeople.person'] = person._id;

  const [data, total] = await Promise.all([
    MediaAsset.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('taggedPeople.person', 'name kind release'),
    MediaAsset.countDocuments(filter),
  ]);

  res.json({
    status: 'success',
    message: 'Assets fetched successfully',
    data: data.map(toPublic),
    person: personPublic(person),
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
};



/**
 * GET /admin/api/media/:id/people/suggestions
 *
 * Who is probably in this frame, inferred from who is in the frames
 * around it. See lib/peopleSuggestions for why this is context and not
 * face recognition, and why it never applies itself.
 */
const suggestions = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 400, 'Invalid asset id.');
  const asset = await MediaAsset.findById(req.params.id)
    .select('_id folder job taggedPeople');
  if (!asset) return fail(res, 404, 'Asset not found');
  const data = await suggestFor(asset);
  res.json({ status: 'success', data });
};

/**
 * POST /admin/api/media/people/:personId/tag-batch
 *
 * Name one person across a whole drop or project in one action.
 *
 * This is the point of the suggestions, not a convenience on top of them.
 * Tagging two hundred frames one at a time is work that does not get
 * done, so the person index stays empty and every search that depends on
 * it returns nothing. Naming somebody once and saying "and in the rest of
 * this shoot" is the difference between a feature and a feature people use.
 *
 * Scope must be given explicitly as a folder or a job. There is
 * deliberately no "everything" — a mistake at that scale is not
 * correctable by hand, and nothing about this operation is worth that.
 *
 * No box is written. A box is a position in one particular frame and
 * cannot be carried to another; assets tagged this way carry the name and
 * no coordinates, which is exactly as much as is actually known.
 */
const tagBatch = async (req, res) => {
  const { personId } = req.params;
  if (!mongoose.isValidObjectId(personId)) return fail(res, 400, 'Invalid person id.');

  const folder = String(req.body.folder || '').trim();
  const jobId = String(req.body.job || '').trim();
  if (!folder && !jobId) {
    return fail(res, 400, 'Give a folder or a job. There is no option to tag everything.');
  }
  if (jobId && !mongoose.isValidObjectId(jobId)) return fail(res, 400, 'Invalid job id.');

  const person = await MediaPerson.findById(personId);
  if (!person) return fail(res, 404, 'Person not found. Add them to the directory first.');

  const scope = folder ? { folder } : { job: new mongoose.Types.ObjectId(jobId) };
  /* Only frames they are not already in — re-tagging would rewrite
   * taggedAt and taggedBy across the set and destroy the record of who
   * actually named them first. */
  const targets = await MediaAsset.find({
    ...scope,
    'taggedPeople.person': { $ne: person._id },
  }).select('_id usable');

  if (!targets.length) {
    return res.json({
      status: 'success',
      message: `${person.name} is already named in every frame in that scope.`,
      data: { tagged: 0, demoted: 0 },
    });
  }

  const taggedBy = (req.user && req.user._id) || null;
  const entry = { person: person._id, taggedBy, taggedAt: new Date(), box: null, note: '' };

  const ops = targets.map((t) => ({
    updateOne: {
      filter: { _id: t._id },
      update: {
        $push: { taggedPeople: entry },
        /* Same rule the single-tag path applies, and for the same reason:
         * naming somebody who refused a release makes the asset
         * unpublishable, and that must not depend on anyone noticing a
         * warning. It can only ever remove publishability, never grant it. */
        ...(person.release === 'refused' ? { $set: { usable: false } } : {}),
      },
    },
  }));

  await MediaAsset.bulkWrite(ops);

  const demoted = person.release === 'refused'
    ? targets.filter((t) => t.usable === true).length
    : 0;

  logger.info(
    `mediaPerson: ${person.name} tagged across ${targets.length} asset(s) in `
    + `${folder ? `folder "${folder}"` : `job ${jobId}`}`
    + (demoted ? ` — ${demoted} demoted to usable=false (release refused)` : ''),
  );

  res.json({
    status: 'success',
    message: demoted
      ? `${person.name} named in ${targets.length} more. ${demoted} are no longer marked usable — they refused a release.`
      : `${person.name} named in ${targets.length} more.`,
    data: { tagged: targets.length, demoted },
  });
};

module.exports = {
  suggestions,
  tagBatch,
  listPeople,
  createPerson,
  updatePerson,
  tag,
  untag,
  assetsByPerson,
  // Exported for tests/mediaPersonTagging.test.js — the pixels-vs-fractions
  // guard is the one piece of logic here worth testing without a database.
  normaliseBox,
};
