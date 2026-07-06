const router = require('express').Router();
const ctrl = require('../../controllers/admin/groupServiceItemController');
const { protect } = require('../../middleware/auth');
const { createS3Upload } = require('../../utils/s3Upload');
const upload = createS3Upload('group_service_items');

router.get('/', protect, ctrl.index);
router.get('/service-items/:categoryId', protect, ctrl.getServiceItems);
router.get('/:id', protect, ctrl.show);
router.post('/', protect, upload.single('thumbnail'), ctrl.store);
router.put('/:id', protect, upload.single('thumbnail'), ctrl.update);
router.delete('/:id', protect, ctrl.destroy);

module.exports = router;
