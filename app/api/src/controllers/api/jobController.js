const JobList = require('../../models/JobList');
const JobApplicant = require('../../models/JobApplicant');
const { buildS3Url } = require('../../utils/s3Upload');

const jobList = async (req, res) => {
  const jobs = await JobList.find({ status: 1 }).sort({ display_order: 1, createdAt: -1 })
    .populate('job_category_id', 'category_name category_slug');
  res.json({ status: 'success', data: jobs });
};

const getJobList = async (req, res) => {
  const { page = 1, limit = 10, category_id, job_type, search } = req.query;
  const filter = { status: 1 };
  if (category_id) filter.job_category_id = category_id;
  if (job_type) filter.job_type = job_type;
  if (search) filter.$or = [{ job_title: { $regex: search, $options: 'i' } }, { job_location: { $regex: search, $options: 'i' } }];
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [jobs, total] = await Promise.all([
    JobList.find(filter).sort({ display_order: 1 }).skip(skip).limit(parseInt(limit)).populate('job_category_id', 'category_name'),
    JobList.countDocuments(filter),
  ]);
  res.json({ status: 'success', data: jobs, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
};

const getJobDetail = async (req, res) => {
  const { job_slug } = req.params;
  const job = await JobList.findOne({ job_slug, status: 1 }).populate('job_category_id', 'category_name');
  if (!job) return res.status(404).json({ status: 'error', message: 'Job not found' });
  res.json({ status: 'success', data: job });
};

const storeApplicant = async (req, res) => {
  const { job_list_id, applicant_name, applicant_email, applicant_phone, cover_letter, linkedin_url, portfolio_url, state, country, experience } = req.body;
  if (!job_list_id || !applicant_name || !applicant_email) {
    return res.status(400).json({ status: 'error', message: 'Job ID, name, and email are required' });
  }
  const resumeKey = req.file ? (req.file.key || req.file.path) : null;
  const applicant = await JobApplicant.create({ job_list_id, applicant_name, applicant_email, applicant_phone, cover_letter, linkedin_url, portfolio_url, state, country, experience, applicant_resume: resumeKey });
  res.status(201).json({ status: 'success', message: 'Application submitted successfully', data: applicant });
};

const showApplicant = async (req, res) => {
  const applicant = await JobApplicant.findById(req.params.id).populate('job_list_id', 'job_title');
  if (!applicant) return res.status(404).json({ status: 'error', message: 'Not found' });
  const obj = applicant.toObject();
  if (obj.applicant_resume) obj.applicant_resume = `${process.env.AWS_URL}/${obj.applicant_resume}`;
  res.json({ status: 'success', data: obj });
};

module.exports = { jobList, getJobList, getJobDetail, storeApplicant, showApplicant };
