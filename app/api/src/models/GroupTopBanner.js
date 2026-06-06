const mongoose = require('mongoose');

const groupTopBannerSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  service_category_id: { type: mongoose.Schema.Types.Mixed, default: null },
  service_item_id: { type: mongoose.Schema.Types.Mixed, default: null },
  group_banner_heading: { type: String, required: true, trim: true },
  group_banner_subheading: { type: String, trim: true },
  group_banner_button_text: { type: String, trim: true },
  group_banner_button_url: { type: String, trim: true },
  group_banner_img: { type: String, default: null },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'group_top_banner' });

module.exports = mongoose.model('GroupTopBanner', groupTopBannerSchema);
