const mongoose = require('mongoose');

const marketingHouseCommunityProgramCategoryItemSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  marketing_house_item_id: { type: mongoose.Schema.Types.Mixed, required: true },
  community_program_category_id: { type: mongoose.Schema.Types.Mixed, default: null },
  item_title: { type: String, trim: true },
  item_image: { type: String, default: null },
  item_video_url: { type: String, trim: true },
  item_youtube_id: { type: String, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'marketing_house_community_program_item' });

module.exports = mongoose.model('MarketingHouseCommunityProgramCategoryItem', marketingHouseCommunityProgramCategoryItemSchema);
