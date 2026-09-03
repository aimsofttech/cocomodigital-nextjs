const mongoose = require('mongoose');

/**
 * MediaJob — the project a media asset came from.
 *
 * This exists because three of the things people want to filter by
 * cannot be seen in a photograph. A frame of an editor at a timeline
 * says nothing about whether the show is a crime drama, whether the
 * client was a streaming platform, or which vertical the work was for.
 * That knowledge lives in the job, and the asset inherits it.
 *
 * Without this collection those three filters can never be populated by
 * anyone — not a vision model, not a reviewer looking at the image — and
 * a filter that is permanently empty is worse than no filter, because a
 * result set that is missing everything still looks complete.
 *
 * One field on the asset (`job`) therefore replaces what would otherwise
 * be three separate tag vocabularies that nobody could fill in.
 *
 * A job is cheap: a name, a client, and three classifications set once
 * when a folder is uploaded. Everything shot for that job inherits them.
 */
const mediaJobSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, trim: true, index: true },

  // The named client — "MX Player", "T-Series". Distinct from clientType
  // on purpose: a credentials deck needs the name, a capability page needs
  // the category, and collapsing them loses one of those queries.
  client: { type: String, trim: true, default: '', index: true },

  clientType: {
    type: String,
    enum: ['platform', 'label', 'production-house', 'creator', 'brand', 'agency', 'in-house', 'unknown'],
    default: 'unknown',
    index: true,
  },

  industry: {
    type: String,
    enum: ['ott', 'film', 'music', 'podcasting', 'sports', 'gaming', 'education', 'brand', 'in-house', 'unknown'],
    default: 'unknown',
    index: true,
  },

  // Only meaningful for content work. A job photographing our own office
  // has no genre, and 'none' says that rather than leaving it ambiguous.
  genre: {
    type: String,
    enum: ['crime', 'drama', 'action', 'comedy', 'romance', 'reality', 'documentary',
           'music', 'sport', 'kids', 'devotional', 'none', 'unknown'],
    default: 'unknown',
    index: true,
  },

  // Whether anything from this job may be shown publicly at all. An NDA
  // job's assets stay searchable internally and are excluded from every
  // public-facing query — which is the filter that keeps unreleased title
  // artwork off a Cocoma page.
  nda: { type: Boolean, default: false, index: true },

  notes: { type: String, trim: true, default: '' },
  status: { type: Number, enum: [0, 1], default: 1 },
}, { timestamps: true, collection: 'media_jobs' });

module.exports = mongoose.model('MediaJob', mediaJobSchema);
