const router = require('express').Router();
const ctrl = require('../../controllers/admin/meetingController');
const { protect } = require('../../middleware/auth');

router.get('/stats', protect, ctrl.stats);
router.get('/', protect, ctrl.index);
router.get('/:id', protect, ctrl.show);
router.put('/:id/confirm', protect, ctrl.confirm);
router.put('/:id/reject', protect, ctrl.reject);
router.put('/:id/reschedule', protect, ctrl.reschedule);
router.put('/:id/status', protect, ctrl.updateStatus);
router.delete('/:id', protect, ctrl.destroy);

module.exports = router;
