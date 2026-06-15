const mongoose = require('mongoose');
const { buildS3Url, deleteManyFromS3 } = require('../../utils/s3Upload');
const { paginateQuery, generateSlug } = require('../../utils/helpers');

// Normalise a media field value (string | array | null) into an array of values.
const toMediaArray = (val) => {
  if (Array.isArray(val)) return val.filter(Boolean);
  if (val === undefined || val === null || val === '') return [];
  return [val];
};

// Given the previous and next value of a media field, delete from S3 any file
// that is present in `oldVal` but no longer referenced in `newVal`.
const reconcileMedia = async (oldVal, newVal) => {
  const oldArr = toMediaArray(oldVal);
  if (!oldArr.length) return;
  const nextSet = new Set(toMediaArray(newVal).map(String));
  const removed = oldArr.filter((v) => !nextSet.has(String(v)));
  if (removed.length) await deleteManyFromS3(removed);
};

// Fields we will derive a slug from (in priority order) when no slug is supplied.
const SLUG_SOURCE_KEYS = ['slug', 'name', 'title', 'heading', 'question'];

// Pick the best value to build a slug from out of the request body.
const pickSlugSource = (body, slugSourceField, slugField = 'slug') => {
  if (slugSourceField && body[slugSourceField] && String(body[slugSourceField]).trim()) {
    return body[slugSourceField];
  }
  // A manually-supplied slug (under whatever field name this entity uses) wins.
  if (body[slugField] && String(body[slugField]).trim()) return body[slugField];
  for (const key of SLUG_SOURCE_KEYS) {
    if (body[key] && String(body[key]).trim()) return body[key];
  }
  // Fall back to any *_name / *_title / *_heading field present on the body.
  const key = Object.keys(body).find(
    (k) => /(_name|_title|_heading)$/.test(k) && body[k] && String(body[k]).trim()
  );
  return key ? body[key] : null;
};

// Return a slug that is unique within the collection, suffixing -2, -3, ... on collision.
const ensureUniqueSlug = async (Model, base, excludeId, slugField = 'slug') => {
  let slug = base;
  let counter = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = { [slugField]: slug };
    if (excludeId) query._id = { $ne: excludeId };
    // eslint-disable-next-line no-await-in-loop
    const exists = await Model.findOne(query).select('_id').lean();
    if (!exists) return slug;
    counter += 1;
    slug = `${base}-${counter}`;
  }
};

// Generate/normalise the slug field. If the body has no slug and no derivable
// source, the slug is left untouched (e.g. partial updates without the name).
const applySlug = async (Model, body, slugSourceField, excludeId, slugField = 'slug') => {
  const source = pickSlugSource(body, slugSourceField, slugField);
  if (!source) return;
  const base = generateSlug(source);
  if (!base) return;
  body[slugField] = await ensureUniqueSlug(Model, base, excludeId, slugField);
};

const applyUrl = (val) =>
  Array.isArray(val) ? val.map((v) => buildS3Url(v)) : buildS3Url(val);

const buildS3Fields = (doc, mediaFields) => {
  if (!mediaFields || !mediaFields.length) return doc;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  mediaFields.forEach((field) => {
    if (obj[field]) obj[field] = applyUrl(obj[field]);
  });
  return obj;
};

const buildS3FieldsArray = (docs, mediaFields) =>
  docs.map((d) => buildS3Fields(d, mediaFields));

// Internal fields that must never be exposed in API responses. `_legacy_fks`
// holds the pre-migration numeric foreign keys (kept in the DB for reversibility).
const INTERNAL_FIELDS = ['_legacy_fks'];
const stripInternal = (d) => {
  if (!d) return d;
  const o = d.toObject ? d.toObject() : d;       // ensure a plain, mutable object
  INTERNAL_FIELDS.forEach((f) => { if (f in o) delete o[f]; });
  return o;
};

