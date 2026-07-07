const mongoose = require('mongoose');

const jobListSchema = new mongoose.Schema({
  // A listing belongs to a single category. `jobType`/`workplaceType`/
  // `experience` are multi-select (arrays); Mongoose hydrates an old scalar
  // value into a single-element array, so legacy rows still read.
  jobCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobCategory', default: null },
  title: { type: String, required: true, trim: true },
  slug: { type: String, trim: true, unique: true },
  image: { type: String, default: null },
  description: { type: String, trim: true },
  requirements: { type: String, trim: true },
  jobType: { type: [String], default: [] },
  workplaceType: { type: [String], default: [] },
  location: { type: String, trim: true },
  state: { type: String, trim: true },
  country: { type: String, trim: true },
  experience: { type: [String], default: [] },
  salary: { type: String, trim: true },
  noOfOpenings: { type: Number, default: 1 },
  applicationDeadline: { type: Date, default: null },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 0 },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'job_list' });

module.exports = mongoose.model('JobList', jobListSchema);
