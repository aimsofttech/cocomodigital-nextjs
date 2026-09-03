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

module.exports = mongoose.model('MediaAsset', mediaAssetSchema);
