const router = require('express').Router();
const ctrl = require('../../controllers/admin/marketingHouseContentCategoryController');
const { protect } = require('../../middleware/auth');

router.get('/', protect, ctrl.index);
router.get('/:id', protect, ctrl.show);
router.post('/', protect, ctrl.store);
router.put('/:id', protect, ctrl.update);
router.delete('/:id', protect, ctrl.destroy);

require('./_csvRoutes')(router, ctrl);

module.exports = router;
