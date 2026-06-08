const mongoose = require('mongoose');

const marketingHouseItemSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  marketing_house_category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketingHouseCategory', required: true },
  marketing_house_title: { type: String, required: true, trim: true },
  marketing_house_slug: { type: String, trim: true, unique: true },
  marketing_house_thumbnail: { type: String, default: null },
  marketing_house_video_url: { type: String, trim: true },
  marketing_house_description: { type: String, trim: true },
  marketing_house_description2: { type: String, trim: true },
  marketing_house_youtube_id: { type: String, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'marketing_house_items' });

module.exports = mongoose.model('MarketingHouseItem', marketingHouseItemSchema);
