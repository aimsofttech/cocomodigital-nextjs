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
 *   3. Governance — rights and sensitive. These decide whether an asset
 *      may appear on a public page at all.
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

module.exports = mongoose.model('MediaAsset', mediaAssetSchema);
