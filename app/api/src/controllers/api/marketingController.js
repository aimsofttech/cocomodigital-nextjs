const MarketingHouseCategory = require('../../models/MarketingHouseCategory');
const MarketingHouseItem = require('../../models/MarketingHouseItem');
const MarketingHouseImage = require('../../models/MarketingHouseImage');
const MarketingHouseStatics = require('../../models/MarketingHouseStatics');
const MarketingHousePerformance = require('../../models/MarketingHousePerformance');
const MarketingHousePreLaunchActivity = require('../../models/MarketingHousePreLaunchActivity');
const MarketingHouseIdeaStrategyPlanning = require('../../models/MarketingHouseIdeaStrategyPlanning');
const MarketingHouseOtherActivityCategory = require('../../models/MarketingHouseOtherActivityCategory');
const MarketingHouseOtherActivityItem = require('../../models/MarketingHouseOtherActivityItem');
const MarketingHouseContentCreatedCategory = require('../../models/MarketingHouseContentCreatedCategory');
const MarketingHouseContentCreatedItem = require('../../models/MarketingHouseContentCreatedItem');
const MarketingHouseContentCreatedItemCarousel = require('../../models/MarketingHouseContentCreatedItemCarousel');
const MarketingHouseCommunityProgramCategory = require('../../models/MarketingHouseCommunityProgramCategory');
const MarketingHouseCommunityProgramCategoryItem = require('../../models/MarketingHouseCommunityProgramCategoryItem');
const MarketingForm = require('../../models/MarketingForm');
const Faq = require('../../models/Faq');
const { buildS3Url } = require('../../utils/s3Upload');

const buildUrl = (key) => (key ? buildS3Url(key) : '');

const marketingHomePriority = async (req, res) => {
  const categories = await MarketingHouseCategory.find({ status: 1 }).sort({ display_order: 1 });
  const result = [];
  for (const cat of categories) {
    const items = await MarketingHouseItem.find({ marketing_house_category_id: cat._id, status: 1 }).sort({ display_order: 1 });
    result.push({
      ...cat.toObject(),
      items: items.map((i) => ({ ...i.toObject(), marketing_house_thumbnail: buildUrl(i.marketing_house_thumbnail) })),
    });
  }
  res.json({ status: 'success', data: result });
};

const index = async (req, res) => marketingHomePriority(req, res);

const marketingFilterData = async (req, res) => {
  const categories = await MarketingHouseCategory.find({ status: 1 }).sort({ display_order: 1 }).select('id category_name');
  res.json({ status: 'success', data: { categories } });
};

