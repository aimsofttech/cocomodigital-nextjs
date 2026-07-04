const Video = require('../../models/Video');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(Video, {
  imageFields: ['thumbnail'],
  defaultSort: { displayOrder: 1 },
});
