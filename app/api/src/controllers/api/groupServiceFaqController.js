const GroupServiceItemFaq = require('../../models/GroupServiceItemFaq');

const getBySlug = async (req, res) => {
  const { slug } = req.params;
  const faqs = await GroupServiceItemFaq.find({ slug, status: 1 }).sort({ displayOrder: 1 }).select('-userId');
  res.json({ status: 'success', data: faqs });
};

module.exports = { getBySlug };
