const router = require('express').Router();
const ctrl = require('../../controllers/admin/marketingHouseOtherActivityItemController');
const { protect } = require('../../middleware/auth');
const { createS3Upload } = require('../../utils/s3Upload');
const upload = createS3Upload('other_activities');

router.get('/', protect, ctrl.index);
router.get('/:id', protect, ctrl.show);
router.post('/', protect, upload.single('item_image'), ctrl.store);
router.put('/:id', protect, upload.single('item_image'), ctrl.update);
router.delete('/:id', protect, ctrl.destroy);

module.exports = router;
