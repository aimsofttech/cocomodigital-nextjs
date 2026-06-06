const { buildS3Url, deleteFromS3 } = require('../../utils/s3Upload');

// Normalise a multer-s3 file object into our public media shape.
const toMedia = (file) => ({
  url: file.location || buildS3Url(file.key),
  key: file.key,
  originalName: file.originalname,
  size: file.size,
  mimetype: file.mimetype,
});

const single = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'No file provided.' });
  }
  res.status(201).json({
    status: 'success',
    message: 'Uploaded successfully',
    data: toMedia(req.file),
  });
};

const multiple = (req, res) => {
  if (!req.files || !req.files.length) {
    return res.status(400).json({ status: 'error', message: 'No files provided.' });
  }
  res.status(201).json({
    status: 'success',
    message: 'Uploaded successfully',
    data: { files: req.files.map(toMedia) },
  });
};

// Delete an uploaded object (used for rollback / orphan cleanup from the client).
const remove = async (req, res) => {
  const target = req.body.url || req.body.key;
  if (!target) {
    return res.status(400).json({ status: 'error', message: 'A url or key is required.' });
  }
  await deleteFromS3(target);
  res.json({ status: 'success', message: 'Deleted successfully' });
};

module.exports = { single, multiple, remove };
