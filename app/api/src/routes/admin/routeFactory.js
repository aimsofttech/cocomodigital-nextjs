const router = require('express').Router;
const { protect } = require('../../middleware/auth');
const { createS3Upload } = require('../../utils/s3Upload');

const createCrudRouter = (controller, uploadConfig = null) => {
  const r = router();
  const uploadMiddleware = uploadConfig
    ? createS3Upload(uploadConfig.folder).fields(uploadConfig.fields)
    : (req, res, next) => next();

  r.get('/', protect, controller.index);
  r.get('/:id', protect, controller.show);
  r.post('/', protect, uploadMiddleware, controller.store);
  r.put('/:id', protect, uploadMiddleware, controller.update);
  r.delete('/:id', protect, controller.destroy);

  return r;
};

module.exports = createCrudRouter;
