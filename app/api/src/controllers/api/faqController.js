const Faq = require('../../models/Faq');

const index = async (req, res) => {
  const faqs = await Faq.find({ status: 1 }).sort({ display_order: 1 }).select('-user_id');
  res.json({ status: 'success', data: faqs });
};

const getBySlug = async (req, res) => {
  const { slug } = req.params;
  const faqs = await Faq.find({ slug, status: 1 }).sort({ display_order: 1 }).select('-user_id');
  res.json({ status: 'success', data: faqs });
};

module.exports = { index, getBySlug };
