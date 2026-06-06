const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  page_title: { type: String, required: true, trim: true },
  page_slug: { type: String, trim: true, unique: true },
  page_content: { type: String, trim: true },
  meta_title: { type: String, trim: true },
  meta_description: { type: String, trim: true },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'pages' });

module.exports = mongoose.model('Page', pageSchema);
