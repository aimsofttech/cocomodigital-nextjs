const mongoose = require('mongoose');

const creativeHouseProjectSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  creativeHouseItemId: { type: mongoose.Schema.Types.Mixed, default: null },
  creativeHouseCategoryId: { type: mongoose.Schema.Types.Mixed, default: null },
  title: { type: String, required: true, trim: true },
  image: { type: String, default: null },
  videoUrl: { type: String, trim: true },
  description: { type: String, trim: true },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'creative_house_project' });

module.exports = mongoose.model('CreativeHouseProject', creativeHouseProjectSchema);
