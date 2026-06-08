const Faq = require('../../models/Faq');
const MarketingHouseItem = require('../../models/MarketingHouseItem');
const MarketingHouseCategory = require('../../models/MarketingHouseCategory');
const createCrudController = require('./crudFactory');

// FAQs live in a shared `faqs` collection (also used by template FAQs). This
// controller scopes the listing to FAQs linked to a marketing item, and resolves
// the related item/category into readable names (record → item → category).
module.exports = createCrudController(Faq, {
  searchFields: ['question', 'answer'],
  defaultSort: { display_order: 1 },
  parentField: 'marketing_house_item_id',
  baseFilter: { marketing_house_item_id: { $ne: null } },
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
