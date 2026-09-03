const MediaAsset = require('../models/MediaAsset');
const { MEDIA_CONFIG, putBufferToS3 } = require('../utils/s3Upload');
const { probe } = require('../utils/mediaProbe');
const { checksumOf } = require('./mediaDescriber');
const logger = require('../utils/logger');

/**
 * Ingest — the write end of the media library.
 *
 * Anil drops a folder. What happens to each file in it is decided here,
 * and the four rules are:
 *
 *  1. Hash before you store. The sha256 is computed from the bytes in
 *     memory, and only a file we have never seen is uploaded at all. On
 *     the current vault that is a 37% saving before a single describe
 *     call is made — the same fifty studio photographs live in both
 *     website repos.
 *
 *  2. A duplicate inherits the description instead of earning one. It
 *     costs one Mongo write and nothing else: no S3 put, no vision call,
 *     no queue entry. This is the saving the whole index design rests on.
 *
 *  3. One bad file must not cost the other nineteen. Every refusal is a
 *     row in the response with a reason. Nothing here throws for a file
 *     the caller could have chosen better.
 *
 *  4. Measure the file, do not trust the form. Width, height, duration
 *     and byte size come from the bytes. A wrong number entered at upload
 *     is permanent in a way a wrong caption is not — nobody re-checks it.
 *
 * Everything lands at describeStatus 'pending'. Describing is a separate,
 * admin-triggered run; an upload never waits on a model.
 */

// Caps default to the same numbers every other uploader in this app uses,
// so there is one answer to "how big can a video be" rather than two.
const cap = (envVar, fallbackBytes) => {
  const mb = Number(process.env[envVar]);
  return mb > 0 ? mb * 1024 * 1024 : fallbackBytes;
};

/* Read on call rather than at module load.
 *
 * MEDIA_CONFIG comes from s3Upload, which builds an S3 client the moment
 * it is required. Reaching into it at the top level made this module —
 * and therefore the controller that requires it — impossible to load in a
 * test that stubs S3, which is every test we have. A config read that
 * happens once at startup is also a config read that cannot be changed
 * without a restart, so lazy is the better default either way. */
const limits = () => ({
  image: cap('MEDIA_UPLOAD_MAX_IMAGE_MB', MEDIA_CONFIG.image.maxSize),
  video: cap('MEDIA_UPLOAD_MAX_VIDEO_MB', MEDIA_CONFIG.video.maxSize),
  files: Number(process.env.MEDIA_UPLOAD_MAX_FILES || 20),
  concurrency: Number(process.env.MEDIA_UPLOAD_CONCURRENCY || 4),
});

/* Mirrors MEDIA_CONFIG.*.extensions in a form a person can read in an
 * error message. Keep the two in step — a caller told "Allowed: mp4, mov"
 * when we in fact accept .mkv will convert a file for no reason. */
const ALLOWED_LABEL = 'images (jpg, jpeg, png, gif, webp, svg, avif, bmp) '
  + 'and video (mp4, mov, webm, avi, mkv, m4v, ogv)';

/* What a browser sends when it has no idea. Chrome on Windows uses it for
 * .mkv and .avi, and Safari uses it for anything dragged out of a folder
 * it has not indexed. Refusing on mimetype alone would silently drop those
 * files out of a folder drop, which is the exact failure this endpoint
 * exists to avoid. */
const GENERIC_MIME = /^(application|binary)\/octet-stream$/i;

const extensionOf = (name) => {
  const dot = String(name || '').lastIndexOf('.');
  return dot > -1 ? String(name).slice(dot + 1).toLowerCase() : '';
};

const mb = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/**
 * Is this an image, a video, or something we will not take?
 * Extension and mimetype normally agree; when they disagree the extension
 * decides, provided the mimetype is the browser's generic value.
 */
const classify = (file) => {
  const ext = extensionOf(file && file.originalname);
  const mime = String((file && file.mimetype) || '').toLowerCase();

  for (const kind of Object.keys(MEDIA_CONFIG)) {
    const cfg = MEDIA_CONFIG[kind];
    const okExt = ext ? cfg.extensions.test(ext) : false;
    const okMime = mime ? cfg.mimetypes.test(mime) : false;
    if (okExt && (okMime || !mime || GENERIC_MIME.test(mime))) return kind;
    // A file pasted from the clipboard arrives as "image.png" or with no
    // name at all; trust the mimetype when there is no extension to check.
    if (okMime && !ext) return kind;
  }
  return null;
};

