const SuccessStoriesProject = require('../../models/SuccessStoriesProject');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(SuccessStoriesProject, { imageFields: ['project_image'], searchFields: ['project_title', 'client_name'], defaultSort: { display_order: 1 } });
