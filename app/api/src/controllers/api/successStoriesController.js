const SuccessStoriesProject = require('../../models/SuccessStoriesProject');
const ServiceItem = require('../../models/ServiceItem');
const { buildS3Url } = require('../../utils/s3Upload');
const buildUrl = (key) => (key ? buildS3Url(key) : '');

const latestSuccessStoriesFilterData = async (req, res) => {
  const services = await ServiceItem.find({ status: 1 }).sort({ displayOrder: 1 }).select('title slug');
  res.json({ status: 'success', data: { services } });
};

const successStories = async (req, res) => {
  const { service_item_id, page = 1, limit = 12 } = req.query;
  const filter = { status: 1 };
  if (service_item_id) filter.service_item_id = service_item_id;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [items, total] = await Promise.all([
    SuccessStoriesProject.find(filter).sort({ display_order: 1 }).skip(skip).limit(parseInt(limit)).populate('service_item_id', 'title slug'),
    SuccessStoriesProject.countDocuments(filter),
  ]);
  res.json({
    status: 'success',
    data: items.map((s) => ({ ...s.toObject(), project_image: buildUrl(s.project_image) })),
    pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
  });
};

module.exports = { latestSuccessStoriesFilterData, successStories };
