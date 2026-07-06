const mongoose = require('mongoose');

const creativeHouseFinalOutputSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  creativeHouseItemId: { type: mongoose.Schema.Types.Mixed, required: true },
  title: { type: String, trim: true },
  image: { type: String, default: null },
  thumbnail: { type: String, default: null },
  uploadVideoUrl: { type: String, trim: true, default: null },
  videoUrl: { type: String, trim: true },
  youtubeId: { type: String, trim: true },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'creative_house_final_ouptut' });

module.exports = mongoose.model('CreativeHouseFinalOutput', creativeHouseFinalOutputSchema);
