const router = require('express').Router();
const ctrl = require('../../controllers/api/creativeController');

router.get('/', ctrl.index);
router.get('/home-priority', ctrl.creativeHomePriority);
router.get('/filter-data', ctrl.creativeFilterData);
router.get('/items', ctrl.creativeHouseItem);
router.get('/single/:slug', ctrl.getSingleCreativeHouse);

module.exports = router;
