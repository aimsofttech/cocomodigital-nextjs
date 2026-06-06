const GroupServiceCategory = require('../../models/GroupServiceCategory');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(GroupServiceCategory, { searchFields: ['group_service_category_name'], defaultSort: { display_order: 1 } });
