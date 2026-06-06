const router = require('express').Router();
const { login, logout, me, changePassword } = require('../../controllers/admin/authController');
const { protect } = require('../../middleware/auth');

router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/me', protect, me);
router.post('/change-password', protect, changePassword);

module.exports = router;
