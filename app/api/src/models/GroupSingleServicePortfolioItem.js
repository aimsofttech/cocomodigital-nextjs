const mongoose = require('mongoose');

const groupSingleServicePortfolioItemSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  portfolio_category_id: { type: mongoose.Schema.Types.Mixed, required: true },
  group_service_category_id: { type: mongoose.Schema.Types.Mixed, default: null },
  portfolio_item_title: { type: String, trim: true },
  portfolio_item_image: { type: String, default: null },
  portfolio_item_video_url: { type: String, trim: true },
  portfolio_item_youtube_id: { type: String, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'group_single_service_portfolio_item' });

module.exports = mongoose.model('GroupSingleServicePortfolioItem', groupSingleServicePortfolioItemSchema);
