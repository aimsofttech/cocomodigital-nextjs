const mongoose = require('mongoose');

const marketingHousePerformanceSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  marketingHouseItemId: { type: mongoose.Schema.Types.Mixed, required: true },
  performance_title: { type: String, trim: true },
  performance_image: { type: String, default: null },
  performance_video_url: { type: String, trim: true },
  performance_youtube_id: { type: String, trim: true },
  performanceDescription: { type: String, trim: true },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'marketing_house_performance' });

module.exports = mongoose.model('MarketingHousePerformance', marketingHousePerformanceSchema);
