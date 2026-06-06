const mongoose = require('mongoose');

const groupSuccessStoriesSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  success_stories_title: { type: String, required: true, trim: true },
  success_stories_img: { type: String, default: null },
  success_stories_description: { type: String, trim: true },
  success_stories_url: { type: String, trim: true },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'group_success_stories' });

module.exports = mongoose.model('GroupSuccessStories', groupSuccessStoriesSchema);
