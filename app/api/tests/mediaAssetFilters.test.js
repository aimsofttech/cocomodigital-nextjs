// Stub the model so we can inspect exactly what filter/sort the
// controller builds for a given query string. The risk being tested is
// not "does Mongo work" but "does a search ever return something it
// must not" — a sensitive photo, stock presented as our own, or an
// asset no human has approved.
// Run with:  node tests/mediaAssetFilters.test.js
//
// No database required. The model is stubbed so the assertions are
// about the FILTER the controller builds, which is where a mistake
// would leak a sensitive photograph, hand back stock imagery as our
// own work, or publish something straight out of the describe worker.
const path = require('path');
const Module = require('module');

let captured = null;
const fakeQuery = (result) => ({
  sort(s) { captured.sort = s; return this; },
  skip() { return this; },
  limit() { return Promise.resolve(result); },
});

const FakeModel = {
  find(filter, projection) { captured.filter = filter; captured.projection = projection; return fakeQuery([]); },
  countDocuments() { return Promise.resolve(0); },
  // The review queue reports its own depth in one aggregate. Nothing here
  // asserts on the counts; it exists so the queue's Promise.all resolves.
  aggregate() { return Promise.resolve([]); },
};

const root = path.resolve(__dirname, '..');
const modelPath = path.join(root, 'src/models/MediaAsset.js');
const s3Path = path.join(root, 'src/utils/s3Upload.js');
const descPath = path.join(root, 'src/services/mediaDescriber.js');
const logPath = path.join(root, 'src/utils/logger.js');
require.cache[modelPath] = { id: modelPath, filename: modelPath, loaded: true, exports: FakeModel };
require.cache[s3Path] = { id: s3Path, filename: s3Path, loaded: true, exports: { buildS3Url: (k) => k, deleteFromS3: async () => {} } };
require.cache[descPath] = { id: descPath, filename: descPath, loaded: true, exports: { enqueue: async () => ({}), describeNow: async () => ({}), budgetStatus: () => ({}) } };
// Stubbed so a filter test does not create logs/ wherever it is run from.
require.cache[logPath] = { id: logPath, filename: logPath, loaded: true, exports: { warn() {}, error() {}, info() {} } };

// lib/mediaSearches is deliberately NOT stubbed. publishable() is the
// thing under test in half of these assertions, and a stub of it would
// only prove that the stub agrees with itself.
const ctrl = require(path.join(root, 'src/controllers/admin/mediaAssetController.js'));

const call = (fn) => async (query) => {
  captured = {};
  const res = { json() {}, status() { return this; } };
  await fn({ query }, res);
  return captured;
};

const run = call(ctrl.index);
const runQueue = call(ctrl.reviewQueue);

const check = (name, actual, expect) => {
  const ok = Boolean(expect(actual));
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log('        got filter:', JSON.stringify(actual.filter));
  return ok;
};

(async () => {
  const results = [];
  let allOk = true;

  results.push(check('default search EXCLUDES sensitive',
    await run({}), (c) => c.filter.sensitive === false));

  results.push(check('sensitive stays excluded even when filtering by rights',
    await run({ rights: 'own' }), (c) => c.filter.sensitive === false && c.filter.rights === 'own'));

  results.push(check('publishable=1 forces rights=own AND usable',
    await run({ publishable: '1' }),
    (c) => c.filter.rights === 'own' && c.filter.usable === true && c.filter.sensitive === false));

  results.push(check('publishable=1 cannot be overridden by rights=stock',
    await run({ publishable: '1', rights: 'stock' }),
    (c) => c.filter.rights === 'own'));

  // The review guard. An asset the describe worker has finished is not
  // publishable; an asset a person has approved is.
  results.push(check('publishable=1 REQUIRES a human approval',
    await run({ publishable: '1' }),
    (c) => c.filter['review.state'] === 'approved'));

  results.push(check('publishable=1 cannot be downgraded by reviewState=proposed',
    await run({ publishable: '1', reviewState: 'proposed' }),
    (c) => c.filter['review.state'] === 'approved'));

  results.push(check('publishable=1 beats an explicit sensitive quarantine view',
    await run({ publishable: '1', includeSensitive: '1', sensitive: '1' }),
    (c) => c.filter.sensitive === false));

  results.push(check('reviewState filters plain search when publishable is off',
    await run({ reviewState: 'rejected' }),
    (c) => c.filter['review.state'] === 'rejected'));

  results.push(check('text query uses the $text index and ranks by score',
    await run({ q: 'editor timeline' }),
    (c) => c.filter.$text && c.filter.$text.$search === 'editor timeline'
        && c.projection && c.projection.score
        && c.sort.score));

  results.push(check('no query falls back to newest-first, no text scoring',
    await run({}), (c) => c.projection === null && c.sort.createdAt === -1));

  results.push(check('tags are ANDed via $all',
    await run({ tags: 'editing, studio ,podcast' }),
    (c) => JSON.stringify(c.filter.tags) === JSON.stringify({ $all: ['editing', 'studio', 'podcast'] })));

  results.push(check('quarantine view requires BOTH explicit flags',
    await run({ includeSensitive: '1', sensitive: '1' }), (c) => c.filter.sensitive === true));

  results.push(check('includeSensitive alone does not force sensitive-only',
    await run({ includeSensitive: '1' }), (c) => c.filter.sensitive === undefined));

  results.push(check('limit is clamped to 100',
    await run({ limit: '99999' }), () => true));

  // ---- the review queue -------------------------------------------------
  // The 973 rows already in the vault have no review.state at all. A queue
  // that matches only the literal 'proposed' shows none of them, which is
  // the entire backlog it exists to work through.
  results.push(check('queue picks up rows that predate the review field',
    await runQueue({}),
    (c) => Array.isArray(c.filter.$or)
        && c.filter.$or.some((clause) => clause['review.state'] === 'proposed')
        && c.filter.$or.some((clause) => clause['review.state']
             && clause['review.state'].$exists === false)));

  results.push(check('queue is worked oldest-first, unlike search',
    await runQueue({}), (c) => c.sort.createdAt === 1));

  // Search hides sensitive assets; the queue must not, or the one photo
  // most in need of a ruling is the one nobody can rule on.
  results.push(check('queue does NOT hide sensitive assets',
    await runQueue({}), (c) => c.filter.sensitive === undefined));

  results.push(check('queue state=approved is an exact match, no $or',
    await runQueue({ state: 'approved' }),
    (c) => c.filter['review.state'] === 'approved' && c.filter.$or === undefined));

  results.push(check('queue state=all drops the review filter entirely',
    await runQueue({ state: 'all' }),
    (c) => c.filter.$or === undefined && c.filter['review.state'] === undefined));

  results.push(check('queue ready=1 limits to what the machine has finished',
    await runQueue({ ready: '1' }), (c) => c.filter.describeStatus === 'done'));

  allOk = results.every(Boolean);
  console.log(allOk ? `\n  all ${results.length} filter guarantees hold` : '\n  FAILURES ABOVE');
  process.exit(allOk ? 0 : 1);
})();
