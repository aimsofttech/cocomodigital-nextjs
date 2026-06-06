const mongoose = require('mongoose');

const monthlyPerformanceShowcaseSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  mps_category_id: { type: mongoose.Schema.Types.Mixed, required: true },
  mps_subcategory_id: { type: mongoose.Schema.Types.Mixed, default: null },
  mps_title: { type: String, trim: true },
  mps_description: { type: String, trim: true },
  mps_img: { type: String, default: null },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'monthly_performance_showcase' });

module.exports = mongoose.model('MonthlyPerformanceShowcase', monthlyPerformanceShowcaseSchema);
