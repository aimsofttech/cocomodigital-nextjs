const router = require('express').Router();
const ctrl = require('../../controllers/api/contactController');

router.post('/', ctrl.contact);
router.get('/availability', ctrl.availability);
router.post('/free-consultation', ctrl.freeConsultation);

module.exports = router;
