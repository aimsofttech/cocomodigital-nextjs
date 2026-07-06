const mongoose = require('mongoose');

const groupSingleServicePortfolioItemSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  portfolioCategoryId: { type: mongoose.Schema.Types.Mixed, required: true },
  groupServiceItemId: { type: mongoose.Schema.Types.Mixed, default: null },
  groupServiceCategoryId: { type: mongoose.Schema.Types.Mixed, default: null },
  title: { type: String, trim: true },
  image: { type: String, default: null },
  videoThumbnail: { type: String, default: null },
  videoUrl: { type: String, trim: true },
  youtubeId: { type: String, trim: true },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'group_single_service_portfolio_item' });

module.exports = mongoose.model('GroupSingleServicePortfolioItem', groupSingleServicePortfolioItemSchema);
