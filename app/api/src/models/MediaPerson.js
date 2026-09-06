const mongoose = require('mongoose');
const { generateSlug } = require('../utils/helpers');

/**
 * MediaPerson — the directory of humans who appear in the library.
 *
 * This is a collection and not a free-text field on the asset because
 * Cocoma has roughly sixty staff and they recur across thousands of
 * frames. Typed as text, "Dishan Puzari", "Dishan Puzari " and
 * "dishan puzari" become three different people, and at that point the
 * only question anyone actually asks — "every photograph with Dishan in
 * it" — returns a third of the answer while still looking complete.
 * That is the same failure the 631-value free-text tag vault already
 * has; there is no reason to build it a second time.
 *
 * A row is cheap: a name and whether they are ours. Everything else is
 * optional and gets filled in when somebody needs it.
 */
const mediaPersonSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },

  // Normalised form of the name, and the dedupe key. Unique, so a second
  // "Dishan Puzari" is refused at the door rather than discovered six
  // months later when half his photographs are filed under the twin.
  // Indexed below rather than here — declaring it both ways builds the
  // index twice and Mongoose warns about it at boot.
  slug: { type: String, trim: true },

  // Which consent story applies to this person. Staff appear under an
  // employment contract; a client's on-camera talent, a podcast guest or
  // somebody who walked through the frame does not, and `release` below
  // is the only record of whether they ever agreed.
  kind: {
    type: String,
    enum: ['internal', 'external'],
    default: 'internal',
    index: true,
  },

  // Staff detail. `email` is here so a reviewer can actually reach the
  // person to get a release signed — that is the step this stalls on,
  // not the tagging.
  role: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, lowercase: true, default: '' },

  // Three different questions live in three different fields and they are
  // routinely confused:
  //
  //   MediaAsset.rights    who owns the FILE
  //   MediaAsset.consent   may THIS frame be published
  //   MediaPerson.release  has THIS human agreed to appear, at all
  //
  // We own the copyright in a photograph of a stranger, which is exactly
  // why `rights: own` cannot answer for them. `refused` is the value that
  // has to be visible the moment somebody types the name — see the tag
  // controller, which drops `usable` when a refused person is named.
  release: {
    type: String,
    enum: ['staff-contract', 'signed', 'verbal', 'refused', 'unknown'],
    default: 'unknown',
    index: true,
  },

  notes: { type: String, trim: true, default: '' },

  // 0 means "no longer on the picker" — someone who left. Their historic
  // tags stay valid and stay searchable; deactivating is about not
  // offering a leaver as an option on next week's shoot, not about
  // pretending they were never in the room.
  status: { type: Number, enum: [0, 1], default: 1 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, collection: 'media_people' });

/**
 * Safety net for anything that creates a person outside the controller —
 * a seed script, a migration. `findByIdAndUpdate` skips this, so the
 * controller sets the slug itself on rename; this only covers creates.
 */
mediaPersonSchema.pre('validate', function setSlug(next) {
  if (!this.slug && this.name) this.slug = generateSlug(this.name);
  next();
});

// The dedupe guarantee. Partial, because a document with no slug at all
// is a bug to fix rather than a collision to reject, and a plain unique
// index would let exactly one of them exist.
mediaPersonSchema.index(
  { slug: 1 },
  { unique: true, partialFilterExpression: { slug: { $type: 'string' } } },
);

// What the tag picker actually queries: our people, still here, by name.
mediaPersonSchema.index({ status: 1, kind: 1, name: 1 });

module.exports = mongoose.model('MediaPerson', mediaPersonSchema);
