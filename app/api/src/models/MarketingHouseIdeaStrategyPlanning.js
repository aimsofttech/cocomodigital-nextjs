const mongoose = require('mongoose');

const marketingHouseIdeaStrategyPlanningSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  marketing_house_item_id: { type: mongoose.Schema.Types.Mixed, required: true },
  idea_title: { type: String, required: true, trim: true },
  idea_description: { type: String, trim: true },
  idea_image: { type: String, default: null },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'marketing_house_idea_strategy_planning' });

module.exports = mongoose.model('MarketingHouseIdeaStrategyPlanning', marketingHouseIdeaStrategyPlanningSchema);
