const GroupSingleServiceImage = require('../../models/GroupSingleServiceImage');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(GroupSingleServiceImage, { imageFields: ['single_service_img'], searchFields: ['single_service_description'], defaultSort: { display_order: 1 }, parentField: 'group_service_item_id' });
