const GroupSuccessStories = require('../../models/GroupSuccessStories');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(GroupSuccessStories, { imageFields: ['success_stories_img'], searchFields: ['success_stories_title'], defaultSort: { display_order: 1 } });
