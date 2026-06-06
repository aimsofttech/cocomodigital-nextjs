const router = require('express').Router();
const { getBySlug } = require('../../controllers/api/groupServiceFaqController');

router.get('/:slug', getBySlug);

module.exports = router;
