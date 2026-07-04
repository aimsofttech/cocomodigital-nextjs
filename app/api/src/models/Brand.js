const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  name: { type: String, required: true, trim: true },
  image: { type: String, default: null },
  websiteUrl: { type: String, trim: true, default: null },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'brands' });

module.exports = mongoose.model('Brand', brandSchema);
