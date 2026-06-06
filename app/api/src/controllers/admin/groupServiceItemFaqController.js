const GroupServiceItemFaq = require('../../models/GroupServiceItemFaq');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(GroupServiceItemFaq, { searchFields: ['question', 'answer'], defaultSort: { display_order: 1 }, parentField: 'group_service_item_id' });
