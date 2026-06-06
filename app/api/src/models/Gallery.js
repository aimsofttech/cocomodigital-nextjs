const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  image: { type: String, required: true },
  image_title: { type: String, trim: true },
  image_description: { type: String, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'galleries' });

module.exports = mongoose.model('Gallery', gallerySchema);
