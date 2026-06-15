const GroupTopBanner = require('../../models/GroupTopBanner');
const ServiceCategory = require('../../models/ServiceCategory');
const ServiceItem = require('../../models/ServiceItem');
const createCrudController = require('./crudFactory');
// `explore_our_service_item_id` scopes banners to a Service Category, so the
// banners can be filtered from the Group Service Category "Navigate To" links.
module.exports = createCrudController(GroupTopBanner, {
  imageFields: ['group_banner_img'],
  searchFields: ['group_banner_heading'],
  defaultSort: { display_order: 1 },
  parentField: 'explore_our_service_item_id',
  // Resolve the linked Department and Service Category display names for the list.
  lookups: [
    {
      localField: 'explore_our_service_category_id',
      model: ServiceCategory,
      nameField: 'service_category_name',
      as: 'department_name',
    },
    {
      localField: 'explore_our_service_item_id',
      model: ServiceItem,
      nameField: 'service_title',
      as: 'service_category_name',
    },
  ],
});
