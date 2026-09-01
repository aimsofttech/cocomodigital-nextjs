const router = require('express').Router();
const ctrl = require('../../controllers/admin/adminUserController');
const { protect } = require('../../middleware/auth');
const { superAdminOnly } = require('../../middleware/adminAccess');

/* User Management, mounted at /admin/api/users.
 *
 * Guarded twice on purpose. `authorizeAdmin` already refuses this module to
 * every role but Super Admin because the catalog marks it superAdminOnly;
 * `superAdminOnly` here means the router is still safe if it is ever mounted
 * somewhere that guard does not cover.
 */

router.use(protect, superAdminOnly);

// Two-segment path first so it never falls into `/:id`.
router.get('/roles', ctrl.assignableRoles);

router.get('/', ctrl.index);
router.post('/', ctrl.store);
router.get('/:id', ctrl.show);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.destroy);
router.post('/:id/reset-password', ctrl.resetPassword);

module.exports = router;
