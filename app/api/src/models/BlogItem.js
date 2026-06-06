const mongoose = require('mongoose');

const blogItemSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  blog_category_id: { type: mongoose.Schema.Types.Mixed, required: true },
  blog_sub_category_id: { type: mongoose.Schema.Types.Mixed, default: null },
  author_template_id: { type: mongoose.Schema.Types.Mixed, default: null },
  blog_title: { type: String, required: true, trim: true },
  blog_slug: { type: String, trim: true, unique: true },
  blog_thumbnail: { type: String, default: null },
  blog_content: { type: String, trim: true },
  blog_meta_title: { type: String, trim: true },
  blog_meta_description: { type: String, trim: true },
  blog_tags: [{ type: String, trim: true }],
  read_time: { type: String, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
  published_at: { type: Date, default: null },
}, { timestamps: true, strict: false, collection: 'blog_items' });

module.exports = mongoose.model('BlogItem', blogItemSchema);
