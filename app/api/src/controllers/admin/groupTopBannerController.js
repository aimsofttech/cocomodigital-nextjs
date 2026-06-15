const GroupTopBanner = require('../../models/GroupTopBanner');
const createCrudController = require('./crudFactory');
// `explore_our_service_item_id` scopes banners to a Service Category, so the
// banners can be filtered from the Group Service Category "Navigate To" links.
module.exports = createCrudController(GroupTopBanner, { imageFields: ['group_banner_img'], searchFields: ['group_banner_heading'], defaultSort: { display_order: 1 }, parentField: 'explore_our_service_item_id' });
