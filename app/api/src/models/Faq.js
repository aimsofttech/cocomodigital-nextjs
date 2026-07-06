const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  marketingHouseItemId: { type: mongoose.Schema.Types.Mixed, default: null },
  slug: { type: String, trim: true },
  question: { type: String, required: true, trim: true },
  answer: { type: String, required: true, trim: true },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'faqs' });

module.exports = mongoose.model('Faq', faqSchema);
