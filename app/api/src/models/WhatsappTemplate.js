const mongoose = require('mongoose');

const whatsappTemplateSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  template_name: { type: String, required: true, trim: true },
  template_body: { type: String, required: true, trim: true },
  template_type: { type: String, trim: true },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'whatsapptemplates' });

module.exports = mongoose.model('WhatsappTemplate', whatsappTemplateSchema);
