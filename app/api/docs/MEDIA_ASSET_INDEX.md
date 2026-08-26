# Media asset index — design note for review

**Author:** Anil (with Claude) · **Date:** 2026-08-26 · **Branch:** `anil-dev`
**Reviewer:** Anshu

Proposal, not a merge request in a hurry. Nothing here changes existing
behaviour, and it is inert until someone deliberately turns it on.

---

## The problem

We are about to load a large library of photographs and video. Two things
have to be true of it:

1. Anyone — a developer, the admin UI, an LLM writing a page — must be able
   to find *"the shot of an editor at a timeline"* in one query.
2. Finding it must not cost anything, no matter how often it happens.

Today neither is true. `public/Images/about/` holds 49 photographs named
`studio-2026-NN.jpg`. The only way to know what is in them is to open all
49, which we have now done twice.

## The idea in one line

**Describing is a write-time cost paid once. Searching is a read-time
query that costs nothing.**

A vision model looks at each file exactly once, at upload, and writes a
caption, alt text, tags, a category and a rights call into Mongo. Every
search afterwards is a `$text` query against an index. No model is ever
called to answer a search.

The alternative — asking a model at query time — looks simpler and is the
expensive mistake. Its bill grows with traffic forever; this one is a
fixed, one-off cost per file.

Rough shape of it, using today's library as the sample:

| | describe-once (this) | ask-a-model-per-search |
|---|---|---|
| 650 assets, first load | one-off, low single-digit dollars | $0 |
| 1,000 searches/month | **$0** | recurring, and grows |
| 10,000 searches/month | **$0** | 10× the above, every month |

## What is being added

```
src/models/MediaAsset.js                     new collection: media_assets
src/services/mediaDescriber.js               the only thing that spends money
src/controllers/admin/mediaAssetController.js  search + review, no model calls
src/routes/admin/mediaAssets.js              mounted at ${adminBase}/media
tests/mediaAssetFilters.test.js              10 assertions, no DB needed
src/server.js                                two lines, following the uploads pattern
```

Conventions followed from the existing codebase: CommonJS, Mongoose with
`{ timestamps: true, strict: false, collection: '...' }`, the
`{ status, message, data }` envelope, `protect` on every admin route,
`page`/`limit` pagination as in `contactUsController`.

## The four cost controls

**1. Checksum dedupe.** Every asset stores a sha256. Before any model is
called, the worker looks for an already-described row with the same bytes
and copies the description across for free. On the current library that
is a 37% saving on its own — the old and new website repos hold the same
50 studio photographs each, and `Images/about/studio-edit-bay.jpg` and
`studio-2026-09.jpg` turn out to be byte-identical.

**2. Batching.** `MEDIA_DESCRIBE_BATCH` assets go per call, so the prompt
overhead is amortised instead of paid per image.

**3. A hard budget.** `MEDIA_DESCRIBE_BUDGET_USD` is a monthly ceiling.
The worker re-reads actual spend from the database on every run, so a
process restart cannot reset the counter and spend it twice. On reaching
it, the run stops and reports `budgetReached` rather than continuing.

**4. Human corrections are permanent.** Editing an asset in the admin sets
`reviewed = 1`, and a later describe run skips it. A model does not get to
overwrite a person.

## The rights field, and why it is not a boolean

```
own        Cocoma shot or made it — publishable as our own work
client-ip  a client's title artwork — portfolio use only
stock      licensed stock — never on a page that claims it is ours
unknown    undetermined; treated as unpublishable
```

This is the field that stops a real mistake. Indexing the current library
turned up `Pitches/stock_images/music-studio.jpg` — a stock recording
studio. A naive search for "mixing desk" returns it first. Put that on a
page arguing that we have a real sound room and the page is worse than if
it had no photograph at all.

`GET /admin/media?publishable=1` is the guard: `rights=own`, `usable=true`,
`sensitive=false`. The tests assert it cannot be overridden by also
passing `rights=stock`.

Same field also covers licensing. The library holds Mirzapur, The Boys,
Citadel and Panchayat key art. Those are legitimate portfolio credits and
illegitimate decoration, and the index now knows the difference.

## Sensitive material

`sensitive = true` excludes an asset from every default query. The
describer can set it from the picture itself, not just the filename —
while indexing locally it flagged a photograph of a child in the office,
which no filename rule would have caught.

Default queries exclude sensitive assets. Seeing them requires
`includeSensitive=1` **and** `sensitive=1`, both explicit. That is
asserted in the tests.

## Endpoints

| Method | Path | Cost |
|---|---|---|
| `GET` | `/media?q=&tags=&kind=&rights=&publishable=1` | Mongo only |
| `GET` | `/media/stats` | Mongo only |
| `GET` | `/media/:id` | Mongo only |
| `PATCH` | `/media/:id` | Mongo only — marks `reviewed` |
| `DELETE` | `/media/:id` | drops the S3 object only if no other row shares its checksum |
| `POST` | `/media/:id/describe` | **spends** — one asset |
| `POST` | `/media/describe-queue` | **spends** — drains N pending |

Only the last two can cost anything, both are admin-triggered, and neither
sits on a path a visitor waits on.

## What is deliberately NOT implemented

`callProvider()` in `mediaDescriber.js` throws. That is intentional —
choosing a vendor and a model is your call, not something to be smuggled
in inside a schema change. With `MEDIA_DESCRIBE_PROVIDER` unset (the
default) the worker is completely inert: nothing is called, nothing is
spent, assets sit at `pending`, and search still works over hand-entered
tags.

**This can be merged today without an API key and without spending a
rupee.** Turning it on is a separate, deliberate decision.

The contract `callProvider()` must satisfy is documented above the stub.

## Open questions for you

1. **Vector search.** `MONGO_URI` is `mongodb://localhost:27017`, so Atlas
   Search and Atlas Vector Search are not available. `$text` covers
   keyword search well and costs nothing. Semantic search ("someone
   concentrating") would need embeddings — cheap to generate, but they
   need somewhere to live. In-process cosine is fine below ~50k assets;
   beyond that it wants a sidecar. Worth doing at all, or is `$text`
   enough for our volumes?

2. **Video.** The schema has `duration` and `posterKey`, but describing a
   video needs a frame extracted first, which means ffmpeg on the server.
   Are you happy adding that dependency, or should video stay
   tag-only for now?

3. **Where the worker runs.** Right now it is an admin button. A cron
   entry would be better once volume grows. Your call on where that
   lives.

4. **One text index limit.** Mongo allows one text index per collection.
   Everything searchable has to be in `media_search`. If you want another
   field searchable later it means dropping and rebuilding that index —
   worth knowing before the collection gets large.

## Running the tests

```bash
node app/api/tests/mediaAssetFilters.test.js
```

No database needed. Ten assertions, all on the filter the controller
builds — a wrong filter is how a sensitive photograph or a stock image
would escape, so that is what is tested.
