const mongoose = require('mongoose');

const ourAdvantageSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  advantage_title: { type: String, required: true, trim: true },
  advantage_description: { type: String, trim: true },
  advantage_icon: { type: String, default: null },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'our_advantage' });

module.exports = mongoose.model('OurAdvantage', ourAdvantageSchema);
