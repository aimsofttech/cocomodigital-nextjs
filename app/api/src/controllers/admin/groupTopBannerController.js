const GroupTopBanner = require('../../models/GroupTopBanner');
const ServiceCategory = require('../../models/ServiceCategory');
const ServiceItem = require('../../models/ServiceItem');
const createCrudController = require('./crudFactory');
// `exploreOurServiceItemId` scopes banners to a Service Category, so the
// banners can be filtered from the Group Service Category "Navigate To" links.
module.exports = createCrudController(GroupTopBanner, {
  imageFields: ['image'],
  searchFields: ['heading'],
  defaultSort: { displayOrder: 1 },
  parentField: 'exploreOurServiceItemId',
  // Resolve the linked Department and Service Category display names for the list.
  lookups: [
    {
      localField: 'exploreOurServiceCategoryId',
      model: ServiceCategory,
      nameField: 'service_category_name',
      as: 'departmentName',
    },
    {
      localField: 'exploreOurServiceItemId',
      model: ServiceItem,
      nameField: 'service_title',
      as: 'serviceCategoryName',
    },
  ],
});
