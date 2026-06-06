const MarketingHouseProject = require('../../models/MarketingHouseProject');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(MarketingHouseProject, {
  imageFields: [],
  searchFields: ['project_title'],
  defaultSort: { display_order: 1 },
});
