const mongoose = require('mongoose');
const ServiceCategory = require('../../models/ServiceCategory');
const ServiceItem = require('../../models/ServiceItem');
const GroupServiceCategory = require('../../models/GroupServiceCategory');
const GroupServiceItem = require('../../models/GroupServiceItem');
const GroupTopBanner = require('../../models/GroupTopBanner');
const GroupSingleServiceImage = require('../../models/GroupSingleServiceImage');
const GroupSingleServiceRecentWork = require('../../models/GroupSingleServiceRecentWork');
const GroupSingleServicePortfolioCategory = require('../../models/GroupSingleServicePortfolioCategory');
const GroupSingleServicePortfolioItem = require('../../models/GroupSingleServicePortfolioItem');
const GroupServiceItemFaq = require('../../models/GroupServiceItemFaq');
const { buildS3Url } = require('../../utils/s3Upload');

const buildUrl = (key) => (key ? buildS3Url(key) : '');

const serviceHomePriority = async (req, res) => {
  const categories = await ServiceCategory.find({ status: 1 }).sort({ displayOrder: 1 });
  const result = [];
  for (const cat of categories) {
    const items = await ServiceItem.find({ serviceCategoryId: cat._id, status: 1 }).sort({ displayOrder: 1 })
      .select('id serviceCategoryId image videoUrl title slug buttonText displayOrder status');
    result.push({
      ...cat.toObject(),
      items: items.map((i) => ({ ...i.toObject(), image: buildUrl(i.image) })),
    });
  }
  res.json({ status: 'success', data: result });
};

const groupService = async (req, res) => {
  const { service_slug } = req.params;
  const serviceItem = await ServiceItem.findOne({ slug: service_slug, status: 1 });
  if (!serviceItem) return res.status(404).json({ status: 'error', message: 'Service not found' });

  const categories = await GroupServiceCategory.find({
    status: 1,
    exploreOurServiceItemId: { $in: [serviceItem._id, String(serviceItem._id)] },
  }).sort({ displayOrder: 1 });
  const result = [];
  for (const cat of categories) {
    const catKeys = [cat._id, String(cat._id)];
    // Items can be linked two ways: directly on the item
    // (groupServiceCategoryId) or via the group_service_category_item
    // join table. Union both so every section shows all its services.
    const directItems = await GroupServiceItem.find({
      status: 1,
      groupServiceCategoryId: { $in: catKeys },
    });
    const joinRows = await mongoose.connection
      .collection('group_service_category_item')
      .find({ groupServiceCategoryId: { $in: catKeys } })
      .toArray();
    const joinItemIds = joinRows.map((j) => j.groupServiceItemId).filter(Boolean);
    const joinItems = joinItemIds.length
      ? await GroupServiceItem.find({ status: 1, _id: { $in: joinItemIds } })
      : [];
    const byId = new Map();
    for (const i of [...directItems, ...joinItems]) byId.set(String(i._id), i);
    const items = Array.from(byId.values()).sort(
      (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0),
    );
    result.push({
      ...cat.toObject(),
      items: items.map((i) => ({ ...i.toObject(), thumbnail: buildUrl(i.thumbnail) })),
    });
  }

  // Top banner(s) for this service page — prefer the banner linked to
  // this exact service item; fall back to its category's banner.
  let banners = await GroupTopBanner.find({
    status: 1,
    exploreOurServiceItemId: { $in: [serviceItem._id, String(serviceItem._id)] },
  }).sort({ displayOrder: 1 });
  if (banners.length === 0 && serviceItem.serviceCategoryId) {
    banners = await GroupTopBanner.find({
      status: 1,
      exploreOurServiceCategoryId: {
        $in: [serviceItem.serviceCategoryId, String(serviceItem.serviceCategoryId)],
      },
    }).sort({ displayOrder: 1 });
  }
  const topBanner = banners.map((b) => ({
    ...b.toObject(),
    image: buildUrl(b.image),
  }));

  res.json({ status: 'success', data: { service: serviceItem, categories: result, topBanner } });
};

const getSingleService = async (req, res) => {
  const { slug } = req.params;
  const serviceItem = await GroupServiceItem.findOne({ slug, status: 1 });
  if (!serviceItem) return res.status(404).json({ status: 'error', message: 'Service not found' });

  const [images, recentWork, portfolioCategories, faqs] = await Promise.all([
    GroupSingleServiceImage.find({ groupServiceItemId: serviceItem._id, status: 1 }).sort({ displayOrder: 1 }),
    GroupSingleServiceRecentWork.find({ groupServiceItemId: serviceItem._id, status: 1 }).sort({ displayOrder: 1 }),
    GroupSingleServicePortfolioCategory.find({ groupServiceItemId: serviceItem._id, status: 1 }).sort({ displayOrder: 1 }),
    GroupServiceItemFaq.find({ groupServiceItemId: serviceItem._id, status: 1 }).sort({ displayOrder: 1 }),
  ]);

  const portfolioData = [];
  for (const cat of portfolioCategories) {
    const items = await GroupSingleServicePortfolioItem.find({ portfolioCategoryId: cat._id, status: 1 }).sort({ displayOrder: 1 });
    portfolioData.push({
      ...cat.toObject(),
      items: items.map((i) => ({ ...i.toObject(), image: buildUrl(i.image) })),
    });
  }

  res.json({
    status: 'success',
    data: {
      service: { ...serviceItem.toObject(), thumbnail: buildUrl(serviceItem.thumbnail) },
      images: images.map((i) => ({ ...i.toObject(), image: buildUrl(i.image) })),
      recent_work: recentWork.map((r) => ({ ...r.toObject(), image: buildUrl(r.image) })),
      portfolio: portfolioData,
      faqs,
    },
  });
};

const getPortfolioItem = async (req, res) => {
  const { portfolioCategoryId } = req.query;
  const filter = { status: 1 };
  if (portfolioCategoryId) filter.portfolioCategoryId = portfolioCategoryId;
  const items = await GroupSingleServicePortfolioItem.find(filter).sort({ displayOrder: 1 });
  res.json({ status: 'success', data: items.map((i) => ({ ...i.toObject(), image: buildUrl(i.image) })) });
};

module.exports = { serviceHomePriority, groupService, getSingleService, getPortfolioItem };
