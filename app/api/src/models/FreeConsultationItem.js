const mongoose = require('mongoose');

const freeConsultationItemSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  consultation_category_id: { type: mongoose.Schema.Types.Mixed, default: null },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  company: { type: String, trim: true },
  message: { type: String, trim: true },
  budget: { type: String, trim: true },
  is_read: { type: Number, enum: [0, 1], default: 0 },
}, { timestamps: true, strict: false, collection: 'free_consultation_item' });

module.exports = mongoose.model('FreeConsultationItem', freeConsultationItemSchema);
