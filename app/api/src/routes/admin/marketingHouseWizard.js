const router = require('express').Router();
const ctrl = require('../../controllers/admin/marketingHouseWizardController');
const { protect } = require('../../middleware/auth');
const { createS3Upload } = require('../../utils/s3Upload');
const upload = createS3Upload('marketing_house');

router.post('/step1', protect, upload.single('marketing_house_thumbnail'), ctrl.storeStep1);
router.post('/step2', protect, ctrl.storeStep2);
router.post('/step3', protect, ctrl.storeStep3);
router.post('/step4', protect, ctrl.storeStep4);
router.post('/step5', protect, ctrl.storeStep5);
router.post('/step6', protect, ctrl.storeStep6);
router.post('/step7', protect, ctrl.storeStep7);

module.exports = router;
