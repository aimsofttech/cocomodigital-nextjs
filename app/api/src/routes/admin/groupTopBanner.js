const router = require('express').Router();
const ctrl = require('../../controllers/admin/groupTopBannerController');
const { protect } = require('../../middleware/auth');
const { createS3Upload } = require('../../utils/s3Upload');
const upload = createS3Upload('group_banners');

router.get('/', protect, ctrl.index);
router.get('/:id', protect, ctrl.show);
router.post('/', protect, upload.single('group_banner_img'), ctrl.store);
router.put('/:id', protect, upload.single('group_banner_img'), ctrl.update);
router.delete('/:id', protect, ctrl.destroy);

module.exports = router;
