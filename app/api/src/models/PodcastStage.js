const mongoose = require('mongoose');

/* One stage of the Signal-to-Scale method band. Richer than a card: it carries
 * a promise line, a detail paragraph, a capability list and the key of the
 * inline SVG diagram drawn beside it.
 *
 * `diagramKey` names a diagram in the web app's registry
 * (app/web/src/views/Services/PodcastGrowth/PodcastVisuals.tsx). A key the
 * registry does not know renders no diagram, which is why it is a closed list
 * in the admin rather than free text.
 */
const podcastStageSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  podcastPageId: { type: mongoose.Schema.Types.Mixed, required: true },
  diagramKey: {
    type: String,
    enum: ['align', 'engineer', 'amplify', 'optimize', 'none'],
    default: 'none',
  },
  /** Printed ordinal behind the diagram, e.g. "01". */
  step: { type: String, trim: true, default: '' },
  name: { type: String, required: true, trim: true },
  promise: { type: String, default: '' },
  detail: { type: String, default: '' },
  /** One capability per row, rendered as the ticked list. */
  capabilities: { type: String, default: '' },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 1 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'podcast_stages' });

module.exports = mongoose.model('PodcastStage', podcastStageSchema);
