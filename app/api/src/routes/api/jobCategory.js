const router = require('express').Router();
const { index } = require('../../controllers/api/jobCategoryController');

router.get('/', index);

module.exports = router;
