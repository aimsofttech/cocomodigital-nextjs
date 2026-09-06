/**
 * Who is probably in this frame — without a face-recognition model.
 *
 * THE PROBLEM
 *
 * Naming people by hand does not survive contact with a real shoot. Two
 * hundred frames come off one afternoon, the same six people are in most
 * of them, and tagging each one individually is work nobody will do twice.
 * So the tags stop after the first folder and the person index — the whole
 * reason for tagging — is permanently half-empty.
 *
 * WHY THIS IS NOT FACE RECOGNITION
 *
 * Recognising a face needs a detection model and an embedding, neither of
 * which exists here: no sharp, no tfjs, no Rekognition, and MongoDB is
 * local so there is no vector index to search embeddings against. Adding
 * one is a real decision with a real bill, and it is not this file's to
 * make.
 *
 * But recognition is not what most of the value needs. The question
 * "who is in this photograph" is nearly always answered by "the same
 * people who are in the photographs either side of it". That is free,
 * it is computable from tags that already exist, and it gets the six
 * regulars in a shoot folder without looking at a single pixel.
 *
 * So this ranks candidates from context and shows its reasoning. What it
 * cannot do is tell two people apart in a frame it has never seen anyone
 * tagged in — for that, a first tag on any asset in the drop seeds
 * everything after it.
 *
 * WHY IT SUGGESTS AND NEVER ASSERTS
 *
 * A wrong name here is not a cosmetic error. mediaPersonController drops
 * `usable` when the person tagged has refused a release, so an incorrect
 * auto-tag can silently make a good asset unpublishable — or, in the
 * other direction, leave a real refusal unrecorded because the system
 * "already tagged" somebody else. Context is strong evidence and it is
 * not proof, and the gap between those two is exactly where a person
 * belongs. One click is cheap; an unnoticed wrong name is not.
 */
const mongoose = require('mongoose');
const MediaAsset = require('../models/MediaAsset');
const MediaPerson = require('../models/MediaPerson');

/* Weights, in the order the evidence deserves to be trusted.
 *
 * A drop is one afternoon in one room, so it is the strongest signal we
 * have. A job spans months and locations, so it is weaker. Studio-wide
 * frequency is barely evidence at all — it says "this person is in a lot
 * of photographs", which is true of Anil in every folder — so it only
 * ever breaks ties and can never carry a suggestion on its own. */
const W_FOLDER = 3;
const W_JOB = 1.5;
const W_GLOBAL = 0.4;

/** Below this, a candidate is noise and is not worth a row on screen. */
const FLOOR = 0.35;

const countPeopleAcross = async (match, excludeId) => {
  const rows = await MediaAsset.aggregate([
    { $match: { ...match, _id: { $ne: excludeId }, 'taggedPeople.0': { $exists: true } } },
    { $project: { people: '$taggedPeople.person' } },
    { $unwind: '$people' },
    { $group: { _id: '$people', n: { $sum: 1 } } },
  ]);
  const total = await MediaAsset.countDocuments({
    ...match, _id: { $ne: excludeId }, 'taggedPeople.0': { $exists: true },
  });
  return { counts: rows, total };
};

/**
 * Ranked candidates for one asset.
 *
 * Returns [{ personId, name, role, score, confidence, reasons[] }].
 * Already-tagged people are excluded — suggesting somebody who is already
 * named is noise, and it is the fastest way to teach people to ignore the
 * whole row.
 */
const suggestFor = async (asset, { limit = 6 } = {}) => {
  if (!asset) return [];

  const already = new Set((asset.taggedPeople || []).map((t) => String(t.person)));
  const bucket = new Map();

  const add = (personId, weight, ratio, reason) => {
    const id = String(personId);
    if (already.has(id)) return;
    const row = bucket.get(id) || { score: 0, reasons: [] };
    row.score += weight * ratio;
    row.reasons.push(reason);
    bucket.set(id, row);
  };

  /* 1. The drop. Same folder means the same afternoon in the same room. */
  if (asset.folder) {
    const { counts, total } = await countPeopleAcross({ folder: asset.folder }, asset._id);
    counts.forEach((c) => {
      if (!total) return;
      add(c._id, W_FOLDER, c.n / total,
        `in ${c.n} of ${total} tagged ${total === 1 ? 'frame' : 'frames'} from this drop`);
    });
  }

  /* 2. The project. Weaker: a job can span months and several locations. */
  if (asset.job) {
    const { counts, total } = await countPeopleAcross({ job: asset.job }, asset._id);
    counts.forEach((c) => {
      if (!total) return;
      add(c._id, W_JOB, c.n / total, `in ${c.n} of ${total} tagged on this project`);
    });
  }

  /* 3. Studio-wide frequency. A tie-breaker, never a reason on its own —
   *    which is why it is only added for candidates something else has
   *    already surfaced. */
  if (bucket.size) {
    const { counts, total } = await countPeopleAcross({}, asset._id);
    const top = counts.sort((a, b) => b.n - a.n).slice(0, 10);
    top.forEach((c) => {
      if (!bucket.has(String(c._id)) || !total) return;
      const row = bucket.get(String(c._id));
      row.score += W_GLOBAL * (c.n / total);
    });
  }

  const ids = [...bucket.keys()].filter((id) => bucket.get(id).score >= FLOOR);
  if (!ids.length) return [];

  /* Leavers are excluded from suggestions the same way they are excluded
   * from the picker: they stay tagged in historic frames, and proposing
   * them for a shoot that happened after they left is noise. */
  const people = await MediaPerson.find({
    _id: { $in: ids.map((i) => new mongoose.Types.ObjectId(i)) },
    status: 1,
  }).select('_id name role release');

  return people
    .map((p) => {
      const row = bucket.get(String(p._id));
      return {
        personId: p._id,
        name: p.name,
        role: p.role || '',
        release: p.release,
        score: Number(row.score.toFixed(3)),
        /* Words, not a number. "0.82" invites a reader to believe it means
         * something calibrated; "likely" is honest about being a ranking. */
        confidence: row.score >= 1.5 ? 'likely' : row.score >= 0.8 ? 'possible' : 'a guess',
        reasons: row.reasons,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

module.exports = { suggestFor, W_FOLDER, W_JOB, W_GLOBAL, FLOOR };
