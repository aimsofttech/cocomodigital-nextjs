const router = require('express').Router();
const ctrl = require('../../controllers/admin/marketingFormController');
const { protect } = require('../../middleware/auth');

router.get('/', protect, ctrl.index);
router.put('/:id/mark-read', protect, ctrl.markRead);
router.delete('/:id', protect, ctrl.destroy);

module.exports = router;
