const mongoose = require('mongoose');

const bookCallSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  name: { type: String, required: true, trim: true },
  heading: { type: String, trim: true },
  image: { type: String, default: null },
  title1: { type: String, trim: true },
  description1: { type: String, trim: true },
  title2: { type: String, trim: true },
  description2: { type: String, trim: true },
  buttonText: { type: String, trim: true },
  buttonUrl: { type: String, trim: true },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'book_a_call' });

module.exports = mongoose.model('BookCall', bookCallSchema);
