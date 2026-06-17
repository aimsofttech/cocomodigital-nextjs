const router = require('express').Router();
const ctrl = require('../../controllers/admin/marketingHousePerformanceController');
const { protect } = require('../../middleware/auth');
const { createS3Upload } = require('../../utils/s3Upload');
const upload = createS3Upload('marketing_performance');

router.get('/', protect, ctrl.index);
router.get('/:id', protect, ctrl.show);
router.post('/', protect, upload.single('performance_image'), ctrl.store);
router.put('/:id', protect, upload.single('performance_image'), ctrl.update);
router.delete('/:id', protect, ctrl.destroy);

require('./_csvRoutes')(router, ctrl);

module.exports = router;
