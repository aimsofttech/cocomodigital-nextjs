const mongoose = require('mongoose');

const creativeHouseFinalOutputSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  creative_house_item_id: { type: mongoose.Schema.Types.Mixed, required: true },
  output_title: { type: String, trim: true },
  output_image: { type: String, default: null },
  output_video_url: { type: String, trim: true },
  output_youtube_id: { type: String, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'creative_house_final_ouptut' });

module.exports = mongoose.model('CreativeHouseFinalOutput', creativeHouseFinalOutputSchema);
