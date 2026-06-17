const multer = require('multer');
const { protect } = require('../../middleware/auth');

// In-memory upload for CSV/XLSX import files (parsed straight from the buffer).
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

/**
 * Attach the generic CSV export/import routes to a router whose controller was
 * built with `createCrudController` (which provides `exportCsv` / `importCsv`).
 * No-op for controllers that don't expose them, so it's safe to call anywhere.
 *
 * Routes use two-segment paths (`/export/csv`, `/import/csv`) so they never
 * collide with the single-segment `/:id` CRUD routes.
 */
module.exports = (router, ctrl) => {
  if (typeof ctrl.exportCsv === 'function') {
    router.get('/export/csv', protect, ctrl.exportCsv);
  }
  if (typeof ctrl.importCsv === 'function') {
    router.post('/import/csv', protect, csvUpload.single('file'), ctrl.importCsv);
  }
  return router;
};
