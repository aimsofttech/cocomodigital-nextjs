const MarketingForm = require('../../models/MarketingForm');

const index = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;
  const search = req.query.search || '';
  const filter = search
    ? { $or: [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }
    : {};
  const [data, total] = await Promise.all([
    MarketingForm.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    MarketingForm.countDocuments(filter),
  ]);
  res.json({ status: 'success', data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
};

const markRead = async (req, res) => {
  res.json({ status: 'success', message: 'OK' });
};

const destroy = async (req, res) => {
  await MarketingForm.findByIdAndDelete(req.params.id);
  res.json({ status: 'success', message: 'Deleted successfully' });
};

module.exports = { index, markRead, destroy };