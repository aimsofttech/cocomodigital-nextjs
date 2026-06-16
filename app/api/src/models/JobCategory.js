const mongoose = require('mongoose');

const jobCategorySchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  // The admin form/list use `name`/`slug`. `category_name`/`category_slug` are
  // legacy fields the public web app still populates, so they're kept optional
  // and mirrored on write (see jobCategoryController). They must NOT be required
  // (would block creates) nor unique (a 2nd null would collide on create).
  name: { type: String, trim: true, default: null },
  category_name: { type: String, trim: true, default: null },
  category_slug: { type: String, trim: true, default: null },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'job_categories' });

module.exports = mongoose.model('JobCategory', jobCategorySchema);
