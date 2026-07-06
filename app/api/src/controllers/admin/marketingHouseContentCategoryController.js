const MarketingHouseContentCreatedCategory = require('../../models/MarketingHouseContentCreatedCategory');
const MarketingHouseItem = require('../../models/MarketingHouseItem');
const MarketingHouseCategory = require('../../models/MarketingHouseCategory');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(MarketingHouseContentCreatedCategory, {
  searchFields: ['name'],
  defaultSort: { displayOrder: 1 },
  parentField: 'marketingHouseItemId',
  // Resolve the related marketing item/category into readable names (record →
  // item → category). The item lookup surfaces the item's category id via
  // `extract`, which the category lookup then resolves to a name. The resolved
  // names use `marketing_house_*` keys so they don't clash with this record's
  // own `name` field. Applied to list + show.
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
