const mongoose = require('mongoose');

/* One captioned photograph in the studio strip.
 *
 * `wide` makes the frame span two grid columns — the grid re-flows on its own,
 * so a frame can be added, removed or re-widened without touching the CSS.
 * `alt` should describe only what is actually visible in the photograph.
 */
const podcastShotSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  podcastPageId: { type: mongoose.Schema.Types.Mixed, required: true },
  /** S3 URL or a path under the web app's /public folder. */
  image: { type: String, trim: true, default: '' },
  alt: { type: String, default: '' },
  caption: { type: String, trim: true, default: '' },
  /** Spans two columns in the grid. */
  wide: { type: Boolean, default: false },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 1 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'podcast_shots' });

module.exports = mongoose.model('PodcastShot', podcastShotSchema);
