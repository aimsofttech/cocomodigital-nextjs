const GroupServiceCategory = require('../../models/GroupServiceCategory');
const ServiceCategory = require('../../models/ServiceCategory');
const ServiceItem = require('../../models/ServiceItem');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(GroupServiceCategory, {
  searchFields: ['group_service_category_name'],
  defaultSort: { display_order: 1 },
  // Resolve the linked Department (explore_our_service_category) and Category
  // (explore_our_service_item) display names for the list/detail responses.
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
      as: 'category_name',
    },
  ],
});
