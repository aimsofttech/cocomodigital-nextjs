const router = require('express').Router();
const ctrl = require('../../controllers/admin/marketingHouseCommunityProgramItemController');
const { protect } = require('../../middleware/auth');
const { createS3Upload } = require('../../utils/s3Upload');
const upload = createS3Upload('community_items');
const bulkUpload = require('multer')({ storage: require('multer').memoryStorage() });

router.get('/', protect, ctrl.index);
router.get('/:id', protect, ctrl.show);
router.post('/', protect, upload.single('item_image'), ctrl.store);
router.put('/:id', protect, upload.single('item_image'), ctrl.update);
router.delete('/:id', protect, ctrl.destroy);
router.post('/bulk-upload', protect, bulkUpload.single('file'), ctrl.bulkUpload);

module.exports = router;
