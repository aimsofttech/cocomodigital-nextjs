const router = require('express').Router();
const ctrl = require('../../controllers/api/jobController');
const { createS3Upload } = require('../../utils/s3Upload');
const upload = createS3Upload('job_resumes');

router.get('/', ctrl.jobList);
router.get('/list', ctrl.getJobList);
router.get('/detail/:job_slug', ctrl.getJobDetail);
router.post('/applicants', upload.single('resume'), ctrl.storeApplicant);
router.get('/applicants/:id', ctrl.showApplicant);

module.exports = router;
