const mongoose = require('mongoose');

const groupServiceItemSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  group_service_category_id: { type: mongoose.Schema.Types.Mixed, required: true },
  group_service_item_thumbnail: { type: String, default: null },
  group_service_item_title: { type: String, required: true, trim: true },
  group_service_item_slug: { type: String, trim: true, unique: true },
  group_service_item_description: { type: String, trim: true },
  group_service_item_description2: { type: String, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'group_service_item' });

module.exports = mongoose.model('GroupServiceItem', groupServiceItemSchema);
