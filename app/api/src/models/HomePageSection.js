const mongoose = require('mongoose');

const homePageSectionSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  section_name: { type: String, required: true, trim: true },
  section_title: { type: String, trim: true },
  section_subtitle: { type: String, trim: true },
  section_type: { type: String, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 1 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'home_page_sections' });

module.exports = mongoose.model('HomePageSection', homePageSectionSchema);