/** Reject anything we will not store, with a reason a person can act on. */
const vet = (file) => {
  const bytes = file && file.buffer ? file.buffer.length : 0;
  if (!bytes) return { reason: 'The file is empty.' };

  const kind = classify(file);
  if (!kind) {
    const ext = extensionOf(file.originalname);
    return {
      reason: `${ext ? `.${ext}` : 'This file type'} is not accepted. `
            + `The library takes ${ALLOWED_LABEL}.`,
    };
  }

  if (bytes > limits()[kind]) {
    return {
      kind,
      reason: `This ${kind} is ${mb(bytes)}; the limit is ${mb(limits()[kind])}.`,
    };
  }
  return { kind };
};

/** Run `worker` over `items` a few at a time. The files are already in
 *  memory, so the only thing being limited is concurrent S3 puts. */
const inParallel = async (items, limit, worker) => {
  const queue = items.slice();
  const lanes = Array.from({ length: Math.max(1, Math.min(limit, queue.length)) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      await worker(item);
    }
  });
  await Promise.all(lanes);
};

/* The fields a row with identical bytes may inherit. Deliberately not
 * `job` or `folder`: those describe why THIS copy was uploaded, and the
 * whole point of allowing a second row is that the same photograph can
 * belong to two jobs. */
const INHERITED = [
  'caption', 'altText', 'tags', 'category', 'people', 'ocrText',
  'shows', 'assetType', 'rights', 'sensitive', 'usable',
];

const inheritFrom = (twin) => {
  const copied = {};
  INHERITED.forEach((field) => {
    if (twin[field] !== undefined && twin[field] !== null) copied[field] = twin[field];
  });
  return copied;
};

/* An undefined value in a create() is not the same as an absent key: it
 * would override an inherited rights call with the schema default and
 * quietly turn an 'own' photograph into an unpublishable 'unknown'. */
const defined = (obj) => Object.fromEntries(
  Object.entries(obj || {}).filter(([, v]) => v !== undefined && v !== null && v !== ''),
);

/**
 * A file whose bytes are already in the library. No S3 put, no describe.
 * The new row points at the SAME object key — which is why destroy() only
 * deletes from the bucket when no other row shares the checksum.
 */
const rowFromTwin = async (entry, twin, ctx) => {
  const described = twin.describeStatus === 'done';
  const doc = await MediaAsset.create({
    key: twin.key,
    url: twin.url,
    originalName: entry.originalName,
    checksum: entry.checksum,
    kind: twin.kind,
    mimetype: twin.mimetype,
    bytes: twin.bytes,
    width: twin.width,
    height: twin.height,
    duration: twin.duration,
    posterKey: twin.posterKey || null,
    ...inheritFrom(twin),
    ...ctx.governance,
    job: ctx.job,
    folder: ctx.folder,
    userId: ctx.userId,
    setBy: ctx.setBy,
    // Only claim it is described if the twin actually is. A twin that is
    // still pending leaves this row pending too, and the describer's
    // checksum reuse collapses the pair the moment either one is done.
    // Two rows queued before any run can still both be described once —
    // one extra call, not a recurring cost.
    describeStatus: described ? 'done' : 'pending',
    describeMeta: described
      ? {
        provider: twin.describeMeta && twin.describeMeta.provider,
        model: twin.describeMeta && twin.describeMeta.model,
        promptVersion: twin.describeMeta && twin.describeMeta.promptVersion,
        costUsd: 0,
        describedAt: new Date(),
        copiedFromChecksum: true,
      }
      : undefined,
  });
  return doc;
};

/** A file we have never seen: measure it, store it, queue it. */
const rowFromUpload = async (entry, ctx) => {
  const { buffer, mimetype } = entry;
  const meta = await probe({ buffer, kind: entry.kind, originalName: entry.originalName });
  const { key, url } = await putBufferToS3(buffer, {
    folder: MEDIA_CONFIG[entry.kind].folder,
    originalName: entry.originalName,
    contentType: mimetype,
  });

  return MediaAsset.create({
    key,
    url,
    originalName: entry.originalName,
    checksum: entry.checksum,
    kind: entry.kind,
    mimetype: mimetype || null,
    bytes: buffer.length,
    width: meta.width,
    height: meta.height,
    duration: meta.duration,
    ...ctx.governance,
    job: ctx.job,
    folder: ctx.folder,
    userId: ctx.userId,
    setBy: ctx.setBy,
    describeStatus: 'pending',
  });
};

/**
 * Ingest a batch.
 *
 * `files`      multer memory-storage files
 * `job`        MediaJob id every file inherits, or null
 * `folder`     free-text grouping for the whole drop
 * `governance` { rights, consent } a person set for the whole drop
 * `dedupe`     'row'  (default) a duplicate still gets its own row, so the
 *                     second filename, folder and job survive
 *              'skip' return the existing asset and write nothing — what
 *                     you want when a folder was dropped twice by mistake
 *
 * Returns { summary, results } where results is one entry per input file
 * in the order they arrived.
 */
