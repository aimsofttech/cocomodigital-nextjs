const mongoose = require('mongoose');

const marketingHouseStaticsSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  marketingHouseItemId: { type: mongoose.Schema.Types.Mixed, default: null },
  statics_title: { type: String, trim: true },
  statics_value: { type: String, trim: true },
  statics_description: { type: String, trim: true },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'marketing_house_statics' });

module.exports = mongoose.model('MarketingHouseStatics', marketingHouseStaticsSchema);
