const Faq = require('../../models/Faq');
const MarketingHouseItem = require('../../models/MarketingHouseItem');
const MarketingHouseCategory = require('../../models/MarketingHouseCategory');
const createCrudController = require('./crudFactory');

// FAQs live in a shared `faqs` collection (also used by template FAQs). This
// controller scopes the listing to FAQs linked to a marketing item, and resolves
// the related item/category into readable names (record → item → category).
module.exports = createCrudController(Faq, {
  searchFields: ['question', 'answer'],
  defaultSort: { displayOrder: 1 },
  parentField: 'marketingHouseItemId',
  baseFilter: { marketingHouseItemId: { $ne: null } },
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
