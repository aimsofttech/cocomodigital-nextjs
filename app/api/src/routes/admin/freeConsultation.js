const router = require('express').Router();
const ctrl = require('../../controllers/admin/freeConsultationController');
const { protect } = require('../../middleware/auth');

router.get('/categories', protect, ctrl.indexCategories);
router.post('/categories', protect, ctrl.storeCat);
router.put('/categories/:id', protect, ctrl.updateCat);
router.delete('/categories/:id', protect, ctrl.destroyCat);
router.get('/submissions', protect, ctrl.indexSubmissions);

module.exports = router;
