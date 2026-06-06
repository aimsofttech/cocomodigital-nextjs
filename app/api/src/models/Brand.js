const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  brand_name: { type: String, required: true, trim: true },
  brand_image: { type: String, default: null },
  website_url: { type: String, trim: true, default: null },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'brands' });

module.exports = mongoose.model('Brand', brandSchema);
