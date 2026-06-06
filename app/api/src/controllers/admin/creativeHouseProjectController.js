const CreativeHouseProject = require('../../models/CreativeHouseProject');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(CreativeHouseProject, {
  imageFields: [],
  searchFields: ['project_title'],
  defaultSort: { display_order: 1 },
});
