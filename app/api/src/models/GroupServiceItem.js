const mongoose = require('mongoose');

const groupServiceItemSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  groupServiceCategoryId: { type: mongoose.Schema.Types.Mixed, required: true },
  thumbnail: { type: String, default: null },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  description2: { type: String, trim: true },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'group_service_item' });

module.exports = mongoose.model('GroupServiceItem', groupServiceItemSchema);
