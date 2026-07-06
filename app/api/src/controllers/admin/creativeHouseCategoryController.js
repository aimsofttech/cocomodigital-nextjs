const CreativeHouseCategory = require('../../models/CreativeHouseCategory');
const CreativeHouseItem = require('../../models/CreativeHouseItem');
const createCrudController = require('./crudFactory');
const { cascadeDelete, idVariants, mediaValues } = require('./cascadeDelete');
const { deleteManyFromS3 } = require('../../utils/s3Upload');
const { SECTION_CASCADE } = require('./creativeHouseItemController');

const base = createCrudController(CreativeHouseCategory, { imageFields: ['icon'],
  searchFields: ['name'],
  slugField: 'slug',
  defaultSort: { displayOrder: 1 },
});

// Deleting a category removes all its items and each item's sections.
const destroyWithCascade = async (req, res) => {
  const items = await CreativeHouseItem.find({ creativeHouseCategoryId: { $in: idVariants(req.params.id) } });
  for (const item of items) {
    await cascadeDelete(item._id, SECTION_CASCADE);
    try { await deleteManyFromS3(mediaValues(item, ['thumbnail', 'uploadVideoUrl'])); } catch (err) { /* best effort */ }
    await item.deleteOne();
  }
  return base.destroy(req, res);
};

module.exports = { ...base, destroy: destroyWithCascade };
