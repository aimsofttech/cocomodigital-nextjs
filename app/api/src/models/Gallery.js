const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  image: { type: String, required: true },
  title: { type: String, trim: true },
  description: { type: String, trim: true },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'galleries' });

module.exports = mongoose.model('Gallery', gallerySchema);
