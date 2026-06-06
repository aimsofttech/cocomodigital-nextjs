const mongoose = require('mongoose');

const marketingHouseCommunityProgramCategorySchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  marketing_house_item_id: { type: mongoose.Schema.Types.Mixed, required: true },
  category_name: { type: String, required: true, trim: true },
  category_image: { type: String, default: null },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'marketing_house_community_program' });

module.exports = mongoose.model('MarketingHouseCommunityProgramCategory', marketingHouseCommunityProgramCategorySchema);
