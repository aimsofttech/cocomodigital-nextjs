const mongoose = require('mongoose');

const serviceItemSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  serviceCategoryId: { type: mongoose.Schema.Types.Mixed, required: true },
  image: { type: String, default: null },
  videoUrl: { type: String, trim: true },
  title: { type: String, required: true, trim: true },
  buttonText: { type: String, trim: true },
  buttonUrl: { type: String, trim: true },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'explore_our_service_item' });

module.exports = mongoose.model('ServiceItem', serviceItemSchema);
