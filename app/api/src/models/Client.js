const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  authorTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'AuthorTemplate', default: null },
  bookCallTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'BookCall', default: null },
  image: { type: String, default: null },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  displayOrder: { type: Number, default: 0 },
  serviceDisplayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'client' });

module.exports = mongoose.model('Client', clientSchema);
