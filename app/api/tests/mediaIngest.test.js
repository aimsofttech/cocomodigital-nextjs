// What one dropped folder is allowed to do.
// Run with:  node tests/mediaIngest.test.js
//
// No database, no bucket, no network. S3 and the model are stubbed so the
// assertions are about the DECISIONS the ingest makes: which files are
// refused, which bytes are uploaded, and — the one that matters most —
// that a refused file never takes the batch around it down with it. A
// mistake there means a folder drop silently loses nineteen photographs
// because of one .zip.
const crypto = require('crypto');
const path = require('path');

const root = path.resolve(__dirname, '..');
const modelPath = path.join(root, 'src/models/MediaAsset.js');
const s3Path = path.join(root, 'src/utils/s3Upload.js');
const storagePath = require.resolve('../src/services/mediaStorage');
const loggerPath = path.join(root, 'src/utils/logger.js');
const describerPath = path.join(root, 'src/services/mediaDescriber.js');

// --- stubs ------------------------------------------------------------
let rows = [];
let puts = [];
let failFor = null;
let seq = 0;

const FakeModel = {
  async create(doc) {
    const row = { _id: `id${++seq}`, createdAt: new Date(), ...doc };
    rows.push(row);
    return row;
  },
  findOne(filter) {
    const hit = rows.find((r) => Object.entries(filter).every(([k, v]) => r[k] === v));
    return { sort() { return this; }, lean: async () => hit || null };
  },
};

const MEDIA_CONFIG = {
  image: {
    folder: 'uploads/images',
    extensions: /^(jpe?g|png|gif|webp|svg|avif|bmp)$/i,
    mimetypes: /^image\//i,
    maxSize: 15 * 1024 * 1024,
    label: 'image',
  },
  video: {
    folder: 'uploads/videos',
    extensions: /^(mp4|mov|webm|avi|mkv|m4v|ogv)$/i,
    mimetypes: /^video\//i,
    maxSize: 500 * 1024 * 1024,
    label: 'video',
  },
};

const FakeS3 = { MEDIA_CONFIG };

/* Ingest stores through the storage driver now, so that is the seam this
 * test replaces. Same contract as the real one — { key, url, driver } —
 * so a change to the driver's return shape breaks here rather than in
 * production. */
const FakeStorage = {
  async putBuffer(buffer, { folder, originalName }) {
    if (failFor === originalName) throw new Error('the store refused the write');
    const key = `${folder}/${puts.length}_${originalName}`;
    puts.push({ key, bytes: buffer.length });
    return { key, url: `https://bucket.test/${key}`, driver: 'test' };
  },
  async removeObject() {},
  urlFor: (key) => `https://bucket.test/${key}`,
};

const stub = (file, exports) => {
  require.cache[file] = { id: file, filename: file, loaded: true, exports };
};
stub(modelPath, FakeModel);
stub(s3Path, FakeS3);
stub(storagePath, FakeStorage);
stub(loggerPath, { warn() {}, error() {}, info() {} });
// Same hash the real describer uses. Stubbed only so this test does not
// load the vision provider stack to reach a one-line sha256.
stub(describerPath, {
  checksumOf: (buffer) => crypto.createHash('sha256').update(buffer).digest('hex'),
});

const { ingestBatch, classify } = require(path.join(root, 'src/services/mediaIngest.js'));

// --- fixtures ---------------------------------------------------------
// A real 4x2 PNG, so the probe under test measures something true rather
// than being handed the answer.
const png = (() => {
  const chunk = (type, body) => {
    const out = Buffer.alloc(body.length + 12);
    out.writeUInt32BE(body.length, 0);
    out.write(type, 4, 'ascii');
    body.copy(out, 8);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(4, 0);
  ihdr.writeUInt32BE(2, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IEND', Buffer.alloc(0)),
  ]);
})();

const file = (name, mimetype, buffer) => ({
  originalname: name, mimetype, buffer, size: buffer.length,
});

const reset = () => { rows = []; puts = []; failFor = null; seq = 0; };

const results = [];
const check = (name, ok, detail) => {
  results.push(Boolean(ok));
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok && detail !== undefined) console.log('        got:', JSON.stringify(detail));
};

