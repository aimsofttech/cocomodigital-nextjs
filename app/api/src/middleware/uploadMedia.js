const multer = require('multer');
const { createMediaUpload, MEDIA_CONFIG } = require('../utils/s3Upload');

// One uploader per media type (reused across requests).
const imageUpload = createMediaUpload('image');
const videoUpload = createMediaUpload('video');

// Wrap a multer middleware so multer/S3 errors become consistent JSON responses
// instead of being thrown into the generic error handler as 500s.
// `extra` maps a multer error code to a better message for callers that have
// one worth giving; everything else keeps the existing wording.
const runUpload = (mw, label, extra = {}) => (req, res, next) => {
  mw(req, res, (err) => {
    if (err) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      const message =
        extra[err.code]
        || (err.code === 'LIMIT_FILE_SIZE'
          ? `The ${label} exceeds the maximum allowed size.`
          : err.message || `Failed to upload ${label}.`);
      return res.status(status).json({ status: 'error', message });
    }
    next();
  });
};

// How many files one folder drop may carry. The files are held in memory
// until their checksums are known (see below), so this is the number that
// bounds the API box's memory, not a UI preference.
const LIBRARY_MAX_FILES = Number(process.env.MEDIA_UPLOAD_MAX_FILES || 20);
const LIBRARY_MAX_MB = Math.round(MEDIA_CONFIG.video.maxSize / (1024 * 1024));

/**
 * The media library's batch uploader.
 *
 * Memory storage rather than multer-s3, and that is the entire point: the
 * ingest has to sha256 the bytes before it decides whether to upload them,
 * and a stream that goes straight into the bucket is never ours to hash.
 * The checksum is what makes a re-dropped folder free instead of a second
 * describe bill, so paying for the buffer is the cheaper side of the trade.
 *
 * There is deliberately NO fileFilter. A file multer refuses aborts the
 * whole request, which would mean one .zip in a folder of twenty
 * photographs costs the other nineteen their upload. Everything is
 * accepted here and judged per file in services/mediaIngest, where a
 * refusal is one row in the response instead of a 400 for the batch.
 *
 * The size limit is the VIDEO ceiling — the largest thing we accept at
 * all — for the same reason: a 30 MB image is refused per file with a
 * reason, while only something bigger than anything we take can fail the
 * whole request.
 */
const libraryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MEDIA_CONFIG.video.maxSize, files: LIBRARY_MAX_FILES },
});

// Aggregate ceiling for one request, in MB.
//
// The per-file limit above is the video maximum, and the file count is 20.
// Multiplied out that is 10 GB of buffers in one request, on a box that
// runs the whole API — the per-file and per-count limits are each
// reasonable and their product is not. Twenty phone videos is a plausible
// accident, not an attack.
//
// Checked from Content-Length BEFORE multer is invoked, because once
// multer starts the bytes are already arriving into memory and the
// cheapest refusal is the one that happens first.
const LIBRARY_MAX_BATCH_MB = Number(process.env.MEDIA_UPLOAD_MAX_BATCH_MB || 600);

const capBatchSize = (req, res, next) => {
  const declared = Number(req.headers['content-length'] || 0);
  const ceiling = LIBRARY_MAX_BATCH_MB * 1024 * 1024;
  if (declared && declared > ceiling) {
    return res.status(413).json({
      status: 'error',
      message: `That drop is ${Math.round(declared / 1048576)} MB. `
        + `Send at most ${LIBRARY_MAX_BATCH_MB} MB at a time — `
        + 'large videos go up a few at a time rather than a folder at once.',
    });
  }
  return next();
};

// Compose so the header check runs first and multer never sees an
// oversized body. Exported as one middleware so a route cannot wire the
// uploader without the guard.
const libraryBatchWithCap = (req, res, next) =>
  capBatchSize(req, res, (err) => (err ? next(err)
    : runUpload(libraryUpload.array('files', LIBRARY_MAX_FILES), 'files', {
      LIMIT_FILE_COUNT: `Too many files at once. Send at most ${LIBRARY_MAX_FILES} per upload.`,
      LIMIT_UNEXPECTED_FILE: 'Send the files in a multipart field named "files".',
      LIMIT_FILE_SIZE: `One of these files is over the ${LIBRARY_MAX_MB} MB ceiling, `
        + 'which is more than the library accepts for anything.',
    })(req, res, next)));

module.exports = {
  uploadSingleImage: runUpload(imageUpload.single('file'), 'image'),
  uploadMultipleImages: runUpload(imageUpload.array('files', 20), 'images'),
  uploadSingleVideo: runUpload(videoUpload.single('file'), 'video'),
  uploadMultipleVideos: runUpload(videoUpload.array('files', 10), 'videos'),
  uploadLibraryBatch: libraryBatchWithCap,
};
