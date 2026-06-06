const SocialWorkCategory = require('../../models/SocialWorkCategory');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(SocialWorkCategory, { searchFields: ['social_work_category_name'], defaultSort: { display_order: 1 } });
