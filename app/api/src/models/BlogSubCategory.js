const mongoose = require('mongoose');

const blogSubCategorySchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  blogCategoryId: { type: mongoose.Schema.Types.Mixed, required: true },
  name: { type: String, required: true, trim: true },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'blog_sub_categories' });

module.exports = mongoose.model('BlogSubCategory', blogSubCategorySchema);
