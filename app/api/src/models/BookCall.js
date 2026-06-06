const mongoose = require('mongoose');

const bookCallSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  book_call_title: { type: String, required: true, trim: true },
  book_call_subtitle: { type: String, trim: true },
  book_call_button_text: { type: String, trim: true },
  book_call_button_url: { type: String, trim: true },
  book_call_image: { type: String, default: null },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'book_a_call' });

module.exports = mongoose.model('BookCall', bookCallSchema);
