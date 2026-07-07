const mongoose = require('mongoose');

const ourAdvantageSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  templateName: { type: String, trim: true },
  title: { type: String, trim: true },
  description: { type: String, trim: true },
  image: { type: String, default: null },
  videoUrl: { type: String, trim: true },
  actionHeading: { type: String, trim: true },
  actionDescription: { type: String, trim: true },
  platformTitle: { type: String, trim: true },
  platformDescription: { type: String, trim: true },
  expHeading: { type: String, trim: true },
  expDescription: { type: String, trim: true },
  // Numbered stat/experience keys (actionNumber1..7, actionTitle1..7,
  // expNumber1..7, expTitle1..7, expImg1..7, expVideo1..7) ride on
  // strict:false — renamed to camelCase by scripts/rename-template-keys.js.
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'our_advantage' });

module.exports = mongoose.model('OurAdvantage', ourAdvantageSchema);
