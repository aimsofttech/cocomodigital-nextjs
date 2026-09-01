const router = require('express').Router();
const ctrl = require('../../controllers/admin/adminRoleController');
const { protect } = require('../../middleware/auth');
const { superAdminOnly } = require('../../middleware/adminAccess');

/* Roles & Permissions, mounted at /admin/api/roles. Super Admin only, for the
 * same two-barrier reason as User Management. */

router.use(protect, superAdminOnly);

// Registered before `/:key` so the catalog is never read as a role key.
router.get('/catalog', ctrl.catalog);

router.get('/', ctrl.index);
router.get('/:key', ctrl.show);
router.put('/:key', ctrl.update);

module.exports = router;
