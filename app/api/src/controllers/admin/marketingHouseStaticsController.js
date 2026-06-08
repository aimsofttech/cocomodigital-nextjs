const MarketingHouseStatics = require('../../models/MarketingHouseStatics');
const MarketingHouseCategory = require('../../models/MarketingHouseCategory');
const MarketingHouseItem = require('../../models/MarketingHouseItem');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(MarketingHouseStatics, {
  searchFields: ['name'],
  defaultSort: { display_order: 1 },
  parentField: 'marketing_house_item_id',
  // Resolve the related item/category into readable names so the Highlights table
  // can display names instead of raw ObjectIds (applied to list + show).
  // Highlights reliably store the item id; the category is resolved through the
  // item (highlight → item → category). The item lookup surfaces the item's
  // category id via `extract`, which the category lookup then resolves to a name.
  // A directly-stored `marketing_house_category_id` (if present) is kept as a
  // fallback when no item match is found.
  lookups: [
    {
      localField: 'marketing_house_item_id',
      model: MarketingHouseItem,
      // item records expose `title`; some form-created rows use `marketing_house_title`.
      nameField: ['title', 'marketing_house_title'],
      as: 'marketing_house_item_name',
      extract: { marketing_house_category_id: 'marketing_house_category_id' },
    },
    {
      localField: 'marketing_house_category_id',
      model: MarketingHouseCategory,
      // category records expose `category_name` (fallback to `name` for legacy rows).
      nameField: ['category_name', 'name'],
      as: 'marketing_house_category_name',
    },
  ],
});
