const mongoose = require('mongoose');

const marketingHouseStaticsSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  marketing_house_item_id: { type: mongoose.Schema.Types.Mixed, required: true },
  statics_title: { type: String, trim: true },
  statics_value: { type: String, trim: true },
  statics_description: { type: String, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'marketing_house_statics' });

module.exports = mongoose.model('MarketingHouseStatics', marketingHouseStaticsSchema);
