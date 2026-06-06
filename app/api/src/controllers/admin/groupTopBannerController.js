const GroupTopBanner = require('../../models/GroupTopBanner');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(GroupTopBanner, { imageFields: ['group_banner_img'], searchFields: ['group_banner_heading'], defaultSort: { display_order: 1 } });
