const mongoose = require('mongoose');

/**
 * MediaAsset — one row per file in the media library.
 *
 * The point of this collection is that finding a photograph should never
 * cost an API call. Describing a file is paid for ONCE, when it is
 * uploaded; every search afterwards is a plain Mongo query against the
 * text index below.
 *
 * Fields fall into three groups:
 *
 *   1. Identity and technical facts — free, derived from the file itself
 *      at upload (checksum, size, dimensions, duration).
 *   2. Meaning — caption, altText, tags, category. Written once by the
 *      describe worker, then read forever. This is what search matches.
 *   3. Governance — rights, consent and sensitive. These decide whether
 *      an asset may appear on a public page at all.
 *   4. Classification — shows, assetType and job. Two of these a vision
 *      model can read off the frame; the third cannot be seen in a
 *      photograph at all and is inherited from the job. See below.
 *
 * `checksum` is what makes the whole thing affordable. The same file
 * frequently arrives twice under different names; when the checksum
 * already exists we copy the existing description across instead of
 * paying a second vision call for identical bytes.
 */
/* A face, stored as fractions of the frame rather than pixels.
 *
 * The whole point of the rendition layer is that pixel dimensions vary —
 * the same photograph is served at 1920, at 1080, cropped to 9:16 and to
 * 1:1. A box in pixels is correct for exactly one of those. */
const faceBoxSchema = new mongoose.Schema({
  x: { type: Number, required: true, min: 0, max: 1 },
  y: { type: Number, required: true, min: 0, max: 1 },
  w: { type: Number, required: true, min: 0, max: 1 },
  h: { type: Number, required: true, min: 0, max: 1 },
}, { _id: false });

/**
 * One named person in one asset. Always human-set, never model-guessed.
 *
 * A vision model cannot tell Anil from any other bearded man in a black
 * t-shirt, and a wrong name on a client's photograph is worse than no
 * name. `people` above stays the model's count; this is who they are.
 *
 * `taggedBy` is not bookkeeping. A name is a claim somebody made, and
 * when it turns out to be the wrong person this is the only field that
 * says who to ask.
 *
 * `box` is optional deliberately. "Dishan is in this photograph" is a
 * useful, complete tag on its own, and demanding a rectangle before a
 * name can be recorded is how a tagging feature goes unused.
 */
const taggedPersonSchema = new mongoose.Schema({
  person: { type: mongoose.Schema.Types.ObjectId, ref: 'MediaPerson', required: true },
  taggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  taggedAt: { type: Date, default: Date.now },
  box: { type: faceBoxSchema, default: null },
  note: { type: String, trim: true, default: '' },
});

