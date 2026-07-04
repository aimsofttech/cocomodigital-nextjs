const router = require('express').Router();
const ctrl = require('../../controllers/admin/topBannerController');
const { protect } = require('../../middleware/auth');
const { createS3Upload } = require('../../utils/s3Upload');
const upload = createS3Upload('top_banners');

router.get('/', protect, ctrl.index);
router.get('/:id', protect, ctrl.show);
router.post('/', protect, upload.single('videoThumbnail'), ctrl.store);
router.put('/:id', protect, upload.single('videoThumbnail'), ctrl.update);
router.delete('/:id', protect, ctrl.destroy);

module.exports = router;
