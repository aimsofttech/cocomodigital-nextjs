const mongoose = require('mongoose');

const marketingFormSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  company: { type: String, trim: true },
  message: { type: String, trim: true },
  service_type: { type: String, trim: true },
  marketing_house_item_id: { type: mongoose.Schema.Types.Mixed, default: null },
  is_read: { type: Number, enum: [0, 1], default: 0 },
}, { timestamps: true, strict: false, collection: 'marketing_form' });

module.exports = mongoose.model('MarketingForm', marketingFormSchema);
