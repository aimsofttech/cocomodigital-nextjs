const MarketingHouseStatics = require('../../models/MarketingHouseStatics');
const MarketingHouseCategory = require('../../models/MarketingHouseCategory');
const MarketingHouseItem = require('../../models/MarketingHouseItem');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(MarketingHouseStatics, {
  searchFields: ['name'],
  defaultSort: { displayOrder: 1 },
  parentField: 'marketingHouseItemId',
  // Resolve the related item/category into readable names so the Highlights table
  // can display names instead of raw ObjectIds (applied to list + show).
  // Highlights reliably store the item id; the category is resolved through the
  // item (highlight → item → category). The item lookup surfaces the item's
  // category id via `extract`, which the category lookup then resolves to a name.
  // A directly-stored `marketingHouseCategoryId` (if present) is kept as a
  // fallback when no item match is found.
  lookups: [
    {
      localField: 'marketingHouseItemId',
      model: MarketingHouseItem,
      // item records expose `title`; some form-created rows use `title`.
      nameField: ['title', 'title'],
      as: 'itemName',
      extract: { marketingHouseCategoryId: 'marketingHouseCategoryId' },
    },
    {
      localField: 'marketingHouseCategoryId',
      model: MarketingHouseCategory,
      // category records expose `name` (fallback to `name` for legacy rows).
      nameField: ['name', 'name'],
      as: 'categoryName',
    },
  ],
});
