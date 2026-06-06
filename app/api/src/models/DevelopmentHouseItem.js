const mongoose = require('mongoose');

const developmentHouseItemSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  development_house_category_id: { type: mongoose.Schema.Types.Mixed, required: true },
  development_house_img: { type: String, default: null },
  development_house_url: { type: String, trim: true },
  development_house_title: { type: String, required: true, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'development_house_item' });

module.exports = mongoose.model('DevelopmentHouseItem', developmentHouseItemSchema);
