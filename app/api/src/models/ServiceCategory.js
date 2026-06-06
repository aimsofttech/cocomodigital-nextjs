const mongoose = require('mongoose');

const serviceCategorySchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  service_category_name: { type: String, required: true, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'explore_our_service_category' });

module.exports = mongoose.model('ServiceCategory', serviceCategorySchema);
