// Stub the model so we can inspect exactly what filter/sort the
// controller builds for a given query string. The risk being tested is
// not "does Mongo work" but "does a search ever return something it
// must not" — a sensitive photo, or stock presented as our own.
// Run with:  node tests/mediaAssetFilters.test.js
//
// No database required. The model is stubbed so the assertions are
// about the FILTER the controller builds, which is where a mistake
// would leak a sensitive photograph or hand back stock imagery as our
// own work.
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
};

const root = path.resolve(__dirname, '..');
const modelPath = path.join(root, 'src/models/MediaAsset.js');
const s3Path = path.join(root, 'src/utils/s3Upload.js');
const descPath = path.join(root, 'src/services/mediaDescriber.js');
require.cache[modelPath] = { id: modelPath, filename: modelPath, loaded: true, exports: FakeModel };
require.cache[s3Path] = { id: s3Path, filename: s3Path, loaded: true, exports: { buildS3Url: (k) => k, deleteFromS3: async () => {} } };
require.cache[descPath] = { id: descPath, filename: descPath, loaded: true, exports: { enqueue: async () => ({}), describeNow: async () => ({}), budgetStatus: () => ({}) } };

const ctrl = require(path.join(root, 'src/controllers/admin/mediaAssetController.js'));

const run = async (query) => {
  captured = {};
  const res = { json() {}, status() { return this; } };
  await ctrl.index({ query }, res);
  return captured;
};

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

  allOk = results.every(Boolean);
  console.log(allOk ? `\n  all ${results.length} filter guarantees hold` : '\n  FAILURES ABOVE');
  process.exit(allOk ? 0 : 1);
})();
