const mongoose = require('mongoose');

const contactUsSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  subject: { type: String, trim: true },
  message: { type: String, required: true, trim: true },
  isRead: { type: Number, enum: [0, 1], default: 0 },
}, { timestamps: true, strict: false, collection: 'contact_us' });

module.exports = mongoose.model('ContactUs', contactUsSchema);
