const GroupSingleServiceImage = require('../../models/GroupSingleServiceImage');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(GroupSingleServiceImage, { imageFields: ['image'], videoFields: ['videoUrl'], searchFields: ['description'], defaultSort: { displayOrder: 1 }, parentField: 'groupServiceItemId' });