const mediaAssetSchema = new mongoose.Schema({
  // ---------------------------------------------------------- identity
  key: { type: String, required: true, trim: true, index: true }, // S3 object key
  url: { type: String, required: true, trim: true },
  originalName: { type: String, trim: true },
  checksum: { type: String, trim: true, index: true }, // sha256 of the bytes

  // -------------------------------------------------------- technical
  kind: { type: String, enum: ['image', 'video'], required: true, index: true },
  mimetype: { type: String, trim: true },
  bytes: { type: Number, default: 0 },
  width: { type: Number, default: null },
  height: { type: Number, default: null },
  duration: { type: Number, default: null }, // seconds, video only
  posterKey: { type: String, default: null }, // extracted video frame
  /* Derived copies, keyed by variant name -> storage key. Generated on
   * first request rather than at ingest, and shared by every row with the
   * same checksum, so the ~third of this library that is byte-identical
   * duplicates pays for one set between them. See services/mediaRenditions. */
  renditions: {
    type: Map,
    of: String,
    default: () => ({}),
  },

  // ----------------------------------------------------------- meaning
  // Written by the describe worker. Never edited by hand except to
  // correct it — a human correction is authoritative and is preserved
  // by setting reviewed = 1 so a re-describe cannot overwrite it.
  caption: { type: String, trim: true, default: '' },
  altText: { type: String, trim: true, default: '' },
  tags: { type: [String], default: [], index: true },
  category: { type: String, trim: true, default: '', index: true },
  people: { type: Number, default: 0 },
  ocrText: { type: String, trim: true, default: '' }, // text visible in frame

  // ----------------------------------------------------- classification
  // `shows` is the only classification a vision model can fill unaided:
  // it records what is physically in the frame and nothing else. Every
  // other way people want to slice the library is a QUERY over this,
  // not a second thing to tag.
  //
  //   "find our edit floor"      -> shows: edit-bay
  //   "find anything with tools" -> shows: screen-timeline|camera-rig|...
  //   "find culture photos"      -> shows: cocoma-people
  //                                 + rights: own + assetType: photograph
  //                                 + NOT shows: screen-*
  //
  // Nine such saved searches are defined in lib/mediaSearches.js. They
  // are deliberately code, not stored tags — tagging the same photograph
  // nine ways is how a taxonomy rots, and every one of those nine fires
  // from cues already recorded here.
  shows: { type: [String], default: [], index: true },

  // What KIND of object this is, which is separate from what it depicts.
  // Without it a logo, an empty deck template and a photograph of the
  // edit floor are indistinguishable to a filter — and roughly 40% of
  // the current library is vector art that no scene-based facet fits.
  assetType: {
    type: String,
    enum: ['photograph', 'key-art', 'logo-mark', 'illustration',
           'deck-slide', 'blank-template', 'screenshot', 'vector', 'video', 'unknown'],
    default: 'unknown',
    index: true,
  },

  // The project this came from. Industry, genre, client and clientType
  // all live on the job because none of them can be seen in the frame.
  // Null is normal for library assets that predate job records; those
  // simply never match an industry or genre query, which is correct
  // rather than unfortunate.
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'MediaJob', default: null, index: true },

  // ------------------------------------------------------------ review
  /* The human verdict, which is a different axis from describeStatus.
   *
   * describeStatus is the machine's progress — pending, done, failed.
   * This is whether a person has looked. Conflating them is the bug to
   * avoid: an asset can be perfectly described and still not fit to
   * publish, and "the worker finished" must never read as "somebody
   * approved it". Nothing is publishable until state === 'approved'. */
  review: {
    state: {
      type: String,
      enum: ['proposed', 'approved', 'rejected'],
      default: 'proposed',
      index: true,
    },

    // Who ruled. byName is denormalised so the queue renders "approved by
    // Dishan" without a join, and still reads correctly after that account
    // is deactivated — which users here are, rather than deleted.
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    byName: { type: String, trim: true, default: '' },
    at: { type: Date, default: null },

    // Optional on approval, required on rejection. A rejection with no
    // reason sends the asset back to the queue for the next reviewer to
    // re-derive the objection from scratch.
    note: { type: String, trim: true, default: '' },

    // What the approver actually put their name to. Overlaps setBy but
    // answers a different question: setBy is "may the machine write
    // here", this is "what did the person agree to". They diverge as soon
    // as the reviewable field set grows past an old approval.
    fields: { type: [String], default: [] },
  },

  // Named people. See taggedPersonSchema above for why this is separate
  // from the `people` count and why it is never model-written.
  taggedPeople: { type: [taggedPersonSchema], default: [] },

  // -------------------------------------------------------- governance
  // rights decides publishability and is deliberately not a boolean:
  //   own       Cocoma shot or made it — safe to publish as our work
  //   client-ip a client's title artwork — portfolio use only
  //   stock     licensed stock — never on a page claiming it is ours
  //   unknown   not yet determined; treat as unpublishable
  rights: {
    type: String,
    enum: ['own', 'client-ip', 'stock', 'unknown'],
    default: 'unknown',
    index: true,
  },
  sensitive: { type: Boolean, default: false, index: true },
  /* Copied from the job at ingest, not read through it.
   *
   * NDA is a property of the engagement, so it belongs on MediaJob and it
   * lives there. But every read that filters across jobs — the listing,
   * the review queue, publishable(), the person pages — would need a join
   * to see it, and mediaSearches said so in a comment while nothing
   * actually did it. One un-joined query is a leak, and there is no way
   * to make forgetting the join loud.
   *
   * So the flag is denormalised here, where a plain filter reaches it and
   * a new query gets the protection by default rather than by diligence.
   * The cost is that changing a job's NDA status has to fan out to its
   * assets; that is a rare, deliberate act and a cheap updateMany. */
  nda: { type: Boolean, default: false, index: true },
  usable: { type: Boolean, default: false }, // fit for public marketing use
  reviewed: { type: Number, enum: [0, 1], default: 0 }, // a human confirmed it

  // Whether the people in the frame agreed to appear. `rights` covers who
  // owns the file; this covers who is in it, and they are not the same
  // question — we own the copyright in a photograph of a stranger.
  //
  // `minors` exists as its own value rather than folding into sensitive
  // because it needs a different decision, not just a stricter one. The
  // describe worker already flagged one such photograph in this library
  // by noticing a child in frame; there was nowhere to record the outcome.
  consent: {
    type: String,
    enum: ['released', 'staff', 'not-required', 'unknown', 'minors', 'refused'],
    default: 'unknown',
    index: true,
  },

  // Which fields a human decided, so a later describe run cannot quietly
  // overwrite them. Without this a model's guess and a person's ruling are
  // indistinguishable, and re-running the worker silently undoes review.
  //
  // Shape: { rights: 'human', shows: 'model', consent: 'human' }
  setBy: { type: Map, of: String, default: () => ({}) },

  // ------------------------------------------------------- describe job
  describeStatus: {
    type: String,
    enum: ['pending', 'processing', 'done', 'failed', 'skipped'],
    default: 'pending',
    index: true,
  },
  describeAttempts: { type: Number, default: 0 },
  describeError: { type: String, default: null },
  describeMeta: {
    provider: { type: String, default: null },
    model: { type: String, default: null },
    promptVersion: { type: String, default: null },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    costUsd: { type: Number, default: 0 },
    describedAt: { type: Date, default: null },
    copiedFromChecksum: { type: Boolean, default: false },
  },

  // ---------------------------------------------------------- lifecycle
  folder: { type: String, trim: true, default: '', index: true },
  status: { type: Number, enum: [0, 1], default: 1 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'media_assets' });

