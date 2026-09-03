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

/* A stable fake object key, so nothing here can be mistaken for a real S3
 * object and no live URL is ever produced. */
const obj = (name, kind) => ({
  key: `caspian/_fixture/${name}`,
  url: `http://localhost:5000/local-media/caspian/_fixture/${name}`,
  originalName: name,
  checksum: sha(name),
  kind,
  mimetype: kind === 'video' ? 'video/mp4' : 'image/jpeg',
  bytes: kind === 'video' ? 8_400_000 : 2_100_000,
  width: 1920,
  height: 1080,
  ...(kind === 'video' ? { duration: 42 } : {}),
});

const described = (caption, tags) => ({
  caption,
  altText: caption,
  tags,
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
      ...described('Two editors at the grading desk, mid-session.', ['edit', 'team', 'desk']),
      job: openJob._id, rights: 'own', consent: 'staff', usable: true, sensitive: false,
      review: approved, setBy: { rights: 'human', consent: 'human' },
    },
    {
      _case: 'Approved but NOT usable. Must never appear in a publishable view.',
      ...obj('edit-floor-tight.jpg', 'image'),
      ...described('Close on a colour wheel, screen glare across the panel.', ['edit', 'detail']),
      job: openJob._id, rights: 'own', consent: 'staff', usable: false, sensitive: false,
      review: approved, setBy: { rights: 'human' },
    },
    {
      _case: 'Client IP. Owned by someone else — approval must not make it postable.',
      ...obj('client-key-art.jpg', 'image'),
      ...described('Key art: a lone figure against a lit skyline.', ['key-art', 'poster']),
      job: openJob._id, rights: 'client-ip', consent: 'not-required', usable: true, sensitive: false,
      review: approved, setBy: { rights: 'human' },
    },
    {
      _case: 'D3 — NDA. Nothing on the asset says NDA; it lives on the job. No read path filters it today.',
      ...obj('nda-set-build.jpg', 'image'),
      ...described('An unlit set under construction, crew moving flats.', ['set', 'build']),
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
      _case: 'Consent: minors. Legal exposure if this ever leaves the building.',
      ...obj('school-workshop.jpg', 'image'),
      ...described('A workshop session; several attendees are visibly under 18.', ['workshop', 'event']),
      job: openJob._id, rights: 'own', consent: 'minors', usable: false, sensitive: true,
      review: { state: 'proposed', byName: '', at: null, note: '' }, setBy: { consent: 'human' },
    },
    {
      _case: 'Consent: refused. A person said no. Must survive any later re-describe.',
      ...obj('crew-candid.jpg', 'image'),
      ...described('Candid of a crew member between takes.', ['crew', 'candid']),
      job: openJob._id, rights: 'own', consent: 'refused', usable: false, sensitive: false,
      review: { state: 'proposed', byName: '', at: null, note: '' }, setBy: { consent: 'human' },
      taggedPeople: [{ person: people[1]._id, box: { x: 0.38, y: 0.2, w: 0.22, h: 0.3 } }],
    },
    {
      _case: 'Rejected. Must not reappear in the queue or in any public view.',
      ...obj('blurred-frame.jpg', 'image'),
      ...described('Motion-blurred frame, unusable.', ['reject']),
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
      ...described('Cocoma lockup on a dark ground.', ['logo', 'brand']),
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
