const router = require('express').Router();
const ctrl = require('../../controllers/api/serviceController');

router.get('/service-home-priority', ctrl.serviceHomePriority);
router.get('/group-service/:service_slug', ctrl.groupService);
router.get('/single-service/:slug', ctrl.getSingleService);
router.get('/portfolio-items', ctrl.getPortfolioItem);

module.exports = router;
