const SocialWorkItem = require('../../models/SocialWorkItem');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(SocialWorkItem, { imageFields: ['social_work_img'], searchFields: ['social_work_title'], defaultSort: { display_order: 1 }, parentField: 'social_work_category_id' });
