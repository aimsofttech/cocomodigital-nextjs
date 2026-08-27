const router = require('express').Router();
const { index, show } = require('../../controllers/api/growthServiceController');

/* Public read routes for the growth landing pages, mounted at
 * /api/growth-services. The single-segment `/:slug` is registered after `/`
 * so the list route is never swallowed by the detail route. */

router.get('/', index);
router.get('/:slug', show);

module.exports = router;
