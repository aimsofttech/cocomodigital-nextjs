const mongoose = require('mongoose');

/* A prose block inside a growth landing page's supporting-content band —
 * the long-form copy search engines read after the icon cards and panels.
 *
 * Each row is one heading plus its paragraphs. `level` is the heading level it
 * renders at, which is what lets a single band carry a real H3 → H4 → H5 → H6
 * outline instead of a flat list of same-level headings. Rows render in
 * displayOrder, so the outline is authored by ordering rows and setting the
 * level on each, exactly the way the copy would be written in a document.
 *
 * Belongs to a section through `sectionKey`, the same join the feature and
 * showcase collections use; the section's renderer must be "article".
 */
const growthServiceContentSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  growthServiceId: { type: mongoose.Schema.Types.Mixed, required: true },
  /** Which section band this block belongs to. */
  sectionKey: { type: String, required: true, trim: true },
  /* The section heading itself is the H2, so a block nests at 3 or deeper.
   * Skipping a level (an H3 followed by an H5) breaks the document outline,
   * which is why the admin form offers the levels as a stepped list. */
  level: { type: Number, enum: [3, 4, 5, 6], default: 3 },
  heading: { type: String, trim: true, default: '' },
  /** One paragraph per row, like the parent record's multi-line fields. */
  body: { type: String, default: '' },
  /** Optional bullet list under the paragraphs — one item per row. */
  bullets: { type: String, default: '' },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 1 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'growth_service_contents' });

module.exports = mongoose.model('GrowthServiceContent', growthServiceContentSchema);
