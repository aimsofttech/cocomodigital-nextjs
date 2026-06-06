const mongoose = require('mongoose');

const socialWorkItemSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  social_work_category_id: { type: mongoose.Schema.Types.Mixed, required: true },
  social_work_img: { type: String, default: null },
  social_work_title: { type: String, required: true, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'social_work_item' });

module.exports = mongoose.model('SocialWorkItem', socialWorkItemSchema);
