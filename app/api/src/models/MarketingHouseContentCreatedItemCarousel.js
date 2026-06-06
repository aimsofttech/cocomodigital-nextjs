const mongoose = require('mongoose');

const marketingHouseContentCreatedItemCarouselSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  marketing_house_item_id: { type: mongoose.Schema.Types.Mixed, required: true },
  content_created_item_id: { type: mongoose.Schema.Types.Mixed, default: null },
  carousel_image: { type: String, default: null },
  carousel_title: { type: String, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'marketing_house_content_created_item_carousels' });

module.exports = mongoose.model('MarketingHouseContentCreatedItemCarousel', marketingHouseContentCreatedItemCarouselSchema);