const ingestBatch = async ({
  files = [],
  job = null,
  folder = '',
  governance = {},
  setBy = {},
  userId = null,
  dedupe = 'row',
} = {}) => {
  const ctx = { job, folder, governance: defined(governance), setBy, userId };

  // 1. Vet everything first. A rejection here is final and cheap, and it
  //    never touches the files around it.
  const entries = files.map((file, index) => {
    const originalName = (file && file.originalname) || `file-${index + 1}`;
    const verdict = vet(file);
    if (verdict.reason) {
      return {
        index, originalName, status: 'rejected', reason: verdict.reason,
        bytes: file && file.buffer ? file.buffer.length : 0,
        kind: verdict.kind || null,
      };
    }
    return {
      index,
      originalName,
      status: 'pending',
      kind: verdict.kind,
      bytes: file.buffer.length,
      mimetype: file.mimetype,
      buffer: file.buffer,
    };
  });

  const accepted = entries.filter((e) => e.status === 'pending');
  accepted.forEach((e) => { e.checksum = checksumOf(e.buffer); });

  // 2. Collapse duplicates INSIDE the batch before touching S3. A folder
  //    that contains the same still twice would otherwise be uploaded
  //    twice: both copies miss the database lookup because neither is
  //    stored yet, and the dedupe misses precisely on the first run, when
  //    it is worth the most.
  const leaders = [];
  const byChecksum = new Map();
  accepted.forEach((e) => {
    const leader = byChecksum.get(e.checksum);
    if (leader) e.follows = leader;
    else { byChecksum.set(e.checksum, e); leaders.push(e); }
  });

  // 3. Store the leaders.
  await inParallel(leaders, limits().concurrency, async (entry) => {
    try {
      const twin = await MediaAsset.findOne({ checksum: entry.checksum })
        .sort({ createdAt: 1 })
        .lean();

      if (twin) {
        entry.status = 'duplicate';
        entry.duplicateOf = twin._id;
        entry.savedBytes = entry.bytes;
        entry.asset = dedupe === 'skip' ? twin : await rowFromTwin(entry, twin, ctx);
        entry.reason = dedupe === 'skip'
          ? 'Already in the library. Nothing was written.'
          : 'Already in the library. The description was copied across; nothing was uploaded.';
        return;
      }

      entry.asset = await rowFromUpload(entry, ctx);
      entry.status = 'uploaded';
    } catch (err) {
      // A failed put or a failed write is not the caller's mistake, and it
      // is worth retrying — which is why it is not reported as 'rejected'.
      logger.error(`mediaIngest: ${entry.originalName} failed: ${err.message}`);
      entry.status = 'failed';
      entry.reason = `Could not be stored: ${err.message}`;
    }
  });

  // 4. Then the followers, against the row their leader just created.
  const followers = accepted.filter((e) => e.follows);
  for (const entry of followers) {
    const leader = entry.follows;
    if (!leader.asset) {
      entry.status = 'failed';
      entry.reason = leader.reason || 'The identical file ahead of it in this batch failed.';
      continue;
    }
    try {
      entry.status = 'duplicate';
      entry.duplicateOf = leader.asset._id;
      entry.savedBytes = entry.bytes;
      entry.asset = dedupe === 'skip'
        ? leader.asset
        : await rowFromTwin(entry, leader.asset, ctx);
      entry.reason = 'Identical to another file in this upload; stored once.';
    } catch (err) {
      logger.error(`mediaIngest: duplicate row for ${entry.originalName} failed: ${err.message}`);
      entry.status = 'failed';
      entry.reason = `Could not be stored: ${err.message}`;
    }
  }

  const summary = {
    received: entries.length,
    uploaded: entries.filter((e) => e.status === 'uploaded').length,
    duplicate: entries.filter((e) => e.status === 'duplicate').length,
    rejected: entries.filter((e) => e.status === 'rejected').length,
    failed: entries.filter((e) => e.status === 'failed').length,
    bytesStored: entries.filter((e) => e.status === 'uploaded')
      .reduce((n, e) => n + e.bytes, 0),
    bytesSkipped: entries.filter((e) => e.status === 'duplicate')
      .reduce((n, e) => n + (e.savedBytes || 0), 0),
  };

  return {
    summary,
    results: entries.map((e) => ({
      originalName: e.originalName,
      status: e.status === 'pending' ? 'failed' : e.status,
      reason: e.reason || null,
      kind: e.kind || null,
      bytes: e.bytes,
      asset: e.asset || null,
      duplicateOf: e.duplicateOf || null,
    })),
  };
};

module.exports = { ingestBatch, classify, vet, limits, ALLOWED_LABEL };
