const router = require('express').Router();
const ctrl = require('../../controllers/admin/growthServiceController');
const { protect } = require('../../middleware/auth');
const attachCsvRoutes = require('./_csvRoutes');

/* Admin routes for the growth landing pages, mounted at
 * /admin/api/growth-service. Every sub-resource is a self-contained CRUD
 * router so the module can grow without touching server.js again.
 *
 *   /service       parent page record
 *   /section       section headings + layout
 *   /feature       icon cards / timeline steps  (scoped by sectionKey)
 *   /stat          hero KPI tiles
 *   /showcase      platform + format panels     (scoped by sectionKey)
 *   /case-metric   before / after / growth rows
 *   /faq           FAQ accordion entries
 *   /cta           hero + closing call-to-action buttons
 */

// Build a standard protected CRUD router (plus CSV export/import) for one
// crudFactory controller.
const crudRouter = (controller) => {
  const sub = require('express').Router();
  // Two-segment CSV paths are registered first so they never fall into `/:id`.
  attachCsvRoutes(sub, controller);
  sub.get('/', protect, controller.index);
  sub.get('/:id', protect, controller.show);
  sub.post('/', protect, controller.store);
  sub.put('/:id', protect, controller.update);
  sub.delete('/:id', protect, controller.destroy);
  return sub;
};

router.use('/service', crudRouter(ctrl.service));
router.use('/section', crudRouter(ctrl.section));
router.use('/feature', crudRouter(ctrl.feature));
router.use('/stat', crudRouter(ctrl.stat));
router.use('/showcase', crudRouter(ctrl.showcase));
router.use('/case-metric', crudRouter(ctrl.caseMetric));
router.use('/faq', crudRouter(ctrl.faq));
router.use('/cta', crudRouter(ctrl.cta));

module.exports = router;
