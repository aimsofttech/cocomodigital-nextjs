const router = require('express').Router();
const multer = require('multer');
const ctrl = require('../../controllers/admin/marketingHouseBulkUploadController');
const { protect } = require('../../middleware/auth');

// CSV/XLSX is parsed straight from memory (no S3) — same pattern as the generic
// _csvRoutes importer. 20 MB cap to comfortably hold large bulk files.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

router.get('/template', protect, ctrl.downloadTemplate);
router.post('/validate', protect, upload.single('file'), ctrl.validate);
router.post('/import', protect, upload.single('file'), ctrl.importBulk);

module.exports = router;
