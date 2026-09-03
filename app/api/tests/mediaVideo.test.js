// What is being tested here is not "does ffmpeg work" — it is not
// installed, on this machine or on the server. It is the opposite: that
// every entry point in mediaVideo degrades to a reason instead of an
// exception when the binary is missing, because a throw here takes the
// whole describe queue down and stops photographs being described too.
//
// Run with:  node tests/mediaVideo.test.js
//
// No database and no ffmpeg required. FFMPEG_PATH is pointed at a binary
// that cannot exist, so the result is the same on a machine that has
// ffmpeg installed as on one that does not.
const path = require('path');

process.env.FFMPEG_PATH = '/nonexistent/ffmpeg-not-here';
process.env.FFPROBE_PATH = '/nonexistent/ffprobe-not-here';
process.env.AWS_URL = 'https://bucket.example.com';
process.env.AWS_BUCKET = 'test-bucket';

const writes = [];
const FakeModel = {
  updateOne(filter, patch) { writes.push({ op: 'updateOne', filter, patch }); return Promise.resolve({}); },
  updateMany(filter, patch) { writes.push({ op: 'updateMany', filter, patch }); return Promise.resolve({ modifiedCount: 2 }); },
  find() {
    return {
      sort() { return this; },
      limit() { return Promise.resolve([{ _id: 'v1', kind: 'video', url: 'https://bucket.example.com/uploads/videos/a.mp4' }]); },
    };
  },
};

const root = path.resolve(__dirname, '..');
const stub = (rel, exports) => {
  const p = path.join(root, rel);
  require.cache[p] = { id: p, filename: p, loaded: true, exports };
};

stub('src/models/MediaAsset.js', FakeModel);
stub('src/utils/s3Upload.js', {
  s3: { send: async () => ({}) },
  buildS3Url: (k) => `https://bucket.example.com/${k}`,
});
// Stubbed so a test run does not create logs/ and does not print the
// (correct, but noisy) "ffmpeg unavailable" warning nine times.
const warnings = [];
stub('src/utils/logger.js', {
  warn: (m) => warnings.push(m), error: () => {}, info: () => {},
});

const mv = require(path.join(root, 'src/services/mediaVideo.js'));

let allOk = true;
const check = (name, ok, got) => {
  if (!ok) { allOk = false; console.log(`  FAIL  ${name}`); console.log('        got:', JSON.stringify(got)); }
  else console.log(`  PASS  ${name}`);
};

(async () => {
  console.log('mediaVideo — honest degradation with no ffmpeg\n');

  // ---- frame placement: rule 3, "never the first frame" ----
  const t = mv.frameTimes(100, 3);
  check('three frames span start, middle and end — none at 0',
    t.length === 3 && t[0] > 0 && t[0] < 20 && t[1] > 40 && t[1] < 60 && t[2] > 80, t);

  check('a sub-second clip falls back to the only frame there is',
    JSON.stringify(mv.frameTimes(0.4, 3)) === '[0]', mv.frameTimes(0.4, 3));

  check('unknown duration does not produce NaN timestamps',
    JSON.stringify(mv.frameTimes(null, 3)) === '[0]', mv.frameTimes(null, 3));

  check('a single requested frame is taken from the middle',
    JSON.stringify(mv.frameTimes(60, 1)) === '[30]', mv.frameTimes(60, 1));

  // ---- poster choice: the black-frame rejection ----
  const chosen = mv.pickPoster([
    { atSec: 10, bytes: 900 },   // a fade-in, almost nothing to compress
    { atSec: 50, bytes: 84000 }, // a real frame
    { atSec: 90, bytes: 1200 },  // credits over black
  ]);
  check('poster is the largest JPEG, not the black frame', chosen.atSec === 50, chosen);

  // ---- degradation: nothing below may throw ----
  const avail = await mv.available();
  check('missing ffmpeg reported as unavailable, with a reason',
    avail.ok === false && typeof avail.reason === 'string' && avail.reason.length > 0, avail);

  check('the warning is logged exactly once, however many calls follow',
    warnings.length === 1, warnings.length);

  check('probe returns null rather than throwing',
    (await mv.probe('https://bucket.example.com/x.mp4')) === null, 'threw or returned non-null');

  const asset = { _id: 'v1', kind: 'video', url: 'https://bucket.example.com/x.mp4' };
  const poster = await mv.ensurePoster(asset);
  check('ensurePoster skips with a reason instead of throwing',
    poster.skipped === true && poster.reason === 'ffmpeg-unavailable', poster);
  check('ensurePoster writes nothing to the asset when it cannot do the work',
    writes.length === 0, writes);

  const prep = await mv.prepareForDescribe(asset);
  check('prepareForDescribe returns ok:false, so callProvider can park the asset',
    prep.ok === false && prep.reason === 'ffmpeg-unavailable', prep);

  const frames = await mv.extractFrames('https://bucket.example.com/x.mp4');
  check('extractFrames returns an empty set, not an exception',
    frames.ok === false && Array.isArray(frames.frames) && frames.frames.length === 0, frames);

  const backfill = await mv.backfillPosters(10);
  check('backfill still counts the work waiting on ffmpeg',
    backfill.considered === 1 && backfill.skipped === 1 && backfill.reason === 'ffmpeg-unavailable', backfill);

  // ---- parking a video must not look like a describer bug ----
  writes.length = 0;
  await mv.markUndescribable(asset, 'ffmpeg-unavailable');
  check("undescribable videos are 'skipped', never 'failed' (the queue retries failed)",
    writes[0] && writes[0].patch.describeStatus === 'skipped', writes[0]);

  writes.length = 0;
  const requeued = await mv.requeueSkippedVideos();
  check('requeue only touches unreviewed skipped videos',
    requeued.requeued === 2
    && writes[0].filter.describeStatus === 'skipped'
    && writes[0].filter.reviewed === 0
    && writes[0].patch.describeStatus === 'pending', writes[0]);

  // ---- sources ffmpeg must never be handed ----
  const dash = mv.sourceFor({ _id: 'v2', kind: 'video', url: '-i /etc/passwd' });
  check('a source beginning with "-" is refused, not passed to ffmpeg as a flag',
    !dash.source && /refusing/.test(dash.error || ''), dash);

  const sitePath = mv.sourceFor({ _id: 'v3', kind: 'video', url: '/Images/about/reel.mp4' });
  check('a site-relative path that is not on this box is refused, not guessed at',
    !sitePath.source && /not reachable/.test(sitePath.error || ''), sitePath);

  const s3src = mv.sourceFor({ _id: 'v4', kind: 'video', key: 'uploads/videos/a.mp4' });
  check('an S3 key resolves to the public object URL, so nothing is downloaded whole',
    s3src.source === 'https://bucket.example.com/uploads/videos/a.mp4', s3src);

  console.log(`\n${allOk ? 'All checks passed.' : 'FAILURES above.'}`);
  process.exit(allOk ? 0 : 1);
})();
