const HomePageSectionItem = require('../../models/HomePageSectionItem');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(HomePageSectionItem, { imageFields: ['image'], searchFields: ['item_title'], defaultSort: { display_order: 1 }, parentField: 'home_page_section_id' });
