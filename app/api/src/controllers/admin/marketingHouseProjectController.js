const MarketingHouseProject = require('../../models/MarketingHouseProject');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(MarketingHouseProject, {
  imageFields: ['project_image'],
  searchFields: ['project_title'],
  defaultSort: { displayOrder: 1 },
});
