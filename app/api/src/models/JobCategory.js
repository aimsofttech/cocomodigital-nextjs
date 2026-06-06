const mongoose = require('mongoose');

const jobCategorySchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  category_name: { type: String, required: true, trim: true },
  category_slug: { type: String, trim: true, unique: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'job_categories' });

module.exports = mongoose.model('JobCategory', jobCategorySchema);
