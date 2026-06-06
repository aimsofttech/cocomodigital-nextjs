const mongoose = require('mongoose');

const homePageSectionItemSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  home_page_section_id: { type: mongoose.Schema.Types.Mixed, required: true },
  item_title: { type: String, trim: true },
  item_description: { type: String, trim: true },
  item_image: { type: String, default: null },
  item_url: { type: String, trim: true },
  item_button_text: { type: String, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 1 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'home_page_section_items' });

module.exports = mongoose.model('HomePageSectionItem', homePageSectionItemSchema);
