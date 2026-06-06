const mongoose = require('mongoose');

const groupSingleServiceRecentWorkSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  group_service_item_id: { type: mongoose.Schema.Types.Mixed, required: true },
  group_service_category_id: { type: mongoose.Schema.Types.Mixed, default: null },
  recent_work_title: { type: String, trim: true },
  recent_work_image: { type: String, default: null },
  recent_work_video_url: { type: String, trim: true },
  recent_work_youtube_id: { type: String, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'group_single_service_recent_work' });

module.exports = mongoose.model('GroupSingleServiceRecentWork', groupSingleServiceRecentWorkSchema);
