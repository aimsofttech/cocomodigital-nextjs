const mongoose = require('mongoose');

const groupCreatorPlatformSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  creator_title: { type: String, required: true, trim: true },
  creator_thumbnail: { type: String, default: null },
  creator_thumbnail_url: { type: String, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'group_creator_platform_service' });

module.exports = mongoose.model('GroupCreatorPlatform', groupCreatorPlatformSchema);
