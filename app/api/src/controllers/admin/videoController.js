const Video = require('../../models/Video');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(Video, {
  imageFields: ['video_thumbnail'],
  defaultSort: { display_order: 1 },
});
