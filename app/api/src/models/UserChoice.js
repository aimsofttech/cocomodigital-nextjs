const mongoose = require('mongoose');

const userChoiceSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  user_choice_title: { type: String, required: true, trim: true },
  user_choice_description: { type: String, trim: true },
  user_choice_button_text: { type: String, trim: true },
  user_choice_button_url: { type: String, trim: true },
  user_choice_image: { type: String, default: null },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'user_choice' });

module.exports = mongoose.model('UserChoice', userChoiceSchema);
