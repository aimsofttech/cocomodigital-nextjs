const router = require('express').Router();
const ctrl = require('../../controllers/admin/meetingAvailabilityController');
const { protect } = require('../../middleware/auth');

router.get('/', protect, ctrl.show);
router.put('/', protect, ctrl.update);

module.exports = router;
