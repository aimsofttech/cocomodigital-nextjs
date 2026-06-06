const HomePageSection = require('../../models/HomePageSection');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(HomePageSection, { searchFields: ['section_name', 'section_title'], defaultSort: { display_order: 1 } });
