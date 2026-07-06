const CreativeHouseProject = require('../../models/CreativeHouseProject');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(CreativeHouseProject, {
  imageFields: [],
  searchFields: ['title'],
  defaultSort: { displayOrder: 1 },
});
