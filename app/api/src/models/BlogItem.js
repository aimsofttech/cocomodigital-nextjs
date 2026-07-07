const mongoose = require('mongoose');

const blogItemSchema = new mongoose.Schema({
  blogCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogCategory', required: true },
  blogSubCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogSubCategory', default: null },
  authorTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'AuthorTemplate', default: null },
  title: { type: String, required: true, trim: true },
  slug: { type: String, trim: true, unique: true },
  thumbnail: { type: String, default: null },
  content: { type: String, trim: true },
  description: { type: String, trim: true },
  metaTitle: { type: String, trim: true },
  metaDescription: { type: String, trim: true },
  metaKeyword: { type: String, trim: true },
  tags: [{ type: String, trim: true }],
  readTime: { type: String, trim: true },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
  publishedAt: { type: Date, default: null },
}, { timestamps: true, strict: false, collection: 'blog_items' });

module.exports = mongoose.model('BlogItem', blogItemSchema);
