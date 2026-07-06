const mongoose = require('mongoose');

const marketingHouseOtherActivityItemSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  marketingHouseItemId: { type: mongoose.Schema.Types.Mixed, required: true },
  otherActivityCategoryId: { type: mongoose.Schema.Types.Mixed, default: null },
  title: { type: String, required: true, trim: true },
  image: { type: String, default: null },
  video_url: { type: String, trim: true },
  youtube_id: { type: String, trim: true },
  description: { type: String, trim: true },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'marketing_house_other_activity_item' });

module.exports = mongoose.model('MarketingHouseOtherActivityItem', marketingHouseOtherActivityItemSchema);
