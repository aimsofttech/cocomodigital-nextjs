const router = require('express').Router();
const { protect } = require('../../middleware/auth');
const ctrl = require('../../controllers/admin/mediaAssetController');
const people = require('../../controllers/admin/mediaPersonController');
const { uploadLibraryBatch } = require('../../middleware/uploadMedia');

/**
 * Media library routes.
 *
 * ORDER MATTERS AND IS NOT COSMETIC. Express matches in registration
 * order, so every literal path has to be declared before '/:id' or it is
 * swallowed by it — a GET /review would arrive at show() looking for an
 * asset whose id is the string "review", and return a 404 that tells you
 * nothing about why. The blank lines below are grouping; the sequence is
 * load-bearing.
 */

// ---------------------------------------------------------------- browse
router.get('/', protect, ctrl.index);
router.get('/stats', protect, ctrl.stats);

// The queue of things waiting on a person. Literal, so it goes above /:id.
router.get('/review', protect, ctrl.reviewQueue);

// ---------------------------------------------------------------- people
// The directory, and the "every photo of Dishan" query. All literal, all
// above /:id for the same reason.
router.get('/people', protect, people.listPeople);
router.post('/people', protect, people.createPerson);
router.get('/people/:personId/assets', protect, people.assetsByPerson);
router.patch('/people/:personId', protect, people.updatePerson);

// ---------------------------------------------------------------- ingest
// Anil drops a folder. Multipart, batched, and the only route on this
// module that accepts bytes.
router.post('/upload', protect, uploadLibraryBatch, ctrl.upload);

// Approving a page of the queue in one action. Literal — above /:id.
router.post('/bulk-approve', protect, ctrl.bulkApprove);

// Drains the describe queue. One of the two routes here that can spend.
router.post('/describe-queue', protect, ctrl.runQueue);

// ------------------------------------------------------------ single asset
router.get('/:id', protect, ctrl.show);
router.patch('/:id', protect, ctrl.update);
router.delete('/:id', protect, ctrl.destroy);

// The human verdict. Separate from PATCH because approving is not editing:
// it records who, when, and which fields they put their name to.
router.post('/:id/approve', protect, ctrl.approve);
router.post('/:id/reject', protect, ctrl.reject);

// Naming a face. Always a person, never the model — see taggedPersonSchema.
router.post('/:id/people', protect, people.tag);
router.delete('/:id/people/:personId', protect, people.untag);

// The second route that can spend money. Admin-triggered, never on a read path.
router.post('/:id/describe', protect, ctrl.redescribe);

module.exports = router;
