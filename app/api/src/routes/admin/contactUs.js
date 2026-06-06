const router = require('express').Router();
const ctrl = require('../../controllers/admin/contactUsController');
const { protect } = require('../../middleware/auth');

router.get('/', protect, ctrl.index);
router.get('/:id', protect, ctrl.show);
router.delete('/:id', protect, ctrl.destroy);

module.exports = router;
