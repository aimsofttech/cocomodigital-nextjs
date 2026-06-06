const mongoose = require('mongoose');

const groupSingleServicePortfolioCategorySchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  group_service_item_id: { type: mongoose.Schema.Types.Mixed, required: true },
  group_service_category_id: { type: mongoose.Schema.Types.Mixed, default: null },
  portfolio_category_name: { type: String, required: true, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'group_single_service_portfolio_category' });

module.exports = mongoose.model('GroupSingleServicePortfolioCategory', groupSingleServicePortfolioCategorySchema);
