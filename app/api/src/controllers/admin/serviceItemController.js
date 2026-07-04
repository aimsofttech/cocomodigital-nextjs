const mongoose = require('mongoose');
const ServiceItem = require('../../models/ServiceItem');
const ServiceCategory = require('../../models/ServiceCategory');
const GroupTopBanner = require('../../models/GroupTopBanner');
const createCrudController = require('./crudFactory');
const { generateSlug } = require('../../utils/helpers');

const base = createCrudController(ServiceItem, {
  imageFields: ['service_image'],
  searchFields: ['service_title', 'service_slug'],
  defaultSort: { display_order: 1 },
  parentField: 'service_category_id',
});

// A service_category_id may be either a Mongo ObjectId (records created in the
// admin) or a legacy MySQL integer id (migrated records). Detect which.
const isObjectIdRef = (v) =>
  v instanceof mongoose.Types.ObjectId || (typeof v === 'string' && /^[a-fA-F0-9]{24}$/.test(v));

// Attach the parent Department name (from explore_our_service_category) to each
// row, keyed by service_category_id, resolving both ObjectId and legacy int refs.
const withDepartment = async (rows) => {
  const objectIdRefs = [];
  const legacyIdRefs = [];
  rows.forEach((r) => {
    const v = r.service_category_id;
    if (v === null || v === undefined || v === '') return;
    if (isObjectIdRef(v)) objectIdRefs.push(String(v));
    else if (Number.isFinite(Number(v))) legacyIdRefs.push(Number(v));
  });

  const or = [];
  if (objectIdRefs.length) or.push({ _id: { $in: objectIdRefs } });
  if (legacyIdRefs.length) or.push({ id: { $in: legacyIdRefs } });
  if (!or.length) return rows;

  const departments = await ServiceCategory.find({ $or: or })
    .select('service_category_name id')
    .lean();

  const nameByObjectId = {};
  const nameByLegacyId = {};
  departments.forEach((d) => {
    nameByObjectId[String(d._id)] = d.service_category_name;
    if (d.id !== undefined && d.id !== null) nameByLegacyId[Number(d.id)] = d.service_category_name;
  });

  return rows.map((r) => {
    const v = r.service_category_id;
    let department_name = null;
    if (isObjectIdRef(v)) department_name = nameByObjectId[String(v)] || null;
    else if (Number.isFinite(Number(v))) department_name = nameByLegacyId[Number(v)] || null;
    return { ...r, department_name };
  });
};

// Attach a `navigation` array ([{ segment, label, count }]) to each service
// category: the count of Group Top Banners linked to it via
// `explore_our_service_item_id`. Drives the "Service Category Banner" column.
const withBannerNav = async (rows) => {
  const ids = [];
  rows.forEach((r) => {
    const s = String(r._id);
    ids.push(s);
    if (mongoose.Types.ObjectId.isValid(s)) ids.push(new mongoose.Types.ObjectId(s));
  });
  const map = new Map();
  try {
    const agg = await GroupTopBanner.aggregate([
      { $match: { exploreOurServiceItemId: { $in: ids } } },
      { $group: { _id: '$exploreOurServiceItemId', count: { $sum: 1 } } },
    ]);
    agg.forEach((r) => map.set(String(r._id), r.count));
  } catch (err) {
    // best-effort: fall through with empty counts
  }
  return rows.map((r) => ({
    ...r,
    navigation: [
      { segment: 'banner', label: 'Service Category Banner', count: map.get(String(r._id)) || 0 },
    ],
  }));
};

const index = async (req, res) => {
  // Enrich the factory's list response with the department name + banner nav.
  const sendJson = res.json.bind(res);
  res.json = async (payload) => {
    try {
      if (payload && Array.isArray(payload.data) && payload.data.length) {
        payload.data = await withDepartment(payload.data);
        payload.data = await withBannerNav(payload.data);
      }
    } catch (err) {
      // Enrichment is best-effort: fall back to the raw list on lookup failure.
    }
    return sendJson(payload);
  };
  return base.index(req, res);
};

const storeWithSlug = async (req, res) => {
  if (!req.body.service_slug && req.body.service_title) {
    req.body.service_slug = generateSlug(req.body.service_title);
  }
  return base.store(req, res);
};

const updateWithSlug = async (req, res) => {
  if (!req.body.service_slug && req.body.service_title) {
    req.body.service_slug = generateSlug(req.body.service_title);
  }
  return base.update(req, res);
};

module.exports = { ...base, index, store: storeWithSlug, update: updateWithSlug };