(async () => {
  // 1. A mixed folder: two good files, one duplicate, three refusals.
  reset();
  const mixed = await ingestBatch({
    files: [
      file('studio-01.png', 'image/png', png),
      file('notes.zip', 'application/zip', Buffer.from('PK')),
      file('studio-01-copy.png', 'image/png', png),
      file('empty.png', 'image/png', Buffer.alloc(0)),
      file('huge.png', 'image/png', Buffer.alloc(16 * 1024 * 1024)),
      file('clip.mov', 'application/octet-stream', Buffer.from('not really a mov')),
    ],
    folder: 'studio-2026',
  });
  const by = Object.fromEntries(mixed.results.map((r) => [r.originalName, r]));

  check('a refused file does not stop the ones around it',
    mixed.summary.uploaded === 2 && mixed.summary.rejected === 3, mixed.summary);

  check('an unsupported type is refused by name, with the reason',
    by['notes.zip'].status === 'rejected' && /\.zip is not accepted/.test(by['notes.zip'].reason),
    by['notes.zip'].reason);

  check('an oversized image is refused on its own, not by aborting the batch',
    by['huge.png'].status === 'rejected' && /limit is 15\.0 MB/.test(by['huge.png'].reason),
    by['huge.png'].reason);

  check('an empty file is refused', by['empty.png'].status === 'rejected');

  check('identical bytes in one drop are uploaded once',
    by['studio-01-copy.png'].status === 'duplicate' && puts.length === 2,
    { puts: puts.length });

  check('the duplicate still gets its own row, keeping the second filename',
    rows.length === 3 && rows.some((r) => r.originalName === 'studio-01-copy.png'),
    rows.map((r) => r.originalName));

  check('dimensions are measured from the bytes, not taken from the form',
    by['studio-01.png'].asset.width === 4 && by['studio-01.png'].asset.height === 2,
    by['studio-01.png'].asset);

  check('a video the browser labelled octet-stream is still taken as video',
    by['clip.mov'].status === 'uploaded' && by['clip.mov'].kind === 'video');

  check('everything lands pending — an upload never describes anything',
    rows.every((r) => r.describeStatus === 'pending'),
    rows.map((r) => r.describeStatus));

  // 2. The same folder dropped a second time.
  const putsBefore = puts.length;
  const again = await ingestBatch({ files: [file('studio-01.png', 'image/png', png)] });
  check('a re-dropped file is never uploaded again',
    again.summary.duplicate === 1 && puts.length === putsBefore,
    { puts: puts.length });

  // 3. A described twin hands its description over for free.
  reset();
  await ingestBatch({ files: [file('a.png', 'image/png', png)] });
  Object.assign(rows[0], {
    describeStatus: 'done', caption: 'the edit bay at night', rights: 'own',
    tags: ['edit-bay'], usable: true,
  });
  const copied = await ingestBatch({ files: [file('b.png', 'image/png', png)] });
  check('a duplicate inherits the description instead of earning one',
    copied.results[0].asset.caption === 'the edit bay at night'
      && copied.results[0].asset.describeStatus === 'done'
      && rows[1].describeMeta.copiedFromChecksum === true,
    copied.results[0].asset);

  check('and it inherits the rights call, so a copy is not silently unpublishable',
    copied.results[0].asset.rights === 'own');

  // 4. dedupe=skip writes nothing at all.
  const rowsBefore = rows.length;
  const skipped = await ingestBatch({ files: [file('c.png', 'image/png', png)], dedupe: 'skip' });
  check('dedupe=skip returns what is there and writes no row',
    skipped.summary.duplicate === 1 && rows.length === rowsBefore,
    { rows: rows.length });

  // 5. A storage failure is not a rejection, and is not contagious.
  reset();
  failFor = 'broken.png';
  const partial = await ingestBatch({
    files: [
      file('broken.png', 'image/png', png),
      file('fine.png', 'image/png', Buffer.concat([png, Buffer.from([0])])),
    ],
  });
  check('a failed put is reported as failed (retryable), not rejected',
    partial.summary.failed === 1 && partial.summary.uploaded === 1
      && partial.results[0].status === 'failed',
    partial.summary);

  // 6. Governance set for the whole drop reaches every row.
  reset();
  await ingestBatch({
    files: [file('team.png', 'image/png', png)],
    job: 'job-1',
    governance: { rights: 'own', consent: 'staff' },
    setBy: { rights: 'human', consent: 'human', job: 'human' },
    folder: 'about-page',
  });
  check('job, rights, consent and folder are inherited by the whole drop',
    rows[0].job === 'job-1' && rows[0].rights === 'own'
      && rows[0].consent === 'staff' && rows[0].folder === 'about-page',
    rows[0]);

  check('classify() knows an image from a video from neither',
    classify(file('a.jpg', 'image/jpeg', png)) === 'image'
      && classify(file('a.mp4', 'video/mp4', png)) === 'video'
      && classify(file('a.pdf', 'application/pdf', png)) === null);

  const ok = results.every(Boolean);
  console.log(ok ? `\n  all ${results.length} ingest guarantees hold` : '\n  FAILURES ABOVE');
  process.exit(ok ? 0 : 1);
})();
