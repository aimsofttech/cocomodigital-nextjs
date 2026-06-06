const GroupServiceItem = require('../../models/GroupServiceItem');
const createCrudController = require('./crudFactory');
const { generateSlug } = require('../../utils/helpers');

const base = createCrudController(GroupServiceItem, {
  imageFields: ['group_service_item_thumbnail'],
  searchFields: ['group_service_item_title'],
  defaultSort: { display_order: 1 },
  parentField: 'group_service_category_id',
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
