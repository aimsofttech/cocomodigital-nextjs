const mongoose = require('mongoose');

const marketingHouseImageSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  marketing_house_item_id: { type: mongoose.Schema.Types.Mixed, required: true },
  image: { type: String, default: null },
  image_title: { type: String, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'marketing_house_images' });

module.exports = mongoose.model('MarketingHouseImage', marketingHouseImageSchema);
