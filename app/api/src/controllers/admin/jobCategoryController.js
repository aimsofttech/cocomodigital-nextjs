const mongoose = require('mongoose');
const JobCategory = require('../../models/JobCategory');
const JobList = require('../../models/JobList');
const createCrudController = require('./crudFactory');
const { generateSlug } = require('../../utils/helpers');

const base = createCrudController(JobCategory, { searchFields: ['name', 'category_name'], defaultSort: { display_order: 1 } });

// The admin form/list use `name`/`slug`; the public web app populates the legacy
// `category_name`/`category_slug`. Keep both in sync on every write and derive a
// slug from the name when none was supplied.
const mirrorFields = (body) => {
  if (!body.slug && body.name) body.slug = generateSlug(body.name);
  if (body.name && !body.category_name) body.category_name = body.name;
  if (body.category_name && !body.name) body.name = body.category_name;
  if (body.slug && !body.category_slug) body.category_slug = body.slug;
};

const storeWithSlug = async (req, res) => {
  mirrorFields(req.body);
  return base.store(req, res);
};

const updateWithSlug = async (req, res) => {
  mirrorFields(req.body);
  return base.update(req, res);
};

// Legacy/migrated rows may only carry `category_name`/`category_slug`. Backfill
// the admin-facing `name`/`slug` on read so the list/edit form show them.
const backfill = (d) => {
  if (!d) return d;
  if (!d.name && d.category_name) d.name = d.category_name;
  if (!d.slug && d.category_slug) d.slug = d.category_slug;
  return d;
};

const withBackfill = (handler) => async (req, res) => {
  const sendJson = res.json.bind(res);
  res.json = (payload) => {
    if (payload && Array.isArray(payload.data)) payload.data = payload.data.map(backfill);
    else if (payload && payload.data) payload.data = backfill(payload.data);
    return sendJson(payload);
  };
  return handler(req, res);
};

// Attach the count of job listings linked to each category (so the admin list
// can show a "Job List" column that drills into the listings page). One grouped
// aggregation per page; link ids may be strings or ObjectIds, so group by the
// string form and look up by string.
const attachJobCounts = async (cats) => {
  if (!cats.length) return cats;
  const idVariants = [];
  cats.forEach((c) => {
    const str = String(c._id);
    idVariants.push(str);
    if (mongoose.Types.ObjectId.isValid(str)) idVariants.push(new mongoose.Types.ObjectId(str));
  });
  let countMap = new Map();
  try {
    const rows = await JobList.aggregate([
      { $match: { job_category_id: { $in: idVariants } } },
      { $group: { _id: '$job_category_id', count: { $sum: 1 } } },
    ]);
    rows.forEach((r) => countMap.set(String(r._id), r.count));
  } catch (err) {
    countMap = new Map();
  }
  return cats.map((c) => ({ ...c, job_list_count: countMap.get(String(c._id)) || 0 }));
};

// List wrapper: backfill legacy name/slug, then attach each category's job count.
const indexWithExtras = async (req, res) => {
  const sendJson = res.json.bind(res);
  res.json = (payload) => {
    if (payload && payload.status === 'success' && Array.isArray(payload.data) && payload.data.length) {
      const backfilled = payload.data.map(backfill);
      attachJobCounts(backfilled)
        .then((data) => sendJson({ ...payload, data }))
        .catch(() => sendJson({ ...payload, data: backfilled }));
      return res;
    }
    return sendJson(payload);
  };
  return base.index(req, res);
};

module.exports = {
  ...base,
  index: indexWithExtras,
  show: withBackfill(base.show),
  store: storeWithSlug,
  update: updateWithSlug,
};
