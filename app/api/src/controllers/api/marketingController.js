const mongoose = require('mongoose');
const MarketingHouseCategory = require('../../models/MarketingHouseCategory');
const MarketingHouseItem = require('../../models/MarketingHouseItem');
const MarketingHouseImage = require('../../models/MarketingHouseImage');
const MarketingHouseStatics = require('../../models/MarketingHouseStatics');
const MarketingHousePerformance = require('../../models/MarketingHousePerformance');
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
  const categories = await MarketingHouseCategory.find({ status: 1 }).sort({ displayOrder: 1 });
  const result = [];
  for (const cat of categories) {
    const items = await MarketingHouseItem.find({ marketingHouseCategoryId: cat._id, status: 1 }).sort({ displayOrder: 1 });
    result.push({
      ...cat.toObject(),
      items: items.map((i) => ({ ...i.toObject(), thumbnail: buildUrl(i.thumbnail) })),
    });
  }
  res.json({ status: 'success', data: result });
};

const index = async (req, res) => marketingHomePriority(req, res);

const marketingFilterData = async (req, res) => {
  const categories = await MarketingHouseCategory.find({ status: 1 }).sort({ displayOrder: 1 }).select('id name');
  res.json({ status: 'success', data: { categories } });
};

const marketingHouseItem = async (req, res) => {
  const { category_id, page = 1, limit = 20 } = req.query;
  const filter = { status: 1 };
  if (category_id) filter.marketingHouseCategoryId = category_id;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [items, total] = await Promise.all([
    MarketingHouseItem.find(filter).sort({ displayOrder: 1 }).skip(skip).limit(parseInt(limit)),
    MarketingHouseItem.countDocuments(filter),
  ]);
  res.json({ status: 'success', data: items.map((i) => ({ ...i.toObject(), thumbnail: buildUrl(i.thumbnail) })), pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
};

const getSingleMarketingHouse = async (req, res) => {
  const { slug } = req.params;
  const item = await MarketingHouseItem.findOne({ slug, status: 1 }).populate('marketingHouseCategoryId', 'name');
  if (!item) return res.status(404).json({ status: 'error', message: 'Not found' });

  // The sub-collection link fields (marketingHouseItemId, *_category_id) are
  // Mixed: migrated rows hold ObjectIds, but records created via the admin form
  // can persist the id as a plain string. A bare `{ field: item._id }` (ObjectId)
  // misses the string rows, so newly-added data shows as "Data not available".
  // Match BOTH the ObjectId and string forms of an id so either persists.
  const idVariants = (id) => {
    const s = String(id);
    const out = [s];
    if (mongoose.Types.ObjectId.isValid(s)) out.push(new mongoose.Types.ObjectId(s));
    return out;
  };
  const itemIds = idVariants(item._id);

  const [images, statics, performances, ideaStrategy, otherActivityCats, contentCats, carousels, communityProgramCats, faqs] = await Promise.all([
    MarketingHouseImage.find({ marketingHouseItemId: { $in: itemIds }, status: 1 }).sort({ displayOrder: 1 }),
    MarketingHouseStatics.find({ marketingHouseItemId: { $in: itemIds }, status: 1 }).sort({ displayOrder: 1 }),
    MarketingHousePerformance.find({ marketingHouseItemId: { $in: itemIds }, status: 1 }).sort({ displayOrder: 1 }),
    MarketingHouseIdeaStrategyPlanning.find({ marketingHouseItemId: { $in: itemIds }, status: 1 }).sort({ displayOrder: 1 }),
    MarketingHouseOtherActivityCategory.find({ marketingHouseItemId: { $in: itemIds }, status: 1 }).sort({ displayOrder: 1 }),
    MarketingHouseContentCreatedCategory.find({ marketingHouseItemId: { $in: itemIds }, status: 1 }).sort({ displayOrder: 1 }),
    MarketingHouseContentCreatedItemCarousel.find({ marketingHouseItemId: { $in: itemIds }, status: 1 }).sort({ displayOrder: 1 }),
    MarketingHouseCommunityProgramCategory.find({ marketingHouseItemId: { $in: itemIds }, status: 1 }).sort({ displayOrder: 1 }),
    Faq.find({ marketingHouseItemId: { $in: itemIds }, status: 1 }).sort({ displayOrder: 1 }),
  ]);

  const mapOtherActivityItem = (i) => ({
    ...i.toObject(),
    image: buildUrl(i.image),
    image1: buildUrl(i.image1),
    image2: buildUrl(i.image2),
    image3: buildUrl(i.image3),
    image4: buildUrl(i.image4),
  });

  const otherActivityData = [];
  const seenActivityItemIds = new Set();
  for (const cat of otherActivityCats) {
    const catItems = await MarketingHouseOtherActivityItem.find({ marketingHouseItemId: { $in: itemIds }, marketingHouseOtherActivityCategoryId: { $in: idVariants(cat._id) }, status: 1 }).sort({ displayOrder: 1 });
    catItems.forEach((i) => seenActivityItemIds.add(String(i._id)));
    otherActivityData.push({ ...cat.toObject(), items: catItems.map(mapOtherActivityItem) });
  }
  // The activity category is optional in admin, so an item can exist without a
  // category link. Such items would otherwise be dropped from every tab — surface
  // them under the first category so they still render on the web.
  if (otherActivityData.length) {
    const allItems = await MarketingHouseOtherActivityItem.find({ marketingHouseItemId: { $in: itemIds }, status: 1 }).sort({ displayOrder: 1 });
    const orphanItems = allItems.filter((i) => !seenActivityItemIds.has(String(i._id)));
    if (orphanItems.length) otherActivityData[0].items.push(...orphanItems.map(mapOtherActivityItem));
  }

  const contentData = [];
  for (const cat of contentCats) {
    const catItems = await MarketingHouseContentCreatedItem.find({ marketingHouseItemId: { $in: itemIds }, marketingHouseContentCreatedCategoryId: { $in: idVariants(cat._id) }, status: 1 }).sort({ displayOrder: 1 });
    contentData.push({ ...cat.toObject(), items: catItems.map((i) => ({ ...i.toObject(), image: buildUrl(i.image) })) });
  }

  const communityProgramData = [];
  for (const cat of communityProgramCats) {
    const catItems = await MarketingHouseCommunityProgramCategoryItem.find({ marketingHouseItemId: { $in: itemIds }, communityProgramCategoryId: { $in: idVariants(cat._id) }, status: 1 }).sort({ displayOrder: 1 });
    communityProgramData.push({ ...cat.toObject(), image: buildUrl(cat.image), items: catItems.map((i) => ({ ...i.toObject(), image: buildUrl(i.image) })) });
  }

  res.json({
    status: 'success',
    data: {
      item: { ...item.toObject(), thumbnail: buildUrl(item.thumbnail) },
      images: images.map((i) => ({ ...i.toObject(), image: buildUrl(i.image) })),
      statics,
      performances: performances.map((p) => ({ ...p.toObject(), performance_image: buildUrl(p.performance_image) })),
      idea_strategy: ideaStrategy.map((i) => ({ ...i.toObject(), image: buildUrl(i.image) })),
      other_activities: otherActivityData,
      content_created: contentData,
      carousels: carousels.map((c) => ({ ...c.toObject(), image: buildUrl(c.image) })),
      community_programs: communityProgramData,
      faqs,
    },
  });
};

const getMarketingOtherActivityItem = async (req, res) => {
  const { marketingHouseItemId } = req.query;
  const items = await MarketingHouseOtherActivityItem.find({ marketingHouseItemId, status: 1 }).sort({ displayOrder: 1 });
  res.json({ status: 'success', data: items.map((i) => ({ ...i.toObject(), image: buildUrl(i.image) })) });
};

const getMarketingContinuityProgramItem = async (req, res) => {
  const { marketingHouseItemId } = req.query;
  const cats = await MarketingHouseCommunityProgramCategory.find({ marketingHouseItemId, status: 1 }).sort({ displayOrder: 1 });
  const result = [];
  for (const cat of cats) {
    const items = await MarketingHouseCommunityProgramCategoryItem.find({ communityProgramCategoryId: cat._id, status: 1 }).sort({ displayOrder: 1 });
    result.push({ ...cat.toObject(), image: buildUrl(cat.image), items: items.map((i) => ({ ...i.toObject(), image: buildUrl(i.image) })) });
  }
  res.json({ status: 'success', data: result });
};

const getMarketingContentCreatedCarousel = async (req, res) => {
  const { marketingHouseItemId } = req.query;
  const items = await MarketingHouseContentCreatedItemCarousel.find({ marketingHouseItemId, status: 1 }).sort({ displayOrder: 1 });
  res.json({ status: 'success', data: items.map((i) => ({ ...i.toObject(), image: buildUrl(i.image) })) });
};

const getMarketingContentCreatedItem = async (req, res) => {
  const { marketingHouseItemId, category_id } = req.query;
  const filter = { marketingHouseItemId, status: 1 };
  if (category_id) filter.marketingHouseContentCreatedCategoryId = category_id;
  const items = await MarketingHouseContentCreatedItem.find(filter).sort({ displayOrder: 1 });
  res.json({ status: 'success', data: items.map((i) => ({ ...i.toObject(), image: buildUrl(i.image) })) });
};

const marketingForm = async (req, res) => {
  const { name, email, phone, company, message, service_type, marketingHouseItemId } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ status: 'error', message: 'Name, email, and message are required' });
  }
  const form = await MarketingForm.create({ name, email, phone, company, message, service_type, marketingHouseItemId });
  require('../../crm/services/leadIngest').ingestSafe({
    channel: 'marketing_form', externalCollection: 'marketing_form', externalId: form._id,
    name, email, phone, company, message, serviceInterest: service_type,
  });
  res.status(201).json({ status: 'success', message: 'Form submitted successfully', data: form });
};

module.exports = {
  marketingHomePriority, index, marketingFilterData, marketingHouseItem, getSingleMarketingHouse,
  getMarketingOtherActivityItem, getMarketingContinuityProgramItem,
  getMarketingContentCreatedCarousel, getMarketingContentCreatedItem, marketingForm,
};