/**
 * The search index. This is the whole cost argument in one statement:
 * every query the admin or the website makes runs against this, in
 * Mongo, for free. No model is called at read time.
 *
 * Weights put the caption first because it is the sentence a person
 * actually searches with; tags are a close second because they are the
 * controlled vocabulary; ocrText is last because text scraped off a
 * screen is noisy.
 *
 * NOTE for review: Mongo allows only ONE text index per collection, so
 * every field we ever want to full-text search has to be in this one.
 */
mediaAssetSchema.index(
  { caption: 'text', altText: 'text', tags: 'text', category: 'text', ocrText: 'text' },
  {
    name: 'media_search',
    weights: { caption: 10, tags: 8, category: 4, altText: 3, ocrText: 1 },
    default_language: 'english',
  },
);

// The worker claims jobs with this; keeping it compound avoids a scan
// once the collection is large.
mediaAssetSchema.index({ describeStatus: 1, createdAt: 1 });

// The common publish-time filter: "our own, safe, usable images".
mediaAssetSchema.index({ rights: 1, sensitive: 1, kind: 1 });

// What every saved search actually filters on. shows is multikey, so this
// covers "anything showing X, of this type, that we may publish".
mediaAssetSchema.index({ shows: 1, assetType: 1, rights: 1 });

// Industry/genre/client queries resolve through the job, so this is the
// join key that keeps them from scanning.
mediaAssetSchema.index({ job: 1, rights: 1 });

// The publishable filter in lib/mediaSearches, in index form. Every public
// query lands here, so it is the one that must not scan.
mediaAssetSchema.index({ 'review.state': 1, rights: 1, sensitive: 1, usable: 1 });

// The review queue itself — oldest proposed first.
mediaAssetSchema.index({ 'review.state': 1, createdAt: 1 });

// "Every photo of Dishan we may publish." Exact where free-text tags are
// fuzzy, which is the reason named people are a reference and not a tag.
mediaAssetSchema.index({ 'taggedPeople.person': 1, rights: 1, sensitive: 1 });

module.exports = mongoose.model('MediaAsset', mediaAssetSchema);
