const MarketingHouseImage = require('../../models/MarketingHouseImage');
const MarketingHouseItem = require('../../models/MarketingHouseItem');
const MarketingHouseCategory = require('../../models/MarketingHouseCategory');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(MarketingHouseImage, {
  imageFields: ['image'],
  searchFields: ['image_title'],
  defaultSort: { display_order: 1 },
  parentField: 'marketing_house_item_id',
  // Images only store the item id, so the category is resolved through the item
  // (image → item → category). The first lookup surfaces the item's category id
  // via `extract`, which the second lookup then resolves to the category name.
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
