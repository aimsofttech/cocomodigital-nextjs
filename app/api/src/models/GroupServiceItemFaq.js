const mongoose = require('mongoose');

const groupServiceItemFaqSchema = new mongoose.Schema({
  slug: { type: String, trim: true },
  groupServiceItemId: { type: mongoose.Schema.Types.Mixed, default: null },
  groupServiceCategoryId: { type: mongoose.Schema.Types.Mixed, default: null },
  question: { type: String, required: true, trim: true },
  answer: { type: String, required: true, trim: true },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'group_service_category_item' });

module.exports = mongoose.model('GroupServiceItemFaq', groupServiceItemFaqSchema);
