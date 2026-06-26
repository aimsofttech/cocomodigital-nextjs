const mongoose = require('mongoose');

const jobApplicantSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  jobListId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobList', required: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  resume: { type: String, default: null },
  coverLetter: { type: String, trim: true },
  state: { type: String, trim: true },
  country: { type: String, trim: true },
  experience: { type: String, trim: true },
  linkedinUrl: { type: String, trim: true },
  portfolioUrl: { type: String, trim: true },
  currentCtc: { type: String, trim: true },
  annualCtc: { type: String, trim: true },
  noticePeriodDays: { type: String, trim: true },
  jobPrefrence: { type: String, trim: true },
  workType: { type: String, trim: true },
  applicationStatus: { type: String, enum: ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'], default: 'pending' },
  isRead: { type: Number, enum: [0, 1], default: 0 },
}, { timestamps: true, strict: false, collection: 'job_applicants' });

module.exports = mongoose.model('JobApplicant', jobApplicantSchema);
