const mongoose = require('mongoose');

const groupTopBannerSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  exploreOurServiceCategoryId: { type: mongoose.Schema.Types.Mixed, default: null },
  exploreOurServiceItemId: { type: mongoose.Schema.Types.Mixed, default: null },
  heading: { type: String, required: true, trim: true },
  subHeading: { type: String, trim: true },
  buttonText: { type: String, trim: true },
  buttonUrl: { type: String, trim: true },
  image: { type: String, default: null },
  video: { type: String, trim: true },
  videoType: { type: String, trim: true },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'group_top_banner' });

module.exports = mongoose.model('GroupTopBanner', groupTopBannerSchema);
