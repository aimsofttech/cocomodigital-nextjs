const mongoose = require('mongoose');

const marketingHouseProjectSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  marketing_house_item_id: { type: mongoose.Schema.Types.Mixed, default: null },
  project_title: { type: String, required: true, trim: true },
  project_image: { type: String, default: null },
  project_video_url: { type: String, trim: true },
  project_description: { type: String, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'marketing_house_project' });

module.exports = mongoose.model('MarketingHouseProject', marketingHouseProjectSchema);
