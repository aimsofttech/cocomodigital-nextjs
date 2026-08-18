const mongoose = require('mongoose');

/* One before / after / growth row in the case-study table. Figures are stored
 * as text so formatting ("2.1M", "+1,978.3%") round-trips exactly as entered.
 */
const growthServiceCaseMetricSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  growthServiceId: { type: mongoose.Schema.Types.Mixed, required: true },
  label: { type: String, required: true, trim: true },
  /** Registry name from the web app's icon map (e.g. "FiEye"). */
  icon: { type: String, trim: true, default: '' },
  before: { type: String, trim: true, default: '' },
  after: { type: String, trim: true, default: '' },
  growth: { type: String, trim: true, default: '' },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 1 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'growth_service_case_metrics' });

module.exports = mongoose.model('GrowthServiceCaseMetric', growthServiceCaseMetricSchema);
