const mongoose = require('mongoose');

/* One tile in the four-up KPI row that sits directly under the hero. */
const growthServiceStatSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  growthServiceId: { type: mongoose.Schema.Types.Mixed, required: true },
  /** Registry name from the web app's icon map (e.g. "FiEye"). */
  icon: { type: String, trim: true, default: '' },
  /** Display figure, kept as text so "10M+" and "85%" round-trip unchanged. */
  value: { type: String, required: true, trim: true },
  label: { type: String, required: true, trim: true },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 1 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'growth_service_stats' });

module.exports = mongoose.model('GrowthServiceStat', growthServiceStatSchema);
