const { createMediaUpload } = require('../utils/s3Upload');

// One uploader per media type (reused across requests).
const imageUpload = createMediaUpload('image');
const videoUpload = createMediaUpload('video');

// Wrap a multer middleware so multer/S3 errors become consistent JSON responses
// instead of being thrown into the generic error handler as 500s.
const runUpload = (mw, label) => (req, res, next) => {
  mw(req, res, (err) => {
    if (err) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? `The ${label} exceeds the maximum allowed size.`
          : err.message || `Failed to upload ${label}.`;
      return res.status(status).json({ status: 'error', message });
    }
    next();
  });
};

module.exports = {
  uploadSingleImage: runUpload(imageUpload.single('file'), 'image'),
  uploadMultipleImages: runUpload(imageUpload.array('files', 20), 'images'),
  uploadSingleVideo: runUpload(videoUpload.single('file'), 'video'),
  uploadMultipleVideos: runUpload(videoUpload.array('files', 10), 'videos'),
};
