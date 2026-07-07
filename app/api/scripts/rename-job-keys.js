'use strict';

/**
 * One-time migration: rename Jobs module document keys to camelCase —
 * job_categories and job_list. Also moves the unique slug index from
 * job_slug to slug. job_applicants is already camelCase — untouched.
 *
 * Run:   node scripts/rename-job-keys.js     (from app/api)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { rename, fillRename, fixTimestamps, moveUniqueIndex } = require('./_renameHelpers');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const categories = db.collection('job_categories');
  // Legacy mirror pair folds into the canonical name/slug (fill-only).
  await fillRename(categories, 'category_name', 'name');
  await fillRename(categories, 'category_slug', 'slug');
  await rename(categories, { display_order: 'displayOrder', user_id: 'userId' });
  await fixTimestamps(categories);

  const jobs = db.collection('job_list');
  await rename(jobs, {
    job_category_id: 'jobCategoryId',
    job_title: 'title',
    job_image: 'image',
    job_description: 'description',
    job_requirements: 'requirements',
    job_type: 'jobType',
    workplace_type: 'workplaceType',
    job_location: 'location',
    no_of_openings: 'noOfOpenings',
    application_deadline: 'applicationDeadline',
    display_order: 'displayOrder',
    user_id: 'userId',
  });
  // Two legacy salary keys fold into `salary` (job_salary is the data key).
  await fillRename(jobs, 'salary_range', 'salary');
  await fillRename(jobs, 'job_salary', 'salary');
  // Legacy scalar experience folds into the `experience` array field.
  await fillRename(jobs, 'job_experience', 'experience');
  // Drop the old unique index BEFORE the rename — while docs are being
  // renamed one by one, several temporarily miss job_slug (null), which
  // would collide on the unique index mid-update.
  try { await jobs.dropIndex('job_slug_1'); console.log('  job_list: dropped index job_slug_1'); } catch (e) { console.log(`  job_list: job_slug_1 not present (${e.codeName || e.message})`); }
  // job_slug is authoritative over any pre-existing slug value.
  await rename(jobs, { job_slug: 'slug' });
  // Derived junk key from an old lookup write — drop it.
  await jobs.updateMany({ job_category_name: { $exists: true } }, { $unset: { job_category_name: 1 } });
  await fixTimestamps(jobs);
  await moveUniqueIndex(jobs, 'slug_1', 'slug'); // replace any non-unique slug_1, then ensure unique

  await mongoose.disconnect();
  console.log('rename-job-keys: done');
})().catch((err) => { console.error(err); process.exit(1); });
