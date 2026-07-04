const mongoose = require('mongoose');

const topBannerSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  bookCallTemplateId: { type: mongoose.Schema.Types.Mixed, default: null },
  country: { type: String, default: 'en-us', trim: true },
  heading: { type: String, required: true, trim: true },
  subHeading: { type: String, trim: true },
  buttonText: { type: String, trim: true },
  buttonUrl: { type: String, trim: true },
  videoThumbnail: { type: String, default: null },
  videoUrl: { type: String, trim: true },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'top_banner' });

module.exports = mongoose.model('TopBanner', topBannerSchema);
