const router = require('express').Router();
const ctrl = require('../../controllers/api/clientController');

router.get('/view-all', ctrl.getClientViewAll);
router.get('/detail/:client_slug', ctrl.getClientDetail);

module.exports = router;
