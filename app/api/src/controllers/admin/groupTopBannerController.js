const GroupTopBanner = require('../../models/GroupTopBanner');
const ServiceCategory = require('../../models/ServiceCategory');
const ServiceItem = require('../../models/ServiceItem');
const createCrudController = require('./crudFactory');
// `exploreOurServiceItemId` scopes banners to a Service Category (used by the
// "Navigate To" links and the list filter); `exploreOurServiceCategoryId`
// scopes them to a Department (list filter).
module.exports = createCrudController(GroupTopBanner, {
  imageFields: ['image'],
  searchFields: ['heading'],
  defaultSort: { displayOrder: 1 },
  parentField: ['exploreOurServiceItemId', 'exploreOurServiceCategoryId'],
  // Resolve the linked Department and Service Category display names for the list.
  lookups: [
    {
      localField: 'exploreOurServiceCategoryId',
      model: ServiceCategory,
      nameField: 'name',
      as: 'departmentName',
    },
    {
      localField: 'exploreOurServiceItemId',
      model: ServiceItem,
      nameField: 'title',
      as: 'serviceCategoryName',
    },
  ],
});
