const mongoose = require('mongoose');
const CreativeHouseCategory = require('../../models/CreativeHouseCategory');
const CreativeHouseItem = require('../../models/CreativeHouseItem');
const CreativeHouseApproach = require('../../models/CreativeHouseApproach');
const CreativeHouseFinalOutput = require('../../models/CreativeHouseFinalOutput');
const Gallery = require('../../models/Gallery');
const { buildS3Url } = require('../../utils/s3Upload');

const buildUrl = (key) => (key ? buildS3Url(key) : '');

/* The "Brief & Requirement" brand logo. The legacy `requirement_title`
   column on a creative-house item is an integer FK into the gallery
   table (rows where image_type = 'requirement_title'), but the MySQL→
   Mongo migration never converted this FK, so it survives as a bare
   int. The migration also stripped the gallery rows' MySQL ids while
   preserving insertion order, so we resolve by ordering: sorted by
   _id, the requirement-logo galleries run on contiguous MySQL ids
   whose first row (Amazon Mini TV) had id 15 — i.e. Mini TV=15,
   MX Player=16, Prime Video=17, IMDB=18. */
const REQUIREMENT_LOGO_BASE_ID = 15;

// The gallery image key may live under `image_file` (legacy migrated rows) or
// `image` (admin-created rows).
const galleryImageKey = (g) => (g ? g.image_file || g.image : '');

const resolveRequirementLogo = async (requirementTitle) => {
  if (requirementTitle === undefined || requirementTitle === null || requirementTitle === '') return '';

  // New admin entries (and the Client Logo dropdown) store the gallery image's
  // ObjectId directly — resolve it by id.
  const asStr = String(requirementTitle);
  if (asStr.length === 24 && mongoose.Types.ObjectId.isValid(asStr)) {
    const g = await Gallery.findById(asStr).lean();
    const key = galleryImageKey(g);
    if (key) return buildUrl(key);
  }

  // Legacy numeric FK → resolve by insertion order among requirement_title
  // galleries (the MySQL→Mongo migration dropped the ids but kept order).
  const reqId = Number(requirementTitle);
  if (Number.isInteger(reqId) && reqId >= REQUIREMENT_LOGO_BASE_ID) {
    const logos = await Gallery.find({ image_type: 'requirement_title' })
      .sort({ _id: 1 })
      .lean();
    const key = galleryImageKey(logos[reqId - REQUIREMENT_LOGO_BASE_ID]);
    if (key) return buildUrl(key);
  }

  // Fallback: a raw S3 key or absolute URL stored directly on the item.
  if (typeof requirementTitle === 'string' && /[/.]/.test(requirementTitle)) {
    return buildUrl(requirementTitle);
  }

  return '';
};

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

  const [approaches, finalOutputs, requirementLogo] = await Promise.all([
    CreativeHouseApproach.find({ creative_house_item_id: item._id, status: 1 }).sort({ display_order: 1 }),
    CreativeHouseFinalOutput.find({ creative_house_item_id: item._id, status: 1 }).sort({ display_order: 1 }),
    resolveRequirementLogo(item.requirement_title),
  ]);

  res.json({
    status: 'success',
    data: {
      item: {
        ...item.toObject(),
        creative_house_thumbnail: buildUrl(item.creative_house_thumbnail),
        requirement_logo: requirementLogo,
      },
      approaches: approaches.map((a) => ({ ...a.toObject(), approach_image: buildUrl(a.approach_image) })),
      final_outputs: finalOutputs.map((f) => ({ ...f.toObject(), output_image: buildUrl(f.output_image) })),
    },
  });
};

module.exports = { creativeHomePriority, index, creativeFilterData, creativeHouseItem, getSingleCreativeHouse };