const marketingHouseItem = async (req, res) => {
  const { category_id, page = 1, limit = 20 } = req.query;
  const filter = { status: 1 };
  if (category_id) filter.marketing_house_category_id = category_id;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [items, total] = await Promise.all([
    MarketingHouseItem.find(filter).sort({ display_order: 1 }).skip(skip).limit(parseInt(limit)),
    MarketingHouseItem.countDocuments(filter),
  ]);
  res.json({ status: 'success', data: items.map((i) => ({ ...i.toObject(), marketing_house_thumbnail: buildUrl(i.marketing_house_thumbnail) })), pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
};

const getSingleMarketingHouse = async (req, res) => {
  const { marketing_house_slug } = req.params;
  const item = await MarketingHouseItem.findOne({ marketing_house_slug, status: 1 }).populate('marketing_house_category_id', 'category_name');
  if (!item) return res.status(404).json({ status: 'error', message: 'Not found' });

  const [images, statics, performances, preLaunch, ideaStrategy, otherActivityCats, contentCats, carousels, communityProgramCats, faqs] = await Promise.all([
    MarketingHouseImage.find({ marketing_house_item_id: item._id, status: 1 }).sort({ display_order: 1 }),
    MarketingHouseStatics.find({ marketing_house_item_id: item._id, status: 1 }).sort({ display_order: 1 }),
    MarketingHousePerformance.find({ marketing_house_item_id: item._id, status: 1 }).sort({ display_order: 1 }),
    MarketingHousePreLaunchActivity.find({ marketing_house_item_id: item._id, status: 1 }).sort({ display_order: 1 }),
    MarketingHouseIdeaStrategyPlanning.find({ marketing_house_item_id: item._id, status: 1 }).sort({ display_order: 1 }),
    MarketingHouseOtherActivityCategory.find({ marketing_house_item_id: item._id, status: 1 }).sort({ display_order: 1 }),
    MarketingHouseContentCreatedCategory.find({ marketing_house_item_id: item._id, status: 1 }).sort({ display_order: 1 }),
    MarketingHouseContentCreatedItemCarousel.find({ marketing_house_item_id: item._id, status: 1 }).sort({ display_order: 1 }),
    MarketingHouseCommunityProgramCategory.find({ marketing_house_item_id: item._id, status: 1 }).sort({ display_order: 1 }),
    Faq.find({ marketing_house_item_id: item._id, status: 1 }).sort({ display_order: 1 }),
  ]);

  const otherActivityData = [];
  for (const cat of otherActivityCats) {
    const catItems = await MarketingHouseOtherActivityItem.find({ marketing_house_item_id: item._id, marketing_house_other_activity_category_id: cat._id, status: 1 }).sort({ display_order: 1 });
    otherActivityData.push({
      ...cat.toObject(),
      items: catItems.map((i) => ({
        ...i.toObject(),
        image1: buildUrl(i.image1),
        image2: buildUrl(i.image2),
        image3: buildUrl(i.image3),
        image4: buildUrl(i.image4),
      })),
    });
  }

  const contentData = [];
  for (const cat of contentCats) {
    const catItems = await MarketingHouseContentCreatedItem.find({ marketing_house_item_id: item._id, marketing_house_content_created_category_id: cat._id, status: 1 }).sort({ display_order: 1 });
    contentData.push({ ...cat.toObject(), items: catItems.map((i) => ({ ...i.toObject(), image: buildUrl(i.image) })) });
  }

  const communityProgramData = [];
  for (const cat of communityProgramCats) {
    const catItems = await MarketingHouseCommunityProgramCategoryItem.find({ marketing_house_item_id: item._id, community_program_category_id: cat._id, status: 1 }).sort({ display_order: 1 });
    communityProgramData.push({ ...cat.toObject(), category_image: buildUrl(cat.category_image), items: catItems.map((i) => ({ ...i.toObject(), item_image: buildUrl(i.item_image) })) });
  }

  res.json({
    status: 'success',
    data: {
      item: { ...item.toObject(), marketing_house_thumbnail: buildUrl(item.marketing_house_thumbnail) },
      images: images.map((i) => ({ ...i.toObject(), image: buildUrl(i.image) })),
      statics,
      performances: performances.map((p) => ({ ...p.toObject(), performance_image: buildUrl(p.performance_image) })),
      pre_launch: preLaunch.map((p) => ({ ...p.toObject(), activity_image: buildUrl(p.activity_image) })),
      idea_strategy: ideaStrategy.map((i) => ({ ...i.toObject(), idea_image: buildUrl(i.idea_image) })),
      other_activities: otherActivityData,
      content_created: contentData,
      carousels: carousels.map((c) => ({ ...c.toObject(), carousel_image: buildUrl(c.carousel_image) })),
      community_programs: communityProgramData,
      faqs,
    },
  });
};

const getMarketingOtherActivityItem = async (req, res) => {
  const { marketing_house_item_id } = req.query;
  const items = await MarketingHouseOtherActivityItem.find({ marketing_house_item_id, status: 1 }).sort({ display_order: 1 });
  res.json({ status: 'success', data: items.map((i) => ({ ...i.toObject(), item_image: buildUrl(i.item_image) })) });
};

const getMarketingContinuityProgramItem = async (req, res) => {
  const { marketing_house_item_id } = req.query;
  const cats = await MarketingHouseCommunityProgramCategory.find({ marketing_house_item_id, status: 1 }).sort({ display_order: 1 });
  const result = [];
  for (const cat of cats) {
    const items = await MarketingHouseCommunityProgramCategoryItem.find({ community_program_category_id: cat._id, status: 1 }).sort({ display_order: 1 });
    result.push({ ...cat.toObject(), category_image: buildUrl(cat.category_image), items: items.map((i) => ({ ...i.toObject(), item_image: buildUrl(i.item_image) })) });
  }
  res.json({ status: 'success', data: result });
};

const getMarketingContentCreatedCarousel = async (req, res) => {
  const { marketing_house_item_id } = req.query;
  const items = await MarketingHouseContentCreatedItemCarousel.find({ marketing_house_item_id, status: 1 }).sort({ display_order: 1 });
  res.json({ status: 'success', data: items.map((i) => ({ ...i.toObject(), carousel_image: buildUrl(i.carousel_image) })) });
};

const getMarketingContentCreatedItem = async (req, res) => {
  const { marketing_house_item_id, category_id } = req.query;
  const filter = { marketing_house_item_id, status: 1 };
  if (category_id) filter.content_created_category_id = category_id;
  const items = await MarketingHouseContentCreatedItem.find(filter).sort({ display_order: 1 });
  res.json({ status: 'success', data: items.map((i) => ({ ...i.toObject(), item_image: buildUrl(i.item_image) })) });
};

const marketingForm = async (req, res) => {
  const { name, email, phone, company, message, service_type, marketing_house_item_id } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ status: 'error', message: 'Name, email, and message are required' });
  }
  const form = await MarketingForm.create({ name, email, phone, company, message, service_type, marketing_house_item_id });
  res.status(201).json({ status: 'success', message: 'Form submitted successfully', data: form });
};

module.exports = {
  marketingHomePriority, index, marketingFilterData, marketingHouseItem, getSingleMarketingHouse,
  getMarketingOtherActivityItem, getMarketingContinuityProgramItem,
  getMarketingContentCreatedCarousel, getMarketingContentCreatedItem, marketingForm,
};
