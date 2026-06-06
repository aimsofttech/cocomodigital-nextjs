const router = require('express').Router();
const { index, getBySlug } = require('../../controllers/api/faqController');

router.get('/', index);
router.get('/:slug', getBySlug);

module.exports = router;
