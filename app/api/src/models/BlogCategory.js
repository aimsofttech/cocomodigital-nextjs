const mongoose = require('mongoose');

const blogCategorySchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  // The admin form and the whole app use `blog_category_name` (+ `slug`).
  // `category_name`/`category_slug` are legacy migration fields kept optional so
  // they don't block creates. (`category_slug` was declared unique but no such
  // index exists in the DB; keeping it unique would reject a 2nd null on create.)
  blog_category_name: { type: String, required: true, trim: true },
  category_name: { type: String, trim: true, default: null },
  category_slug: { type: String, trim: true, default: null },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'blog_categories' });

module.exports = mongoose.model('BlogCategory', blogCategorySchema);
