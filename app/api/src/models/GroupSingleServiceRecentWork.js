const mongoose = require('mongoose');

const groupSingleServiceRecentWorkSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  groupServiceItemId: { type: mongoose.Schema.Types.Mixed, required: true },
  groupServiceCategoryId: { type: mongoose.Schema.Types.Mixed, default: null },
  title: { type: String, trim: true },
  image: { type: String, default: null },
  video: { type: String, trim: true, default: null },
  videoThumbnail: { type: String, default: null },
  videoUrl: { type: String, trim: true },
  youtubeId: { type: String, trim: true },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'group_single_service_recent_work' });

module.exports = mongoose.model('GroupSingleServiceRecentWork', groupSingleServiceRecentWorkSchema);
