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
const pickSlugSource = (body, slugSourceField) => {
  if (slugSourceField && body[slugSourceField] && String(body[slugSourceField]).trim()) {
    return body[slugSourceField];
  }
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
const ensureUniqueSlug = async (Model, base, excludeId) => {
  let slug = base;
  let counter = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = { slug };
    if (excludeId) query._id = { $ne: excludeId };
    // eslint-disable-next-line no-await-in-loop
    const exists = await Model.findOne(query).select('_id').lean();
    if (!exists) return slug;
    counter += 1;
    slug = `${base}-${counter}`;
  }
};

// Generate/normalise body.slug. If the body has no slug and no derivable source,
// the slug is left untouched (e.g. partial updates that don't include the name).
const applySlug = async (Model, body, slugSourceField, excludeId) => {
  const source = pickSlugSource(body, slugSourceField);
  if (!source) return;
  const base = generateSlug(source);
  if (!base) return;
  body.slug = await ensureUniqueSlug(Model, base, excludeId);
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
  } = options;

  // All fields that may hold S3 references (images + videos), de-duplicated.
  const mediaFields = [...new Set([...imageFields, ...videoFields])];

  return {
    index: async (req, res) => {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const search = req.query.search || '';
      const status = req.query.status;
      const parentId = req.query[parentField] || req.params[parentField];

      let filter = {};
      if (parentField && parentId) filter[parentField] = parentId;
      if (status !== undefined && status !== '') filter.status = parseInt(status);
      if (search && searchFields.length) {
        filter.$or = searchFields.map((f) => ({ [f]: { $regex: search, $options: 'i' } }));
      }

      const result = await paginateQuery(Model, filter, { page, limit, sort: defaultSort });
      const data = buildS3FieldsArray(result.data, mediaFields);

      res.json({ status: 'success', data, pagination: result.pagination });
    },

    show: async (req, res) => {
      const doc = await Model.findById(req.params.id);
      if (!doc) return res.status(404).json({ status: 'error', message: 'Not found' });
      res.json({ status: 'success', data: buildS3Fields(doc, mediaFields) });
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

      if (slug) await applySlug(Model, body, slugSource);

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

      if (slug) await applySlug(Model, body, slugSource, req.params.id);

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
