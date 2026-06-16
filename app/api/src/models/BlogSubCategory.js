const mongoose = require('mongoose');

const blogSubCategorySchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  blog_category_id: { type: mongoose.Schema.Types.Mixed, required: true },
  // The admin form and the app use `blog_sub_category_name`/`blog_sub_category_slug`.
  // `sub_category_name`/`sub_category_slug` are legacy migration fields kept optional
  // so they don't block creates (sub_category_slug's unique index doesn't exist in
  // the DB, and keeping it unique would reject a 2nd null on create).
  blog_sub_category_name: { type: String, required: true, trim: true },
  blog_sub_category_slug: { type: String, trim: true, default: null },
  sub_category_name: { type: String, trim: true, default: null },
  sub_category_slug: { type: String, trim: true, default: null },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'blog_sub_categories' });

module.exports = mongoose.model('BlogSubCategory', blogSubCategorySchema);
