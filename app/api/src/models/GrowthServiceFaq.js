const mongoose = require('mongoose');

/* A question / answer pair in a growth page's FAQ accordion. Kept separate
 * from the site-wide `faqs` collection so growth pages can be managed (and
 * cascade-deleted) on their own without touching shared FAQ data. The answers
 * also feed the page's FAQPage structured data.
 */
const growthServiceFaqSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  growthServiceId: { type: mongoose.Schema.Types.Mixed, required: true },
  question: { type: String, required: true, trim: true },
  answer: { type: String, required: true, trim: true },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 1 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'growth_service_faqs' });

module.exports = mongoose.model('GrowthServiceFaq', growthServiceFaqSchema);
