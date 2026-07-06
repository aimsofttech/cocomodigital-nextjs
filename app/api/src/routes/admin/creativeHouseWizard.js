const router = require('express').Router();
const ctrl = require('../../controllers/admin/creativeHouseWizardController');
const { protect } = require('../../middleware/auth');
const { createS3Upload } = require('../../utils/s3Upload');
const upload = createS3Upload('creative_house');

router.post('/step1', protect, upload.single('thumbnail'), ctrl.storeStep1);
router.post('/step2', protect, ctrl.storeStep2);
router.post('/step3', protect, ctrl.storeStep3);

module.exports = router;
