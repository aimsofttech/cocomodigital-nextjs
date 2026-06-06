const JobCategory = require('../../models/JobCategory');

const index = async (req, res) => {
  const categories = await JobCategory.find({ status: 1 }).sort({ display_order: 1 }).select('-user_id');
  res.json({ status: 'success', data: categories });
};

module.exports = { index };
