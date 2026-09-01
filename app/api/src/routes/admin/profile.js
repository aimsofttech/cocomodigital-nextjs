const router = require('express').Router();
const ctrl = require('../../controllers/admin/profileController');
const { protect } = require('../../middleware/auth');

/* Your own account, mounted at /admin/api/profile. Available to every signed-in
 * admin whatever their role — there is no id in any of these paths, so a user
 * can only ever act on themselves. */

router.use(protect);

router.get('/', ctrl.show);
router.put('/', ctrl.update);
router.put('/password', ctrl.changePassword);

module.exports = router;
