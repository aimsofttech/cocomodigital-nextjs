const mongoose = require('mongoose');
const JobCategory = require('../../models/JobCategory');
const JobList = require('../../models/JobList');
const createCrudController = require('./crudFactory');
const { generateSlug } = require('../../utils/helpers');

const base = createCrudController(JobCategory, { searchFields: ['name'], defaultSort: { displayOrder: 1 } });

// Derive a slug from the name when none was supplied. (The legacy
// category_name/category_slug mirror pair was folded into name/slug by
// scripts/rename-job-keys.js, so no mirroring is needed anymore.)
const deriveSlug = (body) => {
  if (!body.slug && body.name) body.slug = generateSlug(body.name);
};

const storeWithSlug = async (req, res) => {
  deriveSlug(req.body);
  return base.store(req, res);
};

const updateWithSlug = async (req, res) => {
  deriveSlug(req.body);
  return base.update(req, res);
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
      { $match: { jobCategoryId: { $in: idVariants } } },
      { $group: { _id: '$jobCategoryId', count: { $sum: 1 } } },
    ]);
    rows.forEach((r) => countMap.set(String(r._id), r.count));
  } catch (err) {
    countMap = new Map();
  }
  return cats.map((c) => ({ ...c, job_list_count: countMap.get(String(c._id)) || 0 }));
};

// List wrapper: attach each category's job count.
const indexWithExtras = async (req, res) => {
  const sendJson = res.json.bind(res);
  res.json = (payload) => {
    if (payload && payload.status === 'success' && Array.isArray(payload.data) && payload.data.length) {
      attachJobCounts(payload.data)
        .then((data) => sendJson({ ...payload, data }))
        .catch(() => sendJson(payload));
      return res;
    }
    return sendJson(payload);
  };
  return base.index(req, res);
};

module.exports = {
  ...base,
  index: indexWithExtras,
  store: storeWithSlug,
  update: updateWithSlug,
};
