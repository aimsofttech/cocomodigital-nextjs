const router = require('express').Router();
const ctrl = require('../../controllers/api/commonController');
const ssCtrl = require('../../controllers/api/successStoriesController');

router.get('/', ctrl.commonApi);
router.get('/brands', ctrl.brand);
router.get('/hire-us', ctrl.hireUs);
router.get('/author', ctrl.author);
router.get('/banner-title', ctrl.bannerTitle);
router.get('/book-call', ctrl.bookCall);
router.get('/our-advantage', ctrl.ourAdvantage);
router.get('/content-creator-platform', ctrl.contentService);
router.get('/success-stories', ctrl.successStories);
router.get('/categories', ctrl.categories);
router.get('/success-stories-filter-data', ssCtrl.latestSuccessStoriesFilterData);
router.get('/success-stories-view-all', ssCtrl.successStories);

module.exports = router;
