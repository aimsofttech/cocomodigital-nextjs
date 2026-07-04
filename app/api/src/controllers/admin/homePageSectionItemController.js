const HomePageSectionItem = require('../../models/HomePageSectionItem');
const HomePageSection = require('../../models/HomePageSection');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(HomePageSectionItem, {
  imageFields: ['image'],
  searchFields: ['item_title', 'name'],
  defaultSort: { display_order: 1 },
  parentField: 'home_page_section_id',
  // Resolve the parent section's name (Category) for the list/detail responses.
  lookups: [
    {
      localField: 'home_page_section_id',
      model: HomePageSection,
      nameField: 'name',
      as: 'category_name',
    },
  ],
});
