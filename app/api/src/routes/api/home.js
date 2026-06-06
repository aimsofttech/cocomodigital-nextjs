const router = require('express').Router();
const ctrl = require('../../controllers/api/homeController');

router.get('/', ctrl.index);
router.get('/client', ctrl.client);
router.get('/monthly-performance-showcase', ctrl.monthlyPerformanceShowcase);

module.exports = router;
