const GroupServiceItem = require('../../models/GroupServiceItem');
const GroupServiceCategory = require('../../models/GroupServiceCategory');
const ServiceCategory = require('../../models/ServiceCategory');
const ServiceItem = require('../../models/ServiceItem');
const createCrudController = require('./crudFactory');
const { generateSlug } = require('../../utils/helpers');

const base = createCrudController(GroupServiceItem, {
  imageFields: ['group_service_item_thumbnail'],
  searchFields: ['group_service_item_title'],
  defaultSort: { display_order: 1 },
  parentField: 'group_service_category_id',
  // Chained lookups: Item → Group Service Category, then use the category's
  // Department (explore_our_service_category_id) and Service Category
  // (explore_our_service_item_id) refs to resolve their display names.
  lookups: [
    {
      localField: 'group_service_category_id',
      model: GroupServiceCategory,
      nameField: 'group_service_category_name',
      as: 'group_category_name',
      extract: {
        explore_our_service_category_id: 'explore_our_service_category_id',
        explore_our_service_item_id: 'explore_our_service_item_id',
      },
    },
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

const storeWithSlug = async (req, res) => {
  if (!req.body.group_service_slug && req.body.group_service_item_title) {
    req.body.group_service_slug = generateSlug(req.body.group_service_item_title);
  }
  return base.store(req, res);
};

const getServiceItems = async (req, res) => {
  const items = await GroupServiceItem.find({ group_service_category_id: req.params.categoryId, status: 1 })
    .sort({ display_order: 1 })
    .select('group_service_item_title group_service_slug');
  res.json({ status: 'success', data: items });
};

module.exports = { ...base, store: storeWithSlug, getServiceItems };
