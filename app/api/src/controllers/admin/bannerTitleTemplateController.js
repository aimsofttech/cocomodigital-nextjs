const BannerTitleTemplate = require('../../models/BannerTitleTemplate');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(BannerTitleTemplate, { imageFields: ['banner_bg_img'], searchFields: ['banner_title', 'page_name'], defaultSort: { display_order: 1 } });
