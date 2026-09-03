// Run with:  node tests/mediaPersonTagging.test.js
//
// No database required, same as tests/mediaAssetFilters.test.js. Two things
// are worth asserting without one, and they are the two ways this feature
// breaks in production rather than in review:
//
//   1. A box arriving in PIXELS is refused, not clamped. Clamped, it stores
//      a face-sized smear in a corner and the feature looks like it works.
//   2. Searching by person obeys the SAME governance filter as the main
//      search. A second door into the library with its own idea of what is
//      safe is how a sensitive photograph or a client's key art escapes,
//      and it stays invisible for as long as the two filters agree.
const path = require('path');

let captured = null;
const fakeQuery = (result) => ({
  sort(s) { captured.sort = s; return this; },
  skip() { return this; },
  limit() { return this; },
  populate() { return this; },
  then(resolve) { return Promise.resolve(result).then(resolve); },
});

const FakeAsset = {
  find(filter, projection) { captured.filter = filter; captured.projection = projection; return fakeQuery([]); },
  countDocuments() { return Promise.resolve(0); },
  aggregate() { return Promise.resolve([]); },
};

const FakePerson = {
  // The controller reads its allowed values off the schema at require time.
  schema: {
    path: (p) => ({
      kind: { enumValues: ['internal', 'external'] },
      release: { enumValues: ['staff-contract', 'signed', 'verbal', 'refused', 'unknown'] },
    }[p]),
  },
  findById: (id) => Promise.resolve({
    _id: id, name: 'Dishan Puzari', kind: 'internal', release: 'unknown', status: 1,
  }),
  findOne: () => Promise.resolve(null),
};

const root = path.resolve(__dirname, '..');
const stub = (rel, exports) => {
  const file = path.join(root, rel);
  require.cache[file] = { id: file, filename: file, loaded: true, exports };
};

stub('src/models/MediaAsset.js', FakeAsset);
stub('src/models/MediaPerson.js', FakePerson);
stub('src/utils/s3Upload.js', { buildS3Url: (k) => k, deleteFromS3: async () => {} });
stub('src/services/mediaDescriber.js', {
  enqueue: async () => ({}), describeNow: async () => ({}), budgetStatus: () => ({}),
});
stub('src/utils/logger.js', { warn() {}, error() {}, info() {} });

const people = require(path.join(root, 'src/controllers/admin/mediaPersonController.js'));

// A real ObjectId-shaped string, so isValidObjectId lets the request through.
const PERSON_ID = '64b7f2a1c9e77a0012345678';

const runAssets = async (query) => {
  captured = {};
  const res = { json() {}, status() { return this; } };
  await people.assetsByPerson({ params: { personId: PERSON_ID }, query }, res);
  return captured;
};

const check = (name, ok, detail) => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok && detail !== undefined) console.log('        got:', JSON.stringify(detail));
  return Boolean(ok);
};

(async () => {
  const results = [];

  // ---- the box is fractions, never pixels ----------------------------
  const px = people.normaliseBox({ x: 1420, y: 380, w: 210, h: 260 });
  results.push(check('a pixel rect is REFUSED, not clamped',
    Boolean(px.error) && /not pixels/.test(px.error), px));

  const ok = people.normaliseBox({ x: 0.25, y: 0.1, w: 0.2, h: 0.3 });
  results.push(check('a 0-1 fraction box is accepted',
    !ok.error && ok.box.x === 0.25 && ok.box.h === 0.3, ok));

  results.push(check('a box running off the right edge is refused',
    Boolean(people.normaliseBox({ x: 0.9, y: 0.1, w: 0.2, h: 0.1 }).error)));

  results.push(check('a negative origin is refused',
    Boolean(people.normaliseBox({ x: -0.05, y: 0.1, w: 0.2, h: 0.1 }).error)));

  results.push(check('a zero-size box is refused',
    Boolean(people.normaliseBox({ x: 0.1, y: 0.1, w: 0, h: 0.1 }).error)));

  results.push(check('a non-numeric value is refused',
    Boolean(people.normaliseBox({ x: 'left', y: 0.1, w: 0.2, h: 0.1 }).error)));

  results.push(check('no box at all is legal — a name without a rectangle is a valid tag',
    people.normaliseBox(undefined).box === null && people.normaliseBox(null).box === null));

  results.push(check('float tails are rounded, not stored raw',
    people.normaliseBox({ x: 1 / 3, y: 0.1, w: 0.2, h: 0.1 }).box.x === 0.333333));

  // ---- person search is not a laxer door -----------------------------
  results.push(check('search by person EXCLUDES sensitive by default',
    (await runAssets({})).filter.sensitive === false));

  results.push(check('search by person always filters on that person',
    String((await runAssets({})).filter['taggedPeople.person']) === PERSON_ID));

  results.push(check('publishable=1 forces rights=own here too',
    (await runAssets({ publishable: '1' })).filter.rights === 'own'));

  results.push(check('publishable=1 cannot be overridden by rights=stock',
    (await runAssets({ publishable: '1', rights: 'stock' })).filter.rights === 'own'));

  results.push(check('the quarantine view still needs BOTH explicit flags',
    (await runAssets({ includeSensitive: '1', sensitive: '1' })).filter.sensitive === true));

  results.push(check('includeSensitive alone does not force sensitive-only',
    (await runAssets({ includeSensitive: '1' })).filter.sensitive === undefined));

  const allOk = results.every(Boolean);
  console.log(allOk
    ? `\n  all ${results.length} person-tagging guarantees hold`
    : '\n  FAILURES ABOVE');
  process.exit(allOk ? 0 : 1);
})();
