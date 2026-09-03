/**
 * Local-only fixture for Caspian.
 *
 * The production library cannot exercise this system's edges: almost every
 * real row is an owned, non-sensitive photograph, and you cannot conjure an
 * NDA shoot or a minors-consent frame out of it to check that the governance
 * actually holds. So this seeds one asset per governance state, deliberately,
 * and each row's `_case` says what it is there to prove.
 *
 * Refuses to run against anything but a local database. Never on the server.
 *
 *   node scripts/seed-caspian-local.js          # add
 *   node scripts/seed-caspian-local.js --reset  # wipe the fixture first
 */
require('dotenv').config();
const crypto = require('crypto');
const mongoose = require('mongoose');

const MediaAsset = require('../src/models/MediaAsset');
const MediaJob = require('../src/models/MediaJob');
const MediaPerson = require('../src/models/MediaPerson');

const URI = process.env.MONGO_URI || '';
if (!/(127\.0\.0\.1|localhost)/.test(URI)) {
  console.error(`Refusing to seed: MONGO_URI is not local.\n  ${URI.replace(/\/\/.*@/, '//***@')}`);
  process.exit(1);
}

const FIXTURE = 'caspian-local-fixture';
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

/* Real, already-public Cocoma objects, so the grid shows actual pictures
 * instead of a wall of "no preview" — you cannot tell whether a media
 * library works from placeholder tiles.
 *
 * READ-ONLY BORROWING. These are objects the live marketing site already
 * serves; the fixture points at them and never writes, uploads, deletes
 * or re-ACLs anything. The `key` stays under caspian/_fixture/ so nothing
 * here can be mistaken for a row this system created, and every fixture
 * is scoped to the FIXTURE folder so --reset removes it cleanly.
 *
 * That they load at all is defect D4 restated: an unlisted URL in this
 * bucket is readable by anyone who has it, from anywhere, signed in or
 * not. Convenient here, and the exact reason the caspian/ prefix has to
 * go private before real uploading starts. */
const REAL_IMAGES = [
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/author-image/1743532251_anil%20mahato.jpeg",
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png",
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1773922799_revised.png",
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1773922859_tata%20EV.png",
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1773922872_imdb.png",
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1773922897_resized.png",
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1773923034_mini-tv.png",
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1773923264_Vshow-Cards.png",
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1773923629_t-series.png",
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1773923833_Trailer-prak-Group.png",
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1773923943_Progetto-Happiness.png",
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1773924313_Amazon-mx-player.png",
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1773925154_Ivy-Music.png",
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1773925687_Madfad-Media.png",
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1773926082_Unpolished.png",
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1774096883_Langistan-resized.png",
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/creative-house-thumbnail/1752158570_blanca%20thumbnail.jpeg",
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/marketing-house-content-carousels/1736418369_e5a02a6ea286762390ef8566bac1e249.jpg",
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/marketing-house-content-items/1736361902_Rectangle%201253%20(1).png",
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/marketing-house-content-items/1736361951_image%20(20).png",
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/marketing-house-content-items/1736361985_Rectangle%201253%20(1).png",
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/marketing-house-pre-launch-activities/1762139981_Four%20More%20Shots%20Please%20Season%201%20Official%20Trailer.jpg",
];
const REAL_VIDEO = "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/podcast/not-for/1788442028445_67982_WhatsApp_Video_2026-09-03_at_6.48.12_PM.mp4";

let pick = 0;
const obj = (name, kind) => ({
  key: `caspian/_fixture/${name}`,
  url: kind === 'video' ? REAL_VIDEO : REAL_IMAGES[pick++ % REAL_IMAGES.length],
  originalName: name,
  checksum: sha(name),
  kind,
  mimetype: kind === 'video' ? 'video/mp4' : 'image/jpeg',
  bytes: kind === 'video' ? 8_400_000 : 2_100_000,
  width: 1920,
  height: 1080,
  ...(kind === 'video' ? { duration: 42 } : {}),
});

const described = (caption, tags, shows = []) => ({
  caption,
  altText: caption,
  tags,
  /* The controlled vocabulary the nine saved searches are built on.
   * Without it every frame-derived search returns zero and the search
   * UI cannot be exercised at all — which is most of what Phase 1 is. */
  shows,
  describeStatus: 'done',
  assetType: 'photograph',
});

