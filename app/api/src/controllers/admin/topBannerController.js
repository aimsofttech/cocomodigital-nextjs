const TopBanner = require('../../models/TopBanner');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(TopBanner, {
  imageFields: ['banner_video_thumbnail'],
  searchFields: ['heading', 'sub_heading', 'country'],
  defaultSort: { display_order: 1, createdAt: -1 },
});
