const router = require('express').Router();
const { protect } = require('../../middleware/auth');
const ctrl = require('../../controllers/admin/mediaAssetController');

// Search and browse. Costs nothing but a Mongo query.
router.get('/', protect, ctrl.index);
router.get('/stats', protect, ctrl.stats);
router.get('/:id', protect, ctrl.show);

// Human corrections. Anything edited here is marked reviewed and is
// then protected from being overwritten by a later describe run.
router.patch('/:id', protect, ctrl.update);
router.delete('/:id', protect, ctrl.destroy);

// The only two endpoints that can spend money. Both are admin-triggered
// and neither sits on a user-facing read path.
router.post('/:id/describe', protect, ctrl.redescribe);
router.post('/describe-queue', protect, ctrl.runQueue);

module.exports = router;
