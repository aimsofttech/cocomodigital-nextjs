const mongoose = require('mongoose');

const successStoriesProjectSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  project_title: { type: String, required: true, trim: true },
  project_image: { type: String, default: null },
  project_description: { type: String, trim: true },
  project_url: { type: String, trim: true },
  client_name: { type: String, trim: true },
  service_type: { type: String, trim: true },
  service_item_id: { type: mongoose.Schema.Types.Mixed, default: null },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'success_stories_project' });

module.exports = mongoose.model('SuccessStoriesProject', successStoriesProjectSchema);
