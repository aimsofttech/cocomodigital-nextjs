const mongoose = require('mongoose');

const monthlyPerformanceShowcaseSubcategorySchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  mps_category_id: { type: mongoose.Schema.Types.Mixed, required: true },
  mps_subcategory_name: { type: String, required: true, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'monthly_performance_showcase_subcategory' });

module.exports = mongoose.model('MonthlyPerformanceShowcaseSubcategory', monthlyPerformanceShowcaseSubcategorySchema);
