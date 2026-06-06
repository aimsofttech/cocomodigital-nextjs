const MarketingHouseCommunityProgramCategory = require('../../models/MarketingHouseCommunityProgramCategory');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(MarketingHouseCommunityProgramCategory, {
  imageFields: [],
  searchFields: ['community_program_category_name'],
  defaultSort: { display_order: 1 },
  parentField: 'marketing_house_item_id',
});
