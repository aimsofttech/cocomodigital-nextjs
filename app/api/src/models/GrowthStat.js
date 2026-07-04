const mongoose = require('mongoose');

// "Growth at a glance" stat tiles on the homepage. The web section
// animates a count-up, so the numeric part is stored separately from
// its prefix/suffix: rendered as `${prefix}${value}${suffix}` (e.g.
// "$" + 600 + "K+" → "$600K+") above the label.
const growthStatSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  prefix: { type: String, trim: true, default: '' },
  value: { type: Number, required: true },
  suffix: { type: String, trim: true, default: '' },
  label: { type: String, required: true, trim: true },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'growth_stats' });

module.exports = mongoose.model('GrowthStat', growthStatSchema);
