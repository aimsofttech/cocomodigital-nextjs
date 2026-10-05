const CreativeHouseProject = require('../../models/CreativeHouseProject');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(CreativeHouseProject, {
  imageFields: ['image'],
  searchFields: ['title'],
  defaultSort: { displayOrder: 1 },
});
