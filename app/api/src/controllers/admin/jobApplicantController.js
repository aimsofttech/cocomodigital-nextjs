const mongoose = require('mongoose');
const JobApplicant = require('../../models/JobApplicant');
const JobList = require('../../models/JobList');
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

// An applicant carries no category of its own — it points at a JobList, and the
// listing is what belongs to a category. So a category filter resolves to the
// set of listing ids in that category, and a job-title filter narrows within it.
// Returns null when neither filter was supplied (i.e. "don't constrain jobListId").
const resolveJobListIds = async ({ jobCategoryId, jobListId }) => {
  let ids = null;
  if (jobCategoryId && mongoose.Types.ObjectId.isValid(jobCategoryId)) {
    const listings = await JobList.find({ jobCategoryId }).select('_id').lean();
    ids = listings.map((l) => String(l._id));
  }
  if (jobListId && mongoose.Types.ObjectId.isValid(jobListId)) {
    // Both set: the title must also sit in the chosen category, otherwise the
    // combination matches nothing (an empty $in) rather than silently widening.
    ids = ids && !ids.includes(String(jobListId)) ? [] : [String(jobListId)];
  }
  return ids;
};

const allApplications = async (req, res) => {
  const {
    page = 1, limit = 50, search = '',
    jobCategoryId = '', jobListId = '', applicationStatus = '',
  } = req.query;

  const filter = {};
  if (search) filter.$or = SEARCH_FIELDS.map((f) => ({ [f]: { $regex: search, $options: 'i' } }));
  if (applicationStatus) filter.applicationStatus = applicationStatus;

  const listIds = await resolveJobListIds({ jobCategoryId, jobListId });
  if (listIds) filter.jobListId = { $in: listIds.map((id) => new mongoose.Types.ObjectId(id)) };

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
