const mongoose = require('mongoose');

const bannerTitleTemplateSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  banner_title: { type: String, required: true, trim: true },
  banner_subtitle: { type: String, trim: true },
  banner_image: { type: String, default: null },
  page_name: { type: String, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'banner_title_template' });

module.exports = mongoose.model('BannerTitleTemplate', bannerTitleTemplateSchema);
