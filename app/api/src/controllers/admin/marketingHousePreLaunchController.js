const MarketingHousePreLaunchActivity = require('../../models/MarketingHousePreLaunchActivity');
const MarketingHouseItem = require('../../models/MarketingHouseItem');
const MarketingHouseCategory = require('../../models/MarketingHouseCategory');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(MarketingHousePreLaunchActivity, {
  imageFields: ['image'],
  searchFields: ['title'],
  defaultSort: { displayOrder: 1 },
  parentField: 'marketingHouseItemId',
  // Resolve the related item/category into readable names (record → item →
  // category): the item lookup surfaces the item's category id via `extract`,
  // which the category lookup then resolves to a name. Applied to list + show.
  lookups: [
    {
      localField: 'marketingHouseItemId',
      model: MarketingHouseItem,
      nameField: ['title', 'title'],
      as: 'itemName',
      extract: { marketingHouseCategoryId: 'marketingHouseCategoryId' },
    },
    {
      localField: 'marketingHouseCategoryId',
      model: MarketingHouseCategory,
      nameField: ['name', 'name'],
      as: 'categoryName',
    },
  ],
});
