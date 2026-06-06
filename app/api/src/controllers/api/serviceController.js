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
  const categories = await ServiceCategory.find({ status: 1 }).sort({ display_order: 1 });
  const result = [];
  for (const cat of categories) {
    const items = await ServiceItem.find({ service_category_id: cat._id, status: 1 }).sort({ display_order: 1 })
      .select('id service_category_id service_image service_video_url service_title service_slug button_text display_order status');
    result.push({
      ...cat.toObject(),
      items: items.map((i) => ({ ...i.toObject(), service_image: buildUrl(i.service_image), slug: i.service_slug, service_button_text: i.button_text })),
    });
  }
  res.json({ status: 'success', data: result });
};

const groupService = async (req, res) => {
  const { service_slug } = req.params;
  const serviceItem = await ServiceItem.findOne({ service_slug, status: 1 });
  if (!serviceItem) return res.status(404).json({ status: 'error', message: 'Service not found' });

  const categories = await GroupServiceCategory.find({ service_item_id: serviceItem._id, status: 1 }).sort({ display_order: 1 });
  const result = [];
  for (const cat of categories) {
    const items = await GroupServiceItem.find({ group_service_category_id: cat._id, status: 1 }).sort({ display_order: 1 });
    result.push({
      ...cat.toObject(),
      items: items.map((i) => ({ ...i.toObject(), group_service_item_thumbnail: buildUrl(i.group_service_item_thumbnail) })),
    });
  }
  res.json({ status: 'success', data: { service: serviceItem, categories: result } });
};

const getSingleService = async (req, res) => {
  const { group_service_slug } = req.params;
  const serviceItem = await GroupServiceItem.findOne({ group_service_item_slug: group_service_slug, status: 1 });
  if (!serviceItem) return res.status(404).json({ status: 'error', message: 'Service not found' });

  const [images, recentWork, portfolioCategories, faqs] = await Promise.all([
    GroupSingleServiceImage.find({ group_service_item_id: serviceItem._id, status: 1 }).sort({ display_order: 1 }),
    GroupSingleServiceRecentWork.find({ group_service_item_id: serviceItem._id, status: 1 }).sort({ display_order: 1 }),
    GroupSingleServicePortfolioCategory.find({ group_service_item_id: serviceItem._id, status: 1 }).sort({ display_order: 1 }),
    GroupServiceItemFaq.find({ group_service_item_id: serviceItem._id, status: 1 }).sort({ display_order: 1 }),
  ]);

  const portfolioData = [];
  for (const cat of portfolioCategories) {
    const items = await GroupSingleServicePortfolioItem.find({ portfolio_category_id: cat._id, status: 1 }).sort({ display_order: 1 });
    portfolioData.push({
      ...cat.toObject(),
      items: items.map((i) => ({ ...i.toObject(), portfolio_item_image: buildUrl(i.portfolio_item_image) })),
    });
  }

  res.json({
    status: 'success',
    data: {
      service: { ...serviceItem.toObject(), group_service_item_thumbnail: buildUrl(serviceItem.group_service_item_thumbnail) },
      images: images.map((i) => ({ ...i.toObject(), image: buildUrl(i.image) })),
      recent_work: recentWork.map((r) => ({ ...r.toObject(), recent_work_image: buildUrl(r.recent_work_image) })),
      portfolio: portfolioData,
      faqs,
    },
  });
};

const getPortfolioItem = async (req, res) => {
  const { portfolio_category_id } = req.query;
  const filter = { status: 1 };
  if (portfolio_category_id) filter.portfolio_category_id = portfolio_category_id;
  const items = await GroupSingleServicePortfolioItem.find(filter).sort({ display_order: 1 });
  res.json({ status: 'success', data: items.map((i) => ({ ...i.toObject(), portfolio_item_image: buildUrl(i.portfolio_item_image) })) });
};

module.exports = { serviceHomePriority, groupService, getSingleService, getPortfolioItem };
