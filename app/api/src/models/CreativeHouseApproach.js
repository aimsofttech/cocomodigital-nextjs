const mongoose = require('mongoose');

const creativeHouseApproachSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  creative_house_item_id: { type: mongoose.Schema.Types.Mixed, required: true },
  approach_title: { type: String, required: true, trim: true },
  approach_description: { type: String, trim: true },
  approach_image: { type: String, default: null },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'creative_house_approach' });

module.exports = mongoose.model('CreativeHouseApproach', creativeHouseApproachSchema);
