const JobList = require('../../models/JobList');
const JobCategory = require('../../models/JobCategory');
const createCrudController = require('./crudFactory');
const { generateSlug, parseCsvOrExcel } = require('../../utils/helpers');

const base = createCrudController(JobList, {
  imageFields: ['job_image'],
  searchFields: ['job_title', 'job_location', 'job_type'],
  defaultSort: { display_order: 1, createdAt: -1 },
  parentField: 'job_category_id',
  // Single slug for the listing: generate a unique `job_slug` (the field the
  // public web app and the admin form use). A manually-edited slug is respected;
  // otherwise it's derived from the job title. Generated on create and update.
  slugField: 'job_slug',
  // Resolve the (single) job category's name for the list/detail responses.
  // `name` is the current field; `category_name` is the legacy fallback.
  lookups: [
    {
      localField: 'job_category_id',
      model: JobCategory,
      nameField: ['name', 'category_name'],
      as: 'job_category_name',
    },
  ],
});

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
        job_type: row[1] ? [row[1]] : [],
        job_location: row[2] || '',
        experience: row[3] ? [row[3]] : [],
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

module.exports = { ...base, bulkUpload };
