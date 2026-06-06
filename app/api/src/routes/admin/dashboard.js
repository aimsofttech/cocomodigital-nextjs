const router = require('express').Router();
const { index } = require('../../controllers/admin/dashboardController');
const { protect } = require('../../middleware/auth');

router.get('/', protect, index);

module.exports = router;
