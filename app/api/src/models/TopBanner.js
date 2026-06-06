const mongoose = require('mongoose');

const topBannerSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  book_call_template_id: { type: mongoose.Schema.Types.Mixed, default: null },
  country: { type: String, default: 'en-us', trim: true },
  heading: { type: String, required: true, trim: true },
  sub_heading: { type: String, trim: true },
  banner_button_text: { type: String, trim: true },
  banner_button_url: { type: String, trim: true },
  banner_video_thumbnail: { type: String, default: null },
  banner_video_url: { type: String, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'top_banner' });

module.exports = mongoose.model('TopBanner', topBannerSchema);
