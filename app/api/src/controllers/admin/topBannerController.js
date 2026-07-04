const TopBanner = require('../../models/TopBanner');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(TopBanner, {
  imageFields: ['videoThumbnail'],
  searchFields: ['heading', 'subHeading', 'country'],
  defaultSort: { displayOrder: 1, createdAt: -1 },
});
