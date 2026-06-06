const router = require('express').Router();
const ctrl = require('../../controllers/admin/jobListController');
const { protect } = require('../../middleware/auth');
const bulkUpload = require('multer')({ storage: require('multer').memoryStorage() });

router.get('/', protect, ctrl.index);
router.get('/:id', protect, ctrl.show);
router.post('/', protect, ctrl.store);
router.put('/:id', protect, ctrl.update);
router.delete('/:id', protect, ctrl.destroy);
router.post('/bulk-upload', protect, bulkUpload.single('file'), ctrl.bulkUpload);

module.exports = router;
