const CreativeHouseCategory = require('../../models/CreativeHouseCategory');
const CreativeHouseItem = require('../../models/CreativeHouseItem');
const CreativeHouseApproach = require('../../models/CreativeHouseApproach');
const CreativeHouseFinalOutput = require('../../models/CreativeHouseFinalOutput');
const { buildS3Url } = require('../../utils/s3Upload');

const buildUrl = (key) => (key ? buildS3Url(key) : '');

const creativeHomePriority = async (req, res) => {
  const categories = await CreativeHouseCategory.find({ status: 1 }).sort({ display_order: 1 });
  const result = [];
  for (const cat of categories) {
    const items = await CreativeHouseItem.find({ creative_house_category_id: cat._id, status: 1 }).sort({ display_order: 1 });
    result.push({
      ...cat.toObject(),
      items: items.map((i) => ({ ...i.toObject(), creative_house_thumbnail: buildUrl(i.creative_house_thumbnail) })),
    });
  }
  res.json({ status: 'success', data: result });
};

const index = async (req, res) => {
  return creativeHomePriority(req, res);
};

const creativeFilterData = async (req, res) => {
  const categories = await CreativeHouseCategory.find({ status: 1 }).sort({ display_order: 1 }).select('id creative_house_category_name');
  res.json({ status: 'success', data: { categories } });
};

const creativeHouseItem = async (req, res) => {
  const { category_id, page = 1, limit = 20 } = req.query;
  const filter = { status: 1 };
  if (category_id) filter.creative_house_category_id = category_id;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [items, total] = await Promise.all([
    CreativeHouseItem.find(filter).sort({ display_order: 1 }).skip(skip).limit(parseInt(limit)),
    CreativeHouseItem.countDocuments(filter),
  ]);
  res.json({
    status: 'success',
    data: items.map((i) => ({ ...i.toObject(), creative_house_thumbnail: buildUrl(i.creative_house_thumbnail) })),
    pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
  });
};

const getSingleCreativeHouse = async (req, res) => {
  const { creative_house_slug } = req.params;
  const item = await CreativeHouseItem.findOne({ creative_house_slug, status: 1 }).populate('creative_house_category_id', 'creative_house_category_name');
  if (!item) return res.status(404).json({ status: 'error', message: 'Not found' });

  const [approaches, finalOutputs] = await Promise.all([
    CreativeHouseApproach.find({ creative_house_item_id: item._id, status: 1 }).sort({ display_order: 1 }),
    CreativeHouseFinalOutput.find({ creative_house_item_id: item._id, status: 1 }).sort({ display_order: 1 }),
  ]);

  res.json({
    status: 'success',
    data: {
      item: { ...item.toObject(), creative_house_thumbnail: buildUrl(item.creative_house_thumbnail) },
      approaches: approaches.map((a) => ({ ...a.toObject(), approach_image: buildUrl(a.approach_image) })),
      final_outputs: finalOutputs.map((f) => ({ ...f.toObject(), output_image: buildUrl(f.output_image) })),
    },
  });
};

module.exports = { creativeHomePriority, index, creativeFilterData, creativeHouseItem, getSingleCreativeHouse };
