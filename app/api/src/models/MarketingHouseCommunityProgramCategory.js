const mongoose = require('mongoose');

const marketingHouseCommunityProgramCategorySchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  marketingHouseItemId: { type: mongoose.Schema.Types.Mixed, required: true },
  name: { type: String, required: true, trim: true },
  image: { type: String, default: null },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'marketing_house_community_program' });

module.exports = mongoose.model('MarketingHouseCommunityProgramCategory', marketingHouseCommunityProgramCategorySchema);
