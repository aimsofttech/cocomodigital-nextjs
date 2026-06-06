const mongoose = require('mongoose');

const jobApplicantSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  job_list_id: { type: mongoose.Schema.Types.Mixed, required: true },
  applicant_name: { type: String, required: true, trim: true },
  applicant_email: { type: String, required: true, trim: true, lowercase: true },
  applicant_phone: { type: String, trim: true },
  applicant_resume: { type: String, default: null },
  cover_letter: { type: String, trim: true },
  state: { type: String, trim: true },
  country: { type: String, trim: true },
  experience: { type: String, trim: true },
  linkedin_url: { type: String, trim: true },
  portfolio_url: { type: String, trim: true },
  application_status: { type: String, enum: ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'], default: 'pending' },
  is_read: { type: Number, enum: [0, 1], default: 0 },
}, { timestamps: true, strict: false, collection: 'job_applicants' });

module.exports = mongoose.model('JobApplicant', jobApplicantSchema);
