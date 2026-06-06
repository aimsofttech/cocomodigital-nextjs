const mongoose = require('mongoose');

const authorTemplateSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  author_name: { type: String, required: true, trim: true },
  author_image: { type: String, default: null },
  author_designation: { type: String, trim: true },
  author_bio: { type: String, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'author_template' });

module.exports = mongoose.model('AuthorTemplate', authorTemplateSchema);
