const mongoose = require('mongoose');

const groupServiceCategorySchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  exploreOurServiceCategoryId: { type: mongoose.Schema.Types.Mixed, default: null },
  exploreOurServiceItemId: { type: mongoose.Schema.Types.Mixed, default: null },
  name: { type: String, required: true, trim: true },
  displayDirection: { type: String, trim: true },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'group_services_category' });

module.exports = mongoose.model('GroupServiceCategory', groupServiceCategorySchema);
