const Video = require('../../models/Video');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(Video, {
  imageFields: ['thumbnail'],
  videoFields: ['url'],
  defaultSort: { displayOrder: 1 },
});
