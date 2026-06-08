const MarketingHouseCommunityProgramCategory = require('../../models/MarketingHouseCommunityProgramCategory');
const MarketingHouseItem = require('../../models/MarketingHouseItem');
const MarketingHouseCategory = require('../../models/MarketingHouseCategory');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(MarketingHouseCommunityProgramCategory, {
  imageFields: [],
  searchFields: ['community_program_category_name', 'category_name'],
  defaultSort: { display_order: 1 },
  parentField: 'marketing_house_item_id',
  // Resolve the related marketing item/category into readable names (record →
  // item → category). The item lookup surfaces the item's category id via
  // `extract`, which the category lookup then resolves to a name. The resolved
  // names use `marketing_house_*` keys so they don't clash with this record's
  // own `category_name` field. Applied to list + show.
  lookups: [
    {
      localField: 'marketing_house_item_id',
      model: MarketingHouseItem,
      nameField: ['title', 'marketing_house_title'],
      as: 'marketing_house_item_name',
      extract: { marketing_house_category_id: 'marketing_house_category_id' },
    },
    {
      localField: 'marketing_house_category_id',
      model: MarketingHouseCategory,
      nameField: ['category_name', 'name'],
      as: 'marketing_house_category_name',
    },
  ],
});
