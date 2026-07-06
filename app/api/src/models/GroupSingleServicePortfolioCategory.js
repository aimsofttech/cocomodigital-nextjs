const mongoose = require('mongoose');

const groupSingleServicePortfolioCategorySchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  groupServiceItemId: { type: mongoose.Schema.Types.Mixed, required: true },
  groupServiceCategoryId: { type: mongoose.Schema.Types.Mixed, default: null },
  name: { type: String, required: true, trim: true },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'group_single_service_portfolio_category' });

module.exports = mongoose.model('GroupSingleServicePortfolioCategory', groupSingleServicePortfolioCategorySchema);