// Pick the first non-empty value among a list of candidate field names.
const pickName = (rec, nameFields) => {
  for (const f of nameFields) {
    const v = rec[f];
    if (v !== null && v !== undefined && v !== '') return v;
  }
  return null;
};

// Resolve related records and attach their display name onto each document.
// `lookups` is an array of:
//   { localField, model, foreignField = '_id', nameField, as, extract }
// `nameField` may be a single field name or an array of candidate field names
// (the first non-empty one is used — handy when records are stored with
// inconsistent field names, e.g. `title` vs `marketing_house_title`).
// `extract` (optional) is a map of { relatedField: targetField } that copies
// additional fields from the joined record onto each document. Because lookups
// run sequentially over the same objects, a later lookup can use a field
// surfaced by `extract` as its `localField` — enabling chained joins
// (e.g. image → item → category).
// For every lookup we batch-load the referenced records in a single query
// (no N+1), then map each document's foreign key to the related name under `as`.
// Documents whose key is empty or unmatched get `as` = null.
const applyLookups = async (docs, lookups) => {
  const objs = docs.map((d) => (d && d.toObject ? d.toObject() : { ...d }));
  if (!lookups.length || !objs.length) return objs;

  for (const { localField, model, foreignField = '_id', nameField, as, extract = null } of lookups) {
    const nameFields = Array.isArray(nameField) ? nameField : [nameField];
    const extractEntries = extract ? Object.entries(extract) : [];
    const selectFields = [foreignField, ...nameFields, ...extractEntries.map(([src]) => src)];

    const ids = [
      ...new Set(
        objs
          .map((o) => o[localField])
          .filter((v) => v !== null && v !== undefined && v !== '')
          .map(String)
      ),
    ];

    const recByKey = new Map();
    if (ids.length) {
      // When matching on _id, drop anything that isn't a castable ObjectId so a
      // single bad value can't throw and break the whole listing.
      const queryIds =
        foreignField === '_id'
          ? ids.filter((id) => mongoose.Types.ObjectId.isValid(id))
          : ids;
      if (queryIds.length) {
        const related = await model
          .find({ [foreignField]: { $in: queryIds } })
          .select(selectFields.join(' '))
          .lean();
        related.forEach((r) => recByKey.set(String(r[foreignField]), r));
      }
    }

    objs.forEach((o) => {
      const key = o[localField] != null && o[localField] !== '' ? String(o[localField]) : null;
      const rec = key ? recByKey.get(key) : null;
      o[as] = rec ? pickName(rec, nameFields) : null;
      // Only fill an extracted field when the related record supplies a value, so
      // a value already present on the document (e.g. a directly-stored id) is
      // preserved as a fallback rather than clobbered with null.
      extractEntries.forEach(([src, target]) => {
        if (rec && rec[src] != null && rec[src] !== '') o[target] = rec[src];
      });
    });
  }

  return objs;
};

