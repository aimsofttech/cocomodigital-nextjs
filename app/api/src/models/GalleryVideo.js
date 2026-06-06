const mongoose = require('mongoose');

const galleryVideoSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  video_thumbnail: { type: String, default: null },
  video_url: { type: String, required: true, trim: true },
  video_youtube_id: { type: String, trim: true },
  video_title: { type: String, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'galleries_video' });

module.exports = mongoose.model('GalleryVideo', galleryVideoSchema);
