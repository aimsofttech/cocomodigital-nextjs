const GroupCreatorPlatform = require('../../models/GroupCreatorPlatform');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(GroupCreatorPlatform, { imageFields: ['creator_thumbnail'], searchFields: ['creator_title'], defaultSort: { display_order: 1 } });
