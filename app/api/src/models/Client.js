const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  author_template_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AuthorTemplate', default: null },
  book_call_template_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BookCall', default: null },
  client_img: { type: String, default: null },
  client_title: { type: String, required: true, trim: true },
  client_slug: { type: String, trim: true, unique: true },
  client_description: { type: String, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'client' });

module.exports = mongoose.model('Client', clientSchema);
