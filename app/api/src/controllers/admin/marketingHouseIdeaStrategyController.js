const MarketingHouseIdeaStrategyPlanning = require('../../models/MarketingHouseIdeaStrategyPlanning');
const MarketingHouseItem = require('../../models/MarketingHouseItem');
const MarketingHouseCategory = require('../../models/MarketingHouseCategory');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(MarketingHouseIdeaStrategyPlanning, {
  imageFields: ['image'],
  searchFields: ['title'],
  defaultSort: { display_order: 1 },
  parentField: 'marketing_house_item_id',
  // Resolve the related item/category into readable names (highlight → item →
  // category): the item lookup surfaces the item's category id via `extract`,
  // which the category lookup then resolves to a name. Applied to list + show.
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
