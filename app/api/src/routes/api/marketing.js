const router = require('express').Router();
const ctrl = require('../../controllers/api/marketingController');

router.get('/', ctrl.index);
router.get('/home-priority', ctrl.marketingHomePriority);
router.get('/filter-data', ctrl.marketingFilterData);
router.get('/items', ctrl.marketingHouseItem);
router.get('/single/:slug', ctrl.getSingleMarketingHouse);
router.get('/other-activity-items', ctrl.getMarketingOtherActivityItem);
router.get('/continuity-program-items', ctrl.getMarketingContinuityProgramItem);
router.get('/content-created-carousels', ctrl.getMarketingContentCreatedCarousel);
router.get('/content-created-items', ctrl.getMarketingContentCreatedItem);
router.post('/form', ctrl.marketingForm);

module.exports = router;
