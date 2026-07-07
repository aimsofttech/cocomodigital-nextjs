const JobList = require('../../models/JobList');
const JobCategory = require('../../models/JobCategory');
const createCrudController = require('./crudFactory');
const { generateSlug, parseCsvOrExcel } = require('../../utils/helpers');

const base = createCrudController(JobList, {
  imageFields: ['image'],
  searchFields: ['title', 'location', 'jobType'],
  defaultSort: { displayOrder: 1, createdAt: -1 },
  parentField: 'jobCategoryId',
  // Single slug for the listing: generate a unique `slug` (the field the
  // public web app and the admin form use). A manually-edited slug is respected;
  // otherwise it's derived from the job title. Generated on create and update.
  slugField: 'slug',
  // Resolve the (single) job category's name for the list/detail responses.
  lookups: [
    {
      localField: 'jobCategoryId',
      model: JobCategory,
      nameField: 'name',
      as: 'jobCategoryName',
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
        title,
        slug: generateSlug(title),
        jobType: row[1] ? [row[1]] : [],
        location: row[2] || '',
        experience: row[3] ? [row[3]] : [],
        description: row[4] || '',
        status: 0,
        userId: req.user._id,
      });
      results.push(item);
    }
    res.status(201).json({ status: 'success', message: `${results.length} jobs uploaded`, data: results });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
};

module.exports = { ...base, bulkUpload };
