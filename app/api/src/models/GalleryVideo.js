const mongoose = require('mongoose');

const galleryVideoSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  thumbnail: { type: String, default: null },
  url: { type: String, required: true, trim: true },
  youtubeId: { type: String, trim: true },
  title: { type: String, trim: true },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'galleries_video' });

module.exports = mongoose.model('GalleryVideo', galleryVideoSchema);
