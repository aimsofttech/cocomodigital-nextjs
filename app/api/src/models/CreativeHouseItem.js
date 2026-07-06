const mongoose = require('mongoose');

const creativeHouseItemSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  creativeHouseCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'CreativeHouseCategory', required: true },
  title: { type: String, required: true, trim: true },
  videoTitle: { type: String, trim: true },
  thumbnail: { type: String, default: null },
  uploadVideoUrl: { type: String, trim: true, default: null },
  videoUrl: { type: String, trim: true },
  youtubeId: { type: String, trim: true },
  description: { type: String, trim: true },
  description2: { type: String, trim: true },
  // Linked template records (Mixed: new entries store ObjectIds, legacy rows
  // hold the pre-migration integer FKs).
  authorTemplateId: { type: mongoose.Schema.Types.Mixed, default: null },
  bookCallTemplateId: { type: mongoose.Schema.Types.Mixed, default: null },
  // Brief & Requirement: client logo (gallery ref) + description.
  requirementTitle: { type: mongoose.Schema.Types.Mixed, default: null },
  requirementDescription: { type: String, trim: true },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'creative_house_item' });

module.exports = mongoose.model('CreativeHouseItem', creativeHouseItemSchema);
