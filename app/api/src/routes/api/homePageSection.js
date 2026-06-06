const router = require('express').Router();
const { index } = require('../../controllers/api/homePageSectionController');

router.get('/', index);

module.exports = router;
