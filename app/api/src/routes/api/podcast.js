const router = require('express').Router();
const { index, show } = require('../../controllers/api/podcastController');

/* Public read routes for the podcast money page, mounted at
 * /api/podcast-pages. The single-segment `/:slug` is registered after `/`
 * so the list route is never swallowed by the detail route. */

router.get('/', index);
router.get('/:slug', show);

module.exports = router;
