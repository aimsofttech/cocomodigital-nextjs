const JobApplicant = require('../../models/JobApplicant');
const { paginateQuery } = require('../../utils/helpers');

const index = async (req, res) => {
  const { job_id, page = 1, limit = 50, search = '' } = req.query;
  const filter = {};
  if (job_id) filter.job_id = parseInt(job_id);
  if (search) {
    filter.$or = [
      { first_name: { $regex: search, $options: 'i' } },
      { last_name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  const result = await paginateQuery(JobApplicant, filter, { page: parseInt(page), limit: parseInt(limit), sort: { createdAt: -1 } });
  res.json({ status: 'success', data: result.data, pagination: result.pagination });
};

const allApplications = async (req, res) => {
  const { page = 1, limit = 50, search = '' } = req.query;
  const filter = search
    ? { $or: [{ first_name: { $regex: search, $options: 'i' } }, { last_name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }
    : {};
  const result = await paginateQuery(JobApplicant, filter, { page: parseInt(page), limit: parseInt(limit), sort: { createdAt: -1 } });
  res.json({ status: 'success', data: result.data, pagination: result.pagination });
};

const show = async (req, res) => {
  const doc = await JobApplicant.findById(req.params.id);
  if (!doc) return res.status(404).json({ status: 'error', message: 'Not found' });
  const obj = doc.toObject();
  if (obj.upload_resume) obj.upload_resume = `${process.env.AWS_URL}/${obj.upload_resume}`;
  res.json({ status: 'success', data: obj });
};

const bulkDelete = async (req, res) => {
  const { ids } = req.body;
  if (!ids || !ids.length) return res.status(400).json({ status: 'error', message: 'IDs required' });
  await JobApplicant.deleteMany({ _id: { $in: ids } });
  res.json({ status: 'success', message: `${ids.length} applicants deleted` });
};

const updateStatus = async (req, res) => {
  const doc = await JobApplicant.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!doc) return res.status(404).json({ status: 'error', message: 'Not found' });
  res.json({ status: 'success', data: doc });
};

module.exports = { index, allApplications, show, bulkDelete, updateStatus };