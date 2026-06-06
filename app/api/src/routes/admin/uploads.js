const router = require('express').Router();
const { protect } = require('../../middleware/auth');
const {
  uploadSingleImage,
  uploadMultipleImages,
  uploadSingleVideo,
  uploadMultipleVideos,
} = require('../../middleware/uploadMedia');
const ctrl = require('../../controllers/admin/uploadController');

// Image uploads
router.post('/image', protect, uploadSingleImage, ctrl.single);
router.post('/images', protect, uploadMultipleImages, ctrl.multiple);

// Video uploads
router.post('/video', protect, uploadSingleVideo, ctrl.single);
router.post('/videos', protect, uploadMultipleVideos, ctrl.multiple);

// Orphan cleanup / rollback
router.delete('/', protect, ctrl.remove);

module.exports = router;
