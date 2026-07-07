const mongoose = require('mongoose');

const authorTemplateSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  name: { type: String, required: true, trim: true },
  image: { type: String, default: null },
  designation: { type: String, trim: true },
  bio: { type: String, trim: true },
  // Legacy Payload-era content fields (renamed to camelCase by
  // scripts/rename-template-keys.js; kept readable via strict:false).
  templateName: { type: String, trim: true },
  description: { type: String, trim: true },
  url: { type: String, trim: true },
  clickHereText: { type: String, trim: true },
  clickHereUrl: { type: String, trim: true },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'author_template' });

module.exports = mongoose.model('AuthorTemplate', authorTemplateSchema);