const createCrudController = (Model, options = {}) => {
  const {
    imageFields = [],
    videoFields = [],
    searchFields = [],
    defaultSort = { display_order: 1, createdAt: -1 },
    parentField = null,
    // Slug handling. Enabled by default; set `slug: false` to opt out for
    // entities where a slug is meaningless. `slugSource` forces which field the
    // slug is derived from (otherwise auto-detected from name/title fields).
    slug = true,
    slugSource = null,
    // Field the generated slug is written to (defaults to `slug`). Override for
    // entities whose slug column has a different name (e.g. legacy schemas).
    slugField = 'slug',
    // Optional related-record name resolution applied to index/show responses.
    // See `applyLookups` for the shape of each entry.
    lookups = [],
    // Optional always-on filter merged into every index query. Use to scope a
    // shared collection to a subset (e.g. only FAQs linked to a marketing item).
    baseFilter = {},
  } = options;

  // All fields that may hold S3 references (images + videos), de-duplicated.
  const mediaFields = [...new Set([...imageFields, ...videoFields])];

  return {
    index: async (req, res) => {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const search = req.query.search || '';
      const status = req.query.status;

      let filter = { ...baseFilter };
      // `parentField` may be a single field name or a list of them. For each that
      // appears in the query/params, scope the listing by it. FK fields may hold a
      // real ObjectId (post-migration) or a string id (legacy / admin-written), so
      // match either representation.
      const parentFields = Array.isArray(parentField) ? parentField : (parentField ? [parentField] : []);
      for (const pf of parentFields) {
        const parentId = req.query[pf] || req.params[pf];
        if (parentId === undefined || parentId === null || parentId === '') continue;
        const pid = String(parentId);
        filter[pf] = mongoose.Types.ObjectId.isValid(pid)
          ? { $in: [pid, new mongoose.Types.ObjectId(pid)] }
          : pid;
      }
      if (status !== undefined && status !== '') filter.status = parseInt(status);
      if (search && searchFields.length) {
        filter.$or = searchFields.map((f) => ({ [f]: { $regex: search, $options: 'i' } }));
      }

      const result = await paginateQuery(Model, filter, { page, limit, sort: defaultSort });
      let data = buildS3FieldsArray(result.data, mediaFields);
      if (lookups.length) data = await applyLookups(data, lookups);
      data = data.map(stripInternal);

      res.json({ status: 'success', data, pagination: result.pagination });
    },

    show: async (req, res) => {
      const doc = await Model.findById(req.params.id);
      if (!doc) return res.status(404).json({ status: 'error', message: 'Not found' });
      let data = buildS3Fields(doc, mediaFields);
      if (lookups.length) data = (await applyLookups([data], lookups))[0];
      data = stripInternal(data);
      res.json({ status: 'success', data });
    },

    store: async (req, res) => {
      const body = { ...req.body };
      // Media now arrives as S3 URLs in the JSON body. Legacy multipart uploads
      // (req.file/req.files) are still folded in for backward compatibility.
      if (req.file) body[req.file.fieldname] = req.file.location || req.file.key || req.file.path;
      if (req.files) {
        Object.entries(req.files).forEach(([field, files]) => {
          if (files[0]) body[field] = files[0].location || files[0].key || files[0].path;
        });
      }
      body.user_id = req.user._id;

      if (slug) await applySlug(Model, body, slugSource, null, slugField);

      const doc = await Model.create(body);
      res.status(201).json({ status: 'success', message: 'Created successfully', data: doc });
    },

    update: async (req, res) => {
      const doc = await Model.findById(req.params.id);
      if (!doc) return res.status(404).json({ status: 'error', message: 'Not found' });

      const body = { ...req.body };
      // Fold any legacy multipart uploads into the body as S3 references.
      if (req.file) body[req.file.fieldname] = req.file.location || req.file.key || req.file.path;
      if (req.files) {
        Object.entries(req.files).forEach(([field, files]) => {
          if (files[0]) body[field] = files[0].location || files[0].key || files[0].path;
        });
      }

      // Delete from S3 any previously-stored media that this update replaces or removes.
      for (const field of mediaFields) {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
          await reconcileMedia(doc[field], body[field]);
        }
      }

      if (slug) await applySlug(Model, body, slugSource, req.params.id, slugField);

      const updated = await Model.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
      res.json({ status: 'success', message: 'Updated successfully', data: buildS3Fields(updated, mediaFields) });
    },

    destroy: async (req, res) => {
      const doc = await Model.findById(req.params.id);
      if (!doc) return res.status(404).json({ status: 'error', message: 'Not found' });

      // Remove all associated media from S3 before deleting the record.
      const mediaValues = mediaFields.flatMap((field) => toMediaArray(doc[field]));
      await deleteManyFromS3(mediaValues);

      await doc.deleteOne();
      res.json({ status: 'success', message: 'Deleted successfully' });
    },
  };
};

module.exports = createCrudController;
