const ContactUs = require('../../models/ContactUs');

const index = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;
  const search = req.query.search || '';
  const filter = search
    ? { $or: [{ name: { $regex: search, $options: 'i' } }, { firstName: { $regex: search, $options: 'i' } }, { lastName: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }
    : {};
  const [data, total] = await Promise.all([
    ContactUs.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ContactUs.countDocuments(filter),
  ]);
  res.json({ status: 'success', data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
};

const show = async (req, res) => {
  const doc = await ContactUs.findById(req.params.id);
  if (!doc) return res.status(404).json({ status: 'error', message: 'Not found' });
  res.json({ status: 'success', data: doc });
};

const destroy = async (req, res) => {
  await ContactUs.findByIdAndDelete(req.params.id);
  res.json({ status: 'success', message: 'Deleted successfully' });
};

module.exports = { index, show, destroy };