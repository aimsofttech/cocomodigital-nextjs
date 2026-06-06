const router = require('express').Router();
const ctrl = require('../../controllers/admin/creatorPlatformController');
const { protect } = require('../../middleware/auth');
const { createS3Upload } = require('../../utils/s3Upload');
const upload = createS3Upload('creator_platforms');

router.get('/', protect, ctrl.index);
router.get('/:id', protect, ctrl.show);
router.post('/', protect, upload.single('creator_thumbnail'), ctrl.store);
router.put('/:id', protect, upload.single('creator_thumbnail'), ctrl.update);
router.delete('/:id', protect, ctrl.destroy);

module.exports = router;
