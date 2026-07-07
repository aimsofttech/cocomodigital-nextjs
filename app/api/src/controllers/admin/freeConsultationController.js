const FreeConsultationCategory = require('../../models/FreeConsultationCategory');
const FreeConsultationItem = require('../../models/FreeConsultationItem');

const indexSubmissions = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;
  const search = req.query.search || '';
  // The `free_consultation_item` collection also holds legacy service-config
  // rows (keyed by free_consultation_category_id, no name/email) that are NOT
  // booking submissions. Restrict to real bookings — those always have a name.
  const filter = {
    name: { $exists: true, $nin: [null, ''] },
    ...(search
      ? { $or: [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }
      : {}),
  };
  const [data, total] = await Promise.all([
    FreeConsultationItem.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    FreeConsultationItem.countDocuments(filter),
  ]);
  res.json({ status: 'success', data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
};

const indexCategories = async (req, res) => {
  const data = await FreeConsultationCategory.find().sort({ displayOrder: 1 });
  res.json({ status: 'success', data });
};

const storeCat = async (req, res) => {
  const doc = await FreeConsultationCategory.create(req.body);
  res.status(201).json({ status: 'success', data: doc });
};

const updateCat = async (req, res) => {
  const doc = await FreeConsultationCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!doc) return res.status(404).json({ status: 'error', message: 'Not found' });
  res.json({ status: 'success', data: doc });
};

const show = async (req, res) => {
  const doc = await FreeConsultationCategory.findById(req.params.id);
  if (!doc) return res.status(404).json({ status: 'error', message: 'Not found' });
  const items = await FreeConsultationItem.find({ consultationCategoryId: { $in: [doc._id, String(doc._id)] } });
  res.json({ status: 'success', data: { ...doc.toObject(), selected_services: items } });
};

const destroy = async (req, res) => {
  await FreeConsultationCategory.findByIdAndDelete(req.params.id);
  res.json({ status: 'success', message: 'Deleted' });
};

const destroySubmission = async (req, res) => {
  const doc = await FreeConsultationItem.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ status: 'error', message: 'Not found' });
  res.json({ status: 'success', message: 'Deleted successfully' });
};

module.exports = { indexCategories, indexSubmissions, show, storeCat, updateCat, destroyCat: destroy, destroySubmission };
