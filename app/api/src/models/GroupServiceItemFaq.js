const mongoose = require('mongoose');

const groupServiceItemFaqSchema = new mongoose.Schema({
  group_service_item_id: { type: mongoose.Schema.Types.Mixed, default: null },
  slug: { type: String, trim: true },
  question: { type: String, required: true, trim: true },
  answer: { type: String, required: true, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'group_service_category_item' });

module.exports = mongoose.model('GroupServiceItemFaq', groupServiceItemFaqSchema);
