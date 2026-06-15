const mongoose = require('mongoose');
const HomePageSection = require('../../models/HomePageSection');
const HomePageSectionItem = require('../../models/HomePageSectionItem');
const createCrudController = require('./crudFactory');

const base = createCrudController(HomePageSection, {
  searchFields: ['section_name', 'section_title', 'category_name'],
  defaultSort: { display_order: 1 },
});

// Attach a `navigation` array with the count of Section Items in each section
// (linked by home_page_section_id). Drives the "Section Items" navigate button.
const attachNavigation = async (sections) => {
  if (!sections.length) return sections;
  const idVariants = [];
  sections.forEach((s) => {
    const v = String(s._id);
    idVariants.push(v);
    if (mongoose.Types.ObjectId.isValid(v)) idVariants.push(new mongoose.Types.ObjectId(v));
  });
  const map = new Map();
  try {
    const rows = await HomePageSectionItem.aggregate([
      { $match: { home_page_section_id: { $in: idVariants } } },
      { $group: { _id: '$home_page_section_id', count: { $sum: 1 } } },
    ]);
    rows.forEach((r) => map.set(String(r._id), r.count));
  } catch (err) {
    // best-effort
  }
  return sections.map((s) => ({
    ...s,
    navigation: [
      { segment: 'section-items', label: 'Section Items', count: map.get(String(s._id)) || 0 },
    ],
  }));
};

const index = async (req, res) => {
  const sendJson = res.json.bind(res);
  res.json = (payload) => {
    if (payload && payload.status === 'success' && Array.isArray(payload.data) && payload.data.length) {
      attachNavigation(payload.data)
        .then((data) => sendJson({ ...payload, data }))
        .catch(() => sendJson(payload));
      return res;
    }
    return sendJson(payload);
  };
  return base.index(req, res);
};

module.exports = { ...base, index };
