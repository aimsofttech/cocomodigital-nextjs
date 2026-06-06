const router = require('express').Router();
const ctrl = require('../../controllers/admin/videoController');
const { protect } = require('../../middleware/auth');
const { createS3Upload } = require('../../utils/s3Upload');
const upload = createS3Upload('videos');

router.get('/', protect, ctrl.index);
router.get('/:id', protect, ctrl.show);
router.post('/', protect, upload.fields([{ name: 'video_thumbnail' }, { name: 'video_url' }]), ctrl.store);
router.put('/:id', protect, upload.fields([{ name: 'video_thumbnail' }, { name: 'video_url' }]), ctrl.update);
router.delete('/:id', protect, ctrl.destroy);

module.exports = router;
