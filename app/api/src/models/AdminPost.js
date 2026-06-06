const mongoose = require('mongoose');

const adminPostSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  post_title: { type: String, required: true, trim: true },
  post_content: { type: String, trim: true },
  post_image: { type: String, default: null },
  post_status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'adminposts' });

module.exports = mongoose.model('AdminPost', adminPostSchema);
