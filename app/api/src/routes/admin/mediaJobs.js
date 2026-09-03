const express = require('express');
const { protect } = require('../../middleware/auth');
const ctrl = require('../../controllers/admin/mediaJobController');

const router = express.Router();

/* Media jobs — the project record assets inherit client, industry, genre
 * and NDA from. Mounted at /admin/api/media-jobs and claimed by the
 * `media` module in config/adminModules, so it grades on the same
 * permissions as the library itself: an editor who may contribute may
 * create a job, and only a reviewer may change or delete one.
 *
 * Literal paths before '/:id', as everywhere else in this API. */
router.get('/options', protect, ctrl.options);

router.get('/', protect, ctrl.index);
router.post('/', protect, ctrl.create);
router.get('/:id', protect, ctrl.show);
router.patch('/:id', protect, ctrl.update);
router.delete('/:id', protect, ctrl.destroy);

module.exports = router;
