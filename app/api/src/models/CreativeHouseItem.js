const mongoose = require('mongoose');

const creativeHouseItemSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  creative_house_category_id: { type: mongoose.Schema.Types.Mixed, required: true },
  creative_house_title: { type: String, required: true, trim: true },
  creative_house_slug: { type: String, trim: true, unique: true },
  creative_house_thumbnail: { type: String, default: null },
  creative_house_video_url: { type: String, trim: true },
  creative_house_youtube_id: { type: String, trim: true },
  creative_house_description: { type: String, trim: true },
  creative_house_description2: { type: String, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'creative_house_item' });

module.exports = mongoose.model('CreativeHouseItem', creativeHouseItemSchema);
