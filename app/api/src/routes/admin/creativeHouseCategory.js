const router = require('express').Router();
const ctrl = require('../../controllers/admin/creativeHouseCategoryController');
const { protect } = require('../../middleware/auth');

router.get('/', protect, ctrl.index);
router.get('/:id', protect, ctrl.show);
router.post('/', protect, ctrl.store);
router.put('/:id', protect, ctrl.update);
router.delete('/:id', protect, ctrl.destroy);

module.exports = router;
