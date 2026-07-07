const JobApplicant = require('../../models/JobApplicant');
const { paginateQuery } = require('../../utils/helpers');
const { buildS3Url } = require('../../utils/s3Upload');

const SEARCH_FIELDS = ['name', 'email', 'phone'];
const POPULATE = { path: 'jobListId', select: 'title' };

const withResumeUrl = (doc) => {
  const obj = doc.toObject ? doc.toObject() : doc;
  if (obj.resume) obj.resume = buildS3Url(obj.resume);
  return obj;
};

const index = async (req, res) => {
  const { job_id, page = 1, limit = 50, search = '' } = req.query;
  const filter = {};
  if (job_id) filter.jobListId = job_id;
  if (search) filter.$or = SEARCH_FIELDS.map((f) => ({ [f]: { $regex: search, $options: 'i' } }));
  const result = await paginateQuery(JobApplicant, filter, { page: parseInt(page), limit: parseInt(limit), sort: { createdAt: -1 }, populate: POPULATE });
  res.json({ status: 'success', data: result.data.map(withResumeUrl), pagination: result.pagination });
};

const allApplications = async (req, res) => {
  const { page = 1, limit = 50, search = '' } = req.query;
  const filter = search
    ? { $or: SEARCH_FIELDS.map((f) => ({ [f]: { $regex: search, $options: 'i' } })) }
    : {};
  const result = await paginateQuery(JobApplicant, filter, { page: parseInt(page), limit: parseInt(limit), sort: { createdAt: -1 }, populate: POPULATE });
  res.json({ status: 'success', data: result.data.map(withResumeUrl), pagination: result.pagination });
};

const show = async (req, res) => {
  const doc = await JobApplicant.findById(req.params.id).populate(POPULATE);
  if (!doc) return res.status(404).json({ status: 'error', message: 'Not found' });
  res.json({ status: 'success', data: withResumeUrl(doc) });
};

const destroy = async (req, res) => {
  const doc = await JobApplicant.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ status: 'error', message: 'Not found' });
  res.json({ status: 'success', message: 'Applicant deleted' });
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

module.exports = { index, allApplications, show, destroy, bulkDelete, updateStatus };
