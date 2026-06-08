const mongoose = require('mongoose');

const jobListSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  job_category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'JobCategory', default: null },
  job_title: { type: String, required: true, trim: true },
  job_slug: { type: String, trim: true, unique: true },
  job_description: { type: String, trim: true },
  job_requirements: { type: String, trim: true },
  job_type: { type: String, trim: true },
  job_location: { type: String, trim: true },
  state: { type: String, trim: true },
  country: { type: String, trim: true },
  experience: { type: String, trim: true },
  salary_range: { type: String, trim: true },
  no_of_openings: { type: Number, default: 1 },
  application_deadline: { type: Date, default: null },
  display_order: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  user_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'job_list' });

module.exports = mongoose.model('JobList', jobListSchema);
