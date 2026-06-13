const mongoose = require('mongoose');

const creativeHouseItemSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  creative_house_category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CreativeHouseCategory', required: true },
  creative_house_title: { type: String, required: true, trim: true },
  creative_house_slug: { type: String, trim: true, unique: true },
  creative_house_video_title: { type: String, trim: true },
  creative_house_thumbnail: { type: String, default: null },
  creative_house_upload_video_url: { type: String, trim: true, default: null },
  creative_house_video_url: { type: String, trim: true },
  creative_house_youtube_id: { type: String, trim: true },
  creative_house_description: { type: String, trim: true },
  creative_house_description2: { type: String, trim: true },
  // Linked template records (Mixed: new entries store ObjectIds, legacy rows
  // hold the pre-migration integer FKs).
  author_template_id: { type: mongoose.Schema.Types.Mixed, default: null },
  book_call_template_id: { type: mongoose.Schema.Types.Mixed, default: null },
  // Brief & Requirement: client logo (gallery ref) + description.
  requirement_title: { type: mongoose.Schema.Types.Mixed, default: null },
  requirement_description: { type: String, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'creative_house_item' });

module.exports = mongoose.model('CreativeHouseItem', creativeHouseItemSchema);
