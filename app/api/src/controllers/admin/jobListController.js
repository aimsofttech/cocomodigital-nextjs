const JobList = require('../../models/JobList');
const createCrudController = require('./crudFactory');
const { generateSlug, parseCsvOrExcel } = require('../../utils/helpers');

const base = createCrudController(JobList, {
  searchFields: ['job_title', 'job_location', 'job_type'],
  defaultSort: { display_order: 1, createdAt: -1 },
});

const storeWithSlug = async (req, res) => {
  if (!req.body.job_slug && req.body.job_title) req.body.job_slug = generateSlug(req.body.job_title);
  return base.store(req, res);
};

const bulkUpload = async (req, res) => {
  if (!req.file) return res.status(400).json({ status: 'error', message: 'No file uploaded' });
  try {
    const rows = await parseCsvOrExcel(req.file);
    const results = [];
    for (const row of rows) {
      const title = row[0];
      if (!title) continue;
      const item = await JobList.create({
        job_title: title,
        job_slug: generateSlug(title),
        job_type: row[1] || '',
        job_location: row[2] || '',
        experience: row[3] || '',
        job_description: row[4] || '',
        status: 0,
        user_id: req.user._id,
      });
      results.push(item);
    }
    res.status(201).json({ status: 'success', message: `${results.length} jobs uploaded`, data: results });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
};

module.exports = { ...base, store: storeWithSlug, bulkUpload };
