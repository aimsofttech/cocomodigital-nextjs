const JobCategory = require('../../models/JobCategory');

const index = async (req, res) => {
  const categories = await JobCategory.find({ status: 1 }).sort({ displayOrder: 1 }).select('-userId');
  res.json({ status: 'success', data: categories });
};

module.exports = { index };
