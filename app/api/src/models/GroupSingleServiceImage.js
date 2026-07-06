const mongoose = require('mongoose');

const groupSingleServiceImageSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  groupServiceItemId: { type: mongoose.Schema.Types.Mixed, required: true },
  groupServiceCategoryId: { type: mongoose.Schema.Types.Mixed, default: null },
  image: { type: String, default: null },
  description: { type: String, trim: true },
  uploadVideoUrl: { type: String, trim: true, default: null },
  videoUrl: { type: String, trim: true },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'group_single_service_image' });

module.exports = mongoose.model('GroupSingleServiceImage', groupSingleServiceImageSchema);