const run = async () => {
  await mongoose.connect(URI);
  const db = mongoose.connection.name;

  if (process.argv.includes('--reset')) {
    const a = await MediaAsset.deleteMany({ folder: FIXTURE });
    const j = await MediaJob.deleteMany({ name: /^\[fixture\]/ });
    const p = await MediaPerson.deleteMany({ note: FIXTURE });
    console.log(`reset: ${a.deletedCount} assets, ${j.deletedCount} jobs, ${p.deletedCount} people`);
  }

  // ── people ───────────────────────────────────────────────────────────────
  const people = [];
  for (const name of ['Anil Mahato', 'Priya Nair', 'Rahul Desai']) {
    people.push(await MediaPerson.findOneAndUpdate(
      { name },
      { name, note: FIXTURE },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ));
  }

  // ── jobs: one ordinary, one under NDA ────────────────────────────────────
  const openJob = await MediaJob.findOneAndUpdate(
    { name: '[fixture] Podcast set — in-house' },
    { name: '[fixture] Podcast set — in-house', client: 'Cocoma', clientType: 'internal',
      industry: 'media', genre: 'podcast', nda: false },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const ndaJob = await MediaJob.findOneAndUpdate(
    { name: '[fixture] Unreleased series — NDA' },
    { name: '[fixture] Unreleased series — NDA', client: 'A streaming platform', clientType: 'ott',
      industry: 'entertainment', genre: 'drama', nda: true },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const approved = { state: 'approved', byName: 'Anil', at: new Date(), note: '' };

  // ── one row per thing that must hold ─────────────────────────────────────
  const rows = [
    {
      _case: 'The happy path. Owned, described, approved — the only class publishable() should ever return.',
      ...obj('edit-floor-wide.jpg', 'image'),
      ...described('Two editors at the grading desk, mid-session.', ['edit', 'team', 'desk'],
        ['cocoma-people', 'edit-bay', 'screen-timeline']),
      job: openJob._id, rights: 'own', consent: 'staff', usable: true, sensitive: false,
      review: approved, setBy: { rights: 'human', consent: 'human' },
    },
    {
      _case: 'Approved but NOT usable. Must never appear in a publishable view.',
      ...obj('edit-floor-tight.jpg', 'image'),
      ...described('Close on a colour wheel, screen glare across the panel.', ['edit', 'detail'],
        ['screen-design', 'edit-bay']),
      job: openJob._id, rights: 'own', consent: 'staff', usable: false, sensitive: false,
      review: approved, setBy: { rights: 'human' },
    },
    {
      _case: 'Client IP. Owned by someone else — approval must not make it postable.',
      ...obj('client-key-art.jpg', 'image'),
      ...described('Key art: a lone figure against a lit skyline.', ['key-art', 'poster'], []),
      job: openJob._id, rights: 'client-ip', consent: 'not-required', usable: true, sensitive: false,
      review: approved, setBy: { rights: 'human' },
    },
    {
      _case: 'D3 — NDA. Nothing on the asset says NDA; it lives on the job. No read path filters it today.',
      ...obj('nda-set-build.jpg', 'image'),
      ...described('An unlit set under construction, crew moving flats.', ['set', 'build'],
        ['shoot-floor', 'lighting']),
      job: ndaJob._id, rights: 'client-ip', consent: 'not-required', usable: true, sensitive: false,
      review: approved, setBy: { rights: 'human' },
    },
    {
      _case: 'D3/D5 — NDA video. Should never be sent to a vision provider.',
      ...obj('nda-dailies.mp4', 'video'),
      job: ndaJob._id, rights: 'client-ip', consent: 'not-required', usable: false, sensitive: true,
      describeStatus: 'pending',
      review: { state: 'proposed', byName: '', at: null, note: '' }, setBy: { rights: 'human' },
    },
    {
      _case: 'An ordinary video: streams in place, seekable, nothing to hide.',
      ...obj('podcast-set-broll.mp4', 'video'),
      ...described('B-roll from the podcast set — wide, lights up, no talent.',
        ['b-roll', 'podcast', 'set'], ['shoot-floor', 'lighting', 'mic-audio']),
      job: openJob._id, rights: 'own', consent: 'not-required', usable: true, sensitive: false,
      review: approved, setBy: { rights: 'human', consent: 'human' },
    },
    {
      _case: 'Consent: minors. Legal exposure if this ever leaves the building.',
      ...obj('school-workshop.jpg', 'image'),
      ...described('A workshop session; several attendees are visibly under 18.', ['workshop', 'event'],
        ['public-crowd', 'meeting-room']),
      job: openJob._id, rights: 'own', consent: 'minors', usable: false, sensitive: true,
      review: { state: 'proposed', byName: '', at: null, note: '' }, setBy: { consent: 'human' },
    },
    {
      _case: 'Consent: refused. A person said no. Must survive any later re-describe.',
      ...obj('crew-candid.jpg', 'image'),
      ...described('Candid of a crew member between takes.', ['crew', 'candid'],
        ['cocoma-people', 'common-areas']),
      job: openJob._id, rights: 'own', consent: 'refused', usable: false, sensitive: false,
      review: { state: 'proposed', byName: '', at: null, note: '' }, setBy: { consent: 'human' },
      taggedPeople: [{ person: people[1]._id, box: { x: 0.38, y: 0.2, w: 0.22, h: 0.3 } }],
    },
    {
      _case: 'Rejected. Must not reappear in the queue or in any public view.',
      ...obj('blurred-frame.jpg', 'image'),
      ...described('Motion-blurred frame, unusable.', ['reject'], ['open-floor']),
      job: openJob._id, rights: 'own', consent: 'staff', usable: false, sensitive: false,
      review: { state: 'rejected', byName: 'Anil', at: new Date(), note: 'Out of focus.' },
      setBy: { rights: 'human' },
    },
    {
      _case: 'Undescribed and unreviewed — the state all 428 real rows are in right now.',
      ...obj('IMG_4417.jpg', 'image'),
      job: null, rights: 'unknown', consent: 'unknown', usable: false, sensitive: false,
      describeStatus: 'pending',
      review: { state: 'proposed', byName: '', at: null, note: '' },
    },
    {
      _case: 'Human said own; a later model run must not be able to overrule setBy.rights.',
      ...obj('studio-lockup.png', 'image'),
      ...described('Cocoma lockup on a dark ground.', ['logo', 'brand'], []),
      assetType: 'logo-mark',
      job: openJob._id, rights: 'own', consent: 'not-required', usable: true, sensitive: false,
      review: approved, setBy: { rights: 'human', consent: 'human' },
    },
  ];

  let made = 0;
  for (const r of rows) {
    const { _case, ...doc } = r;
    const res = await MediaAsset.findOneAndUpdate(
      { key: doc.key },
      { ...doc, folder: FIXTURE, note: _case },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    made += 1;
    console.log(`  ${res.key.padEnd(42)} ${_case.slice(0, 74)}`);
  }

  console.log(`\n${made} fixture assets in "${db}" (folder: ${FIXTURE})`);
  console.log(`  jobs: 1 open, 1 NDA   people: ${people.length}`);
  await mongoose.disconnect();
};

run().catch((e) => { console.error(e); process.exit(1); });
