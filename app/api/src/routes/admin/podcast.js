const router = require('express').Router();
const ctrl = require('../../controllers/admin/podcastController');
const { protect } = require('../../middleware/auth');
const attachCsvRoutes = require('./_csvRoutes');

/* Admin routes for the podcast money page, mounted at /admin/api/podcast.
 * Every sub-resource is a self-contained CRUD router so the module can grow
 * without touching server.js again.
 *
 *   /page     parent page record (all one-off copy, media and SEO)
 *   /stat     trust / problem / scale figure tiles   (scoped by sectionKey)
 *   /card     services, audiences, time zones, process, month table
 *                                                    (scoped by sectionKey)
 *   /stage    the four Signal-to-Scale stages
 *   /shot     studio strip photographs
 *   /faq      FAQ accordion entries
 *   /cta      hero / pricing / founder buttons and the proof links
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

router.use('/page', crudRouter(ctrl.page));
router.use('/stat', crudRouter(ctrl.stat));
router.use('/card', crudRouter(ctrl.card));
router.use('/stage', crudRouter(ctrl.stage));
router.use('/shot', crudRouter(ctrl.shot));
router.use('/faq', crudRouter(ctrl.faq));
router.use('/cta', crudRouter(ctrl.cta));

module.exports = router;
