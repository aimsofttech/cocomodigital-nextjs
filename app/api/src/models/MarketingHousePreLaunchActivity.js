const mongoose = require('mongoose');

const marketingHousePreLaunchActivitySchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  marketing_house_item_id: { type: mongoose.Schema.Types.Mixed, required: true },
  activity_title: { type: String, required: true, trim: true },
  activity_description: { type: String, trim: true },
  activity_image: { type: String, default: null },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'marketing_house_pre_launch_activities' });

module.exports = mongoose.model('MarketingHousePreLaunchActivity', marketingHousePreLaunchActivitySchema);
