const mongoose = require('mongoose');

const serviceItemSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  service_category_id: { type: mongoose.Schema.Types.Mixed, required: true },
  service_image: { type: String, default: null },
  service_video_url: { type: String, trim: true },
  service_title: { type: String, required: true, trim: true },
  service_slug: { type: String, trim: true, unique: true },
  button_text: { type: String, trim: true },
  button_url: { type: String, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'explore_our_service_item' });

module.exports = mongoose.model('ServiceItem', serviceItemSchema);
