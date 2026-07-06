const GroupServiceItemFaq = require('../../models/GroupServiceItemFaq');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(GroupServiceItemFaq, { searchFields: ['question', 'answer'], defaultSort: { displayOrder: 1 }, parentField: 'groupServiceItemId' });
