const mongoose = require('mongoose');

const creativeHouseProjectSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  creative_house_item_id: { type: mongoose.Schema.Types.Mixed, default: null },
  creative_house_category_id: { type: mongoose.Schema.Types.Mixed, default: null },
  project_title: { type: String, required: true, trim: true },
  project_image: { type: String, default: null },
  project_video_url: { type: String, trim: true },
  project_description: { type: String, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'creative_house_project' });

module.exports = mongoose.model('CreativeHouseProject', creativeHouseProjectSchema);
