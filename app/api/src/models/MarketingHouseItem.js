const mongoose = require('mongoose');

const marketingHouseItemSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  marketingHouseCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketingHouseCategory', required: true },
  title: { type: String, required: true, trim: true },
  slug: { type: String, trim: true, unique: true },
  thumbnail: { type: String, default: null },
  videoUrl: { type: String, trim: true },
  description: { type: String, trim: true },
  description2: { type: String, trim: true },
  youtubeId: { type: String, trim: true },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'marketing_house_items' });

module.exports = mongoose.model('MarketingHouseItem', marketingHouseItemSchema);
