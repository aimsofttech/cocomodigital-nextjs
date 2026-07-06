const MarketingHouseCategory = require('../../models/MarketingHouseCategory');
const MarketingHouseItem = require('../../models/MarketingHouseItem');
const createCrudController = require('./crudFactory');
const { cascadeDelete, idVariants, mediaValues } = require('./cascadeDelete');
const { deleteManyFromS3 } = require('../../utils/s3Upload');
const { SECTION_CASCADE } = require('./marketingHouseItemController');

const base = createCrudController(MarketingHouseCategory, { imageFields: ['icon'],
  searchFields: ['name'],
  defaultSort: { displayOrder: 1 },
});

// Deleting a category removes all its campaigns and every section record that
// belongs to each campaign (mirrors the item controller's cascade).
const destroyWithCascade = async (req, res) => {
  const items = await MarketingHouseItem.find({ marketingHouseCategoryId: { $in: idVariants(req.params.id) } });
  for (const item of items) {
    await cascadeDelete(item._id, SECTION_CASCADE);
    try { await deleteManyFromS3(mediaValues(item, ['posterImage'])); } catch (err) { /* best effort */ }
    await item.deleteOne();
  }
  return base.destroy(req, res);
};

module.exports = { ...base, destroy: destroyWithCascade };
