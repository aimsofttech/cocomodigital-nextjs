const JobList = require('../../models/JobList');
const JobApplicant = require('../../models/JobApplicant');
const { buildS3Url } = require('../../utils/s3Upload');

const jobList = async (req, res) => {
  const jobs = await JobList.find({ status: 1 }).sort({ displayOrder: 1, createdAt: -1 })
    .populate('jobCategoryId', 'name slug');
  res.json({ status: 'success', data: jobs });
};

const getJobList = async (req, res) => {
  // `category_id`/`job_type` stay accepted as legacy query-param aliases.
  const { page = 1, limit = 10, search } = req.query;
  const categoryId = req.query.categoryId ?? req.query.category_id;
  const jobType = req.query.jobType ?? req.query.job_type;
  const filter = { status: 1 };
  if (categoryId) filter.jobCategoryId = categoryId;
  if (jobType) filter.jobType = jobType;
  if (search) filter.$or = [{ title: { $regex: search, $options: 'i' } }, { location: { $regex: search, $options: 'i' } }];
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [jobs, total] = await Promise.all([
    JobList.find(filter).sort({ displayOrder: 1 }).skip(skip).limit(parseInt(limit)).populate('jobCategoryId', 'name'),
    JobList.countDocuments(filter),
  ]);
  res.json({ status: 'success', data: jobs, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
};

const getJobDetail = async (req, res) => {
  const { job_slug } = req.params;
  const job = await JobList.findOne({ slug: job_slug, status: 1 }).populate('jobCategoryId', 'name');
  if (!job) return res.status(404).json({ status: 'error', message: 'Job not found' });
  res.json({ status: 'success', data: job });
};

const storeApplicant = async (req, res) => {
  const {
    jobListId, name, email, phone, coverLetter,
    linkedinUrl, portfolioUrl, state, country, experience,
    currentCtc, annualCtc, noticePeriodDays, jobPrefrence, workType,
  } = req.body;
  if (!jobListId || !name || !email) {
    return res.status(400).json({ status: 'error', message: 'Job ID, name, and email are required' });
  }
  const resumeKey = req.file ? (req.file.key || req.file.path) : null;
  const applicant = await JobApplicant.create({
    jobListId, name, email, phone, coverLetter,
    linkedinUrl, portfolioUrl, state, country, experience,
    currentCtc, annualCtc, noticePeriodDays, jobPrefrence, workType,
    resume: resumeKey,
  });
  res.status(201).json({ status: 'success', message: 'Application submitted successfully', data: applicant });
};

const showApplicant = async (req, res) => {
  const applicant = await JobApplicant.findById(req.params.id).populate('jobListId', 'title');
  if (!applicant) return res.status(404).json({ status: 'error', message: 'Not found' });
  const obj = applicant.toObject();
  if (obj.resume) obj.resume = `${process.env.AWS_URL}/${obj.resume}`;
  res.json({ status: 'success', data: obj });
};

module.exports = { jobList, getJobList, getJobDetail, storeApplicant, showApplicant };
