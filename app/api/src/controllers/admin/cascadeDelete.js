const mongoose = require('mongoose');
const { deleteManyFromS3 } = require('../../utils/s3Upload');

/* Shared cascade-delete helpers.
 *
 * FK fields on the section collections are Mixed: migrated rows hold ObjectIds
 * while admin-created rows persist plain strings — every lookup must match
 * BOTH representations (same pattern as the public controllers). */

const idVariants = (id) => {
  const s = String(id);
  return mongoose.Types.ObjectId.isValid(s) ? [s, new mongoose.Types.ObjectId(s)] : [s];
};

const mediaValues = (doc, fields = []) =>
  fields.flatMap((f) => {
    const v = doc[f];
    if (Array.isArray(v)) return v.filter(Boolean);
    return v ? [v] : [];
  });

/**
 * Delete every child record linked to `parentId`, per spec:
 *   [{ model, fk, media: ['image', ...] }, ...]
 * Each child's uploaded S3 media is removed first (best effort), then the
 * records are deleted. Returns the total number of deleted records.
 */
const cascadeDelete = async (parentId, specs) => {
  const ids = idVariants(parentId);
  let total = 0;
  for (const { model, fk, media = [] } of specs) {
    const children = await model.find({ [fk]: { $in: ids } });
    if (!children.length) continue;
    try {
      await deleteManyFromS3(children.flatMap((c) => mediaValues(c, media)));
    } catch (err) {
      // best effort — never block the delete on S3 cleanup
    }
    await model.deleteMany({ _id: { $in: children.map((c) => c._id) } });
    total += children.length;
  }
  return total;
};

module.exports = { cascadeDelete, idVariants, mediaValues };
