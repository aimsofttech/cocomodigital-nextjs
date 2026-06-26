const router = require('express').Router();
const ctrl = require('../../controllers/admin/jobApplicantController');
const { protect } = require('../../middleware/auth');

router.get('/', protect, ctrl.index);
router.get('/all', protect, ctrl.allApplications);
router.get('/:id', protect, ctrl.show);
router.put('/:id/status', protect, ctrl.updateStatus);
router.post('/bulk-delete', protect, ctrl.bulkDelete);
router.delete('/:id', protect, ctrl.destroy);

module.exports = router;
