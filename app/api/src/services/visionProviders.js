const MediaAsset = require('../models/MediaAsset');
const MediaJob = require('../models/MediaJob');
const logger = require('../utils/logger');
const { buildS3Url } = require('../utils/s3Upload');
const { SHOWS } = require('../lib/mediaSearches');
const { prepareForDescribe, markUndescribable } = require('./mediaVideo');

/**
 * The vision layer — the only file in the repo that talks to a model.
 *
 * mediaDescriber.js owns WHEN we spend and HOW MUCH. This file owns WHAT
 * we ask and WHO we ask. Keeping the split means a vendor swap never
 * touches the budget ceiling, the checksum dedupe or the review rules.
 *
 * Three adapters — openai, anthropic, google — behind one prompt and one
 * JSON schema. They exist because the vendor choice was explicitly left
 * open (MEDIA_ASSET_INDEX.md, "what is deliberately NOT implemented"),
 * and a library of 661 files is small enough that being able to re-run it
 * on a cheaper provider next quarter is worth three fetch() bodies.
 *
 * No SDK. Three SDKs to make three HTTP calls would add ~40MB of
 * node_modules and a supply-chain surface to a repo that currently has
 * neither, and each vendor's structured-output parameter is one JSON key.
 *
 * ERROR POLICY — the distinction matters, so it is stated once here:
 *
 *   Per-asset terminal error (an SVG, a 30MB TIFF, a dead URL, a refusal,
 *   a schema violation that survived the retries). The asset is marked
 *   `failed` with a readable describeError and its slot in the returned
 *   array is null. mediaDescriber's `if (!results[j]) continue` skips it
 *   and the rest of the batch still lands. One bad file must never cost
 *   five good ones their description.
 *
 *   Undescribable (a video on a box with no ffmpeg). Parked by mediaVideo
 *   as 'skipped', which the queue does not select, so it is not retried
 *   three times and does not end up looking like a fault.
 *
 *   Config error (no key, no model, a model we cannot price). This one
 *   THROWS. It is not a fact about an asset, it is "the system is not set
 *   up", and it should surface at the admin button as the actual message
 *   rather than being written into five hundred describeError columns.
 *
 * WHY ONE ASSET PER CALL, when MEDIA_ASSET_INDEX.md said batch.
 * The design note batched to amortise prompt overhead. Two things it did
 * not account for: a call covering several assets cannot report an honest
 * per-asset cost (you can only divide the total, which is a guess dressed
 * as a number), and it cannot fail one of them without failing the group.
 * Both are hard requirements here — the budget ceiling is only as good as
 * the numbers under it. The prompt overhead the batching was for is
 * instead recovered by provider-side prompt caching, since the system
 * prompt is byte-identical on every call by construction.
 * MEDIA_DESCRIBE_BATCH therefore becomes the concurrency width rather
 * than the assets-per-call count, which is the same knob doing a more
 * useful job.
 *
 * One call still carries several PICTURES when the asset is a video —
 * frames from across the clip, which is one asset and one honest cost.
 */

// ---------------------------------------------------------------- config

const CONFIG = () => ({
  provider: process.env.MEDIA_DESCRIBE_PROVIDER || 'none',
  model: process.env.MEDIA_DESCRIBE_MODEL || '',
  concurrency: Math.min(Math.max(Number(process.env.MEDIA_DESCRIBE_BATCH || 6), 1), 12),
  retries: Math.min(Math.max(Number(process.env.MEDIA_DESCRIBE_RETRIES || 3), 0), 6),
  timeoutMs: Number(process.env.MEDIA_DESCRIBE_TIMEOUT_MS || 120000),
  maxOutputTokens: Number(process.env.MEDIA_DESCRIBE_MAX_OUTPUT_TOKENS || 4000),
  maxImageMb: Number(process.env.MEDIA_DESCRIBE_MAX_IMAGE_MB || 5),
  effort: process.env.MEDIA_DESCRIBE_EFFORT || 'low',
});

/**
 * The four types every one of the three vendors accepts. Individually they
 * each take more (Gemini takes HEIC, Anthropic does not), but the library
 * is one collection and an asset that describes on one provider and fails
 * on another is a support ticket nobody can reproduce.
 *
 * SVG is absent on purpose and is the expensive omission: MEDIA_TAXONOMY
 * puts ~40% of this library in vector art. No vision model rasterises SVG,
 * so those rows fail here with a message saying so rather than returning a
 * confident description of a blank canvas.
 */
const ACCEPTED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const EXTENSION_MEDIA_TYPES = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp',
};

// ------------------------------------------------------------ vocabulary

/**
 * `shows` is derived from mediaSearches.js rather than restated, because a
 * value the model can emit that no saved search queries is a value nobody
 * will ever find an asset by — and the reverse (a search filtering on a
 * value the model never emits) is a facet that silently returns zero.
 *
 * 'outdoors' is appended because SAVED_SEARCHES.culture filters on it and
 * the SHOWS map does not list it. Without this line the Cocoma-culture
 * search — the one that finds the photographs for an About page — matches
 * a third fewer assets than it should, and nothing anywhere says why.
 */
const SHOWS_VOCABULARY = Array.from(new Set([
  ...Object.values(SHOWS).flat(),
  'outdoors',
])).sort();

/**
 * `category` is the one meaning field with no enum in the schema, and a
 * free-text category is exactly how the existing vault reached 631
 * distinct tag values. Binding it to the SHOWS group names costs nothing,
 * cannot drift from what mediaSearches queries, and grows by itself if a
 * tenth group is ever added there.
 */
const CATEGORY_VOCABULARY = [...Object.keys(SHOWS), 'none'];

const ASSET_TYPES = ['photograph', 'key-art', 'logo-mark', 'illustration',
  'deck-slide', 'blank-template', 'screenshot', 'vector', 'video', 'unknown'];

const RIGHTS = ['own', 'client-ip', 'stock', 'unknown'];

/**
 * The consent enum has six values; the model is offered four. 'released'
 * and 'refused' are facts about a piece of paper in a filing cabinet, not
 * about pixels. A model that can say "released" will eventually say it
 * about a stranger in the background of a shoot photo, and the whole point
 * of the field is that somebody actually asked.
 */
const MODEL_CONSENT = ['staff', 'not-required', 'unknown', 'minors'];

// -------------------------------------------------------- output schema

/**
 * One schema, three dialects. Every provider gets the same field set with
 * the same enums, so a re-describe on a different vendor produces rows
 * that sort next to the old ones instead of a second vocabulary.
 *
 * `additionalProperties: false` plus every key in `required` is what
 * OpenAI's strict mode demands; Anthropic wants the same shape; Gemini
 * rejects additionalProperties entirely and gets it stripped below.
 */
const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['caption', 'altText', 'tags', 'category', 'shows', 'assetType',
    'people', 'ocrText', 'rights', 'consent', 'sensitive', 'usable'],
  properties: {
    caption: {
      type: 'string',
      description: 'One or two sentences naming what is actually in the frame: '
        + 'who, doing what, with what equipment, in what room, and any text that '
        + 'is legible. This is the sentence a person will search with.',
    },
    altText: {
      type: 'string',
      description: 'Screen-reader alt text. One clause, under 125 characters, '
        + 'no "image of" or "photo of" preamble.',
    },
    tags: {
      type: 'array',
      description: 'Five to twelve lowercase keywords a colleague would type '
        + 'into a search box. Nouns and activities, not adjectives.',
      items: { type: 'string' },
    },
    category: {
      type: 'string',
      description: 'The single coarse bucket this asset belongs in. "none" for '
        + 'artwork, logos and templates that depict no scene.',
      enum: CATEGORY_VOCABULARY,
    },
    shows: {
      type: 'array',
      description: 'Every listed cue physically visible in the frame. Empty is '
        + 'a correct answer for a logo or a title card.',
      items: { type: 'string', enum: SHOWS_VOCABULARY },
    },
    assetType: {
      type: 'string',
      description: 'What kind of object the file is, which is a separate '
        + 'question from what it depicts.',
      enum: ASSET_TYPES,
    },
    people: {
      type: 'integer',
      description: 'How many people are visible. 0 when none.',
    },
    ocrText: {
      type: 'string',
      description: 'Text legible in the frame, transcribed verbatim — '
        + 'whiteboards, monitors, slide titles, signage, lanyards. Empty string '
        + 'when there is none. Do not paraphrase and do not guess at blur.',
    },
    rights: {
      type: 'string',
      description: 'PROPOSED copyright status, for a human to confirm.',
      enum: RIGHTS,
    },
    consent: {
      type: 'string',
      description: 'PROPOSED consent status of the people in frame, for a human '
        + 'to confirm.',
      enum: MODEL_CONSENT,
    },
    sensitive: {
      type: 'boolean',
      description: 'True if this asset should be held back from every default '
        + 'query pending review.',
    },
    usable: {
      type: 'boolean',
      description: 'True if the image is technically and editorially fit to put '
        + 'on a marketing page, assuming the rights allow it.',
    },
  },
};

// ------------------------------------------------------------- the prompt

/**
 * The system prompt. Byte-identical on every call so provider-side prompt
 * caching actually hits — do not interpolate anything per-asset in here;
 * per-asset context goes in the user message below.
 *
 * If you edit this text, bump PROMPT_VERSION in mediaDescriber.js in the
 * same commit. Without that, a re-describe run writes new descriptions
 * that claim in describeMeta to be the same generation as the old ones,
 * and there is then no way to tell which rows have which prompt.
 *
 * It is also worth keeping long. Providers only cache a prefix above a
 * minimum size (Anthropic's is 1-4k tokens depending on the model), and
 * this sits close enough to the floor that trimming it for tidiness could
 * silently switch caching off and put ~25% back on the per-asset bill.
 */
const SYSTEM_PROMPT = `You catalogue the Cocoma Digital media library.

The point of this job: somebody should be able to find one photograph with
a search box instead of opening 49 files named studio-2026-NN.jpg. You look
at one asset and return one JSON object describing it. You are called once
per file, ever — what you write is read thousands of times and paid for
once, so it is worth being exact.

Everything you return is a PROPOSAL. A person reviews it in the admin panel
and their correction is final.

WRITING THE CAPTION

Name what is on screen: who, doing what, with what, where, and what is
legible. Read the whiteboard. Read the monitor. Read the slide.

  Not good enough:  "a man at a computer"
  The bar:          "an editor in over-ear headphones cutting a multicam
                     timeline, second workstation dark behind him, whiteboard
                     on the left reading EP04 FINAL MIX"

Two rules on top of that:

  Never name a person. Identifying who is in a frame is a human's job in
  the admin panel, and a confident wrong name is worse than no name.
  Describe role and action — "an editor", "a presenter to camera" — not
  physical characteristics.

  A wrong specific is worse than a right general. If you cannot read the
  software on the monitor, say "a video timeline", not "Premiere Pro". If
  a logo is too small to identify, say a logo is visible and stop.

THE OTHER MEANING FIELDS

  altText   one clause under 125 characters, no "image of" preamble.
  tags      5-12 lowercase keywords someone would actually type. Nouns and
            activities. No adjectives, no duplicates of the category.
  ocrText   every legible string in the frame, verbatim, separated by " | ".
            Empty when there is none. This is how somebody finds the shot
            of the whiteboard with the schedule on it.
  people    a count. 0 when nobody is visible.
  shows     only cues you can actually see. An empty list is the right
            answer for a logo or a title card.
  assetType what kind of object the FILE is, not what it depicts. A
            photograph of a poster is a photograph; the poster artwork
            itself is key-art. A slide with no content on it is
            blank-template, not deck-slide.

WHEN YOU ARE SHOWN SEVERAL FRAMES

They are frames sampled from across ONE video, in order, labelled with
their timestamp. Describe the video, not the frames: what it is of, what
changes between them, and where it appears to be going. "Three frames of
an office" is not a description of a video; "a walkthrough of the edit
floor, starting at the reception desk and ending on two editors at a
two-monitor bay" is.

  assetType is video for anything shown to you as frames.
  people is the most visible in any single frame, not the sum — the same
    two people in three frames are two people, not six.
  ocrText is everything legible across all the frames, in order.
  shows is the union: a cue that appears in any frame is in the frame.

GOVERNANCE — read this part twice

These two fields decide whether a file may ever go on a public page. This
library holds Cocoma's own edit-floor photographs sitting beside client
title artwork and licensed stock. Guessing generously here is how a stock
photo ends up on a page claiming we have a real sound room, so "unknown" is
a good answer and the default.

  rights
    own        clearly a photograph taken inside a working office or on a
               set — desks, people at work, our equipment, our rooms.
    client-ip  recognisable title artwork, key art, a poster, a platform
               logo, a show's branding, a still from broadcast content.
    stock      the look of a stock library: an empty immaculate studio,
               anonymous models, a generic desk composition, a watermark.
    unknown    anything you are not confident about. Most artwork.

  consent
    staff         people who are plainly colleagues working in an office or
                  on a shoot.
    not-required  nobody identifiable is in the frame at all.
    minors        ANY person who may be under 18 is visible. Set this
                  whenever you are unsure of an age. It is not a stricter
                  version of sensitive, it is a different decision, and it
                  needs a person to make it.
    unknown       people are present and you cannot tell which of the above
                  applies. Members of the public, a crowd, a client's team.

  sensitive = true whenever the frame contains a child, a legible private
  document, credentials or a password, personal contact details, unreleased
  client material, or anything that would embarrass the person in it.

  usable = is the picture good enough to put on a marketing page — sharp,
  reasonably composed, nothing awkward in it. Judge the photograph, not the
  rights; the rights are handled separately.

Return only the JSON object.`;

/**
 * Per-asset context. The filename and folder are hints, not facts, but
 * they are the strongest rights signal available: the library contains
 * Pitches/stock_images/music-studio.jpg, and a model looking only at the
 * pixels calls that one "own" every time.
 */
const buildUserText = (asset, job, loaded = {}) => {
  const frames = loaded.frames || [];
  const probe = loaded.probe || null;
  const lines = [];

  lines.push(frames.length > 1
    ? `Describe this video. You have been shown ${frames.length} frames from across it; `
      + 'describe the video as a whole, not one frame.'
    : 'Describe this asset.');
  lines.push('');
  lines.push('File record (a hint only — when the picture and the filename disagree,');
  lines.push('believe the picture):');
  if (asset.originalName) lines.push(`  filename: ${asset.originalName}`);
  if (asset.folder) lines.push(`  folder: ${asset.folder}`);
  const width = (probe && probe.width) || asset.width;
  const height = (probe && probe.height) || asset.height;
  const dims = width && height ? `${width}x${height}` : 'unknown size';
  const mb = asset.bytes ? `${(asset.bytes / (1024 * 1024)).toFixed(1)} MB` : 'unknown bytes';
  lines.push(`  ${asset.kind || 'image'}, ${asset.mimetype || 'unknown type'}, ${dims}, ${mb}`);
  if (asset.kind === 'video') {
    const secs = (probe && probe.duration) || asset.duration;
    lines.push(`  running time: ${secs ? `${Math.round(secs)}s` : 'unknown'}`);
    if (width && height && height > width) lines.push('  vertical/portrait framing');
    if (loaded.posterOnly) {
      lines.push('  only the stored poster frame is available, not the whole video');
    }
  }
  if (job) {
    const bits = [job.name || 'unnamed job'];
    if (job.client) bits.push(`client: ${job.client}`);
    if (job.clientType && job.clientType !== 'unknown') bits.push(job.clientType);
    if (job.industry && job.industry !== 'unknown') bits.push(job.industry);
    if (job.nda) bits.push('UNDER NDA');
    lines.push(`  job: ${bits.join(', ')}`);
  }
  return lines.join('\n');
};

// --------------------------------------------------------------- pricing

/**
 * Prices in USD per million tokens. This table is a dated snapshot and
 * will go stale; MEDIA_DESCRIBE_PRICE_IN_USD_PER_MTOK and
 * ..._OUT_... override it without a deploy and are what you should set the
 * day a vendor changes a rate.
 *
 * An unknown model is a hard error rather than a zero. MEDIA_DESCRIBE_
 * BUDGET_USD is enforced by summing describeMeta.costUsd; a model that
 * prices at zero does not run cheaply, it runs with the ceiling switched
 * off, and nobody finds out until the invoice.
 *
 * Anthropic rates: verified 2026-06-24. OpenAI and Google rates below are
 * a working snapshot — check them against the vendor's pricing page before
 * a large backfill, or just set the two env vars and ignore the table.
 */
const PRICES = {
  anthropic: {
    'claude-fable-5-1': { in: 10, out: 50 },
    'claude-fable-5': { in: 10, out: 50 },
    'claude-opus-5': { in: 5, out: 25 },
    'claude-opus-4-8': { in: 5, out: 25 },
    'claude-opus-4-7': { in: 5, out: 25 },
    'claude-opus-4-6': { in: 5, out: 25 },
    'claude-sonnet-5': { in: 2, out: 10 },
    'claude-sonnet-4-6': { in: 3, out: 15 },
    'claude-haiku-4-5': { in: 1, out: 5 },
  },
  openai: {
    'gpt-5-nano': { in: 0.05, out: 0.4 },
    'gpt-5-mini': { in: 0.25, out: 2 },
    'gpt-5': { in: 1.25, out: 10 },
    'gpt-4.1-nano': { in: 0.1, out: 0.4 },
    'gpt-4.1-mini': { in: 0.4, out: 1.6 },
    'gpt-4.1': { in: 2, out: 8 },
    'gpt-4o-mini': { in: 0.15, out: 0.6 },
    'gpt-4o': { in: 2.5, out: 10 },
  },
  google: {
    'gemini-2.5-flash-lite': { in: 0.1, out: 0.4 },
    'gemini-2.5-flash': { in: 0.3, out: 2.5 },
    'gemini-2.5-pro': { in: 1.25, out: 10 },
    'gemini-2.0-flash-lite': { in: 0.075, out: 0.3 },
    'gemini-2.0-flash': { in: 0.1, out: 0.4 },
  },
};

const priceFor = (provider, model) => {
  const rawIn = process.env.MEDIA_DESCRIBE_PRICE_IN_USD_PER_MTOK;
  const rawOut = process.env.MEDIA_DESCRIBE_PRICE_OUT_USD_PER_MTOK;
  if (rawIn !== undefined && rawIn !== '' && rawOut !== undefined && rawOut !== '') {
    const inUsd = Number(rawIn);
    const outUsd = Number(rawOut);
    if (Number.isFinite(inUsd) && Number.isFinite(outUsd) && inUsd >= 0 && outUsd >= 0) {
      return { in: inUsd, out: outUsd };
    }
    throw new ConfigError(
      'MEDIA_DESCRIBE_PRICE_IN_USD_PER_MTOK / _OUT_ must both be non-negative numbers.',
    );
  }

  const table = PRICES[provider] || {};
  // Longest prefix wins, so a dated snapshot id (gpt-4.1-mini-2025-04-14)
  // prices as gpt-4.1-mini and not as gpt-4.1.
  const match = Object.keys(table)
    .sort((a, b) => b.length - a.length)
    .find((k) => model === k || model.startsWith(k));
  if (match) return table[match];

  throw new ConfigError(
    `No price on file for ${provider} model "${model}", so its spend cannot be `
    + 'counted against MEDIA_DESCRIBE_BUDGET_USD. Set '
    + 'MEDIA_DESCRIBE_PRICE_IN_USD_PER_MTOK and MEDIA_DESCRIBE_PRICE_OUT_USD_PER_MTOK '
    + '(USD per million tokens) to the vendor\'s current rates, or use one of: '
    + `${Object.keys(table).join(', ') || 'none configured'}.`,
  );
};

/**
 * Cached input is billed at full rate here. That over-states spend by a few
 * percent on a provider that returns a cache hit, which is the correct
 * direction to be wrong about a ceiling.
 */
const costOf = (price, inputTokens, outputTokens) =>
  (inputTokens / 1e6) * price.in + (outputTokens / 1e6) * price.out;

// ---------------------------------------------------------------- errors

/**
 * "The system is not set up" — no key, no model, an unpriceable model.
 * Tagged with a flag as well as a class so mediaDescriber can recognise it
 * without importing it and stop the run instead of spending the whole
 * queue's retry budget on a missing environment variable.
 */
class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.isConfigError = true;
  }
}

/** The asset cannot be described. Mark it failed; do not retry. */
class AssetError extends Error {}

/**
 * Not a failure — a video we cannot get a frame out of, almost always
 * because ffmpeg is not installed. mediaVideo parks these as 'skipped'
 * rather than 'failed' precisely so the queue does not retry them: a
 * library of videos on a box with no ffmpeg would otherwise burn three
 * attempts each and settle as permanently failed, which reads like a
 * broken describer instead of a missing binary.
 */
class UndescribableError extends Error {}

/** Transient. Back off and try again. */
class TransientError extends Error {
  constructor(message, retryAfterMs) {
    super(message);
    this.retryAfterMs = retryAfterMs;
  }
}

// ------------------------------------------------------------ http layer

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Retries 429 and 5xx and connection failures; everything else is the
 * caller's problem on the first response. A 400 does not get better on the
 * fourth attempt, it just costs three more round trips before the same
 * error reaches the admin.
 */
const postJson = async (url, headers, body, cfg) => {
  let lastError;
  for (let attempt = 0; attempt <= cfg.retries; attempt += 1) {
    if (attempt > 0) {
      const backoff = lastError && lastError.retryAfterMs
        ? lastError.retryAfterMs
        : Math.min(1000 * 2 ** (attempt - 1), 30000) + Math.floor(Math.random() * 400);
      await sleep(backoff);
    }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(cfg.timeoutMs),
      });

      if (res.ok) return res.json();

      const text = (await res.text().catch(() => '')).slice(0, 600);
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get('retry-after'));
        lastError = new TransientError(
          `HTTP ${res.status} from provider: ${text}`,
          Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : null,
        );
        continue;
      }
      // 401/403 is a key problem, not an asset problem — say so plainly so
      // it does not get filed as "this photograph is broken".
      if (res.status === 401 || res.status === 403) {
        throw new ConfigError(`Provider rejected the API key (HTTP ${res.status}): ${text}`);
      }
      throw new AssetError(`HTTP ${res.status} from provider: ${text}`);
    } catch (err) {
      if (err instanceof ConfigError || err instanceof AssetError) throw err;
      // AbortError, DNS, socket reset — all worth another go.
      lastError = new TransientError(`${err.name || 'Error'}: ${err.message}`, null);
    }
  }
  throw new AssetError(
    `Provider unreachable after ${cfg.retries + 1} attempts. ${lastError ? lastError.message : ''}`.trim(),
  );
};

// --------------------------------------------------------- asset loading

const canonicalType = (v) => {
  const t = String(v || '').split(';')[0].trim().toLowerCase();
  return t === 'image/jpg' ? 'image/jpeg' : t;
};

/**
 * What the bytes actually are, in order of how much the source is worth
 * believing. Storage's own content-type wins when it says something
 * specific: if S3 calls the object an SVG, a `mimetype: image/png` left on
 * the row by a bad import does not get to overrule it and send 40KB of
 * XML to a vision endpoint. octet-stream and a missing header say nothing,
 * so those fall through to the record and then to the extension.
 */
const mediaTypeFor = (asset, contentType) => {
  const served = canonicalType(contentType);
  if (served.startsWith('image/') || served.startsWith('video/')) {
    return ACCEPTED_MEDIA_TYPES.includes(served) ? served : '';
  }
  const ext = String(asset.originalName || asset.key || '').split('.').pop().toLowerCase();
  return [canonicalType(asset.mimetype), EXTENSION_MEDIA_TYPES[ext] || '']
    .find((c) => ACCEPTED_MEDIA_TYPES.includes(c)) || '';
};

/**
 * Fetch the bytes ourselves rather than handing the vendor a URL. Two of
 * the three can fetch a URL and the bucket is public today, but a URL the
 * vendor cannot reach fails inside their pipeline as an opaque 400, and
 * the day the bucket stops being public-read all three break at once.
 */
const loadImageFromUrl = async (asset, source, cfg) => {
  const url = buildS3Url(source);
  if (!/^https?:\/\//i.test(url)) {
    throw new AssetError(
      `"${url}" is a site-relative path, not a fetchable URL. Files that ship inside `
      + 'app/web/public have to be uploaded to the bucket before they can be described.',
    );
  }

  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(cfg.timeoutMs) });
  } catch (err) {
    throw new TransientError(`Could not fetch asset bytes: ${err.message}`, null);
  }
  if (!res.ok) {
    // A 404 on the object is permanent; anything else might not be.
    if (res.status === 404 || res.status === 410) {
      throw new AssetError(`Asset bytes are gone from storage (HTTP ${res.status}) at ${url}`);
    }
    throw new TransientError(`Fetching asset bytes returned HTTP ${res.status}`, null);
  }

  const mediaType = mediaTypeFor(asset, res.headers.get('content-type'));
  if (!mediaType) {
    const seen = res.headers.get('content-type') || asset.mimetype || 'unknown';
    throw new AssetError(
      `"${seen}" is not a format any vision provider reads. Accepted: `
      + `${ACCEPTED_MEDIA_TYPES.join(', ')}. SVG and PDF have to be rasterised first.`,
    );
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const limit = cfg.maxImageMb * 1024 * 1024;
  if (buffer.length > limit) {
    throw new AssetError(
      `Image is ${(buffer.length / (1024 * 1024)).toFixed(1)} MB, over the `
      + `${cfg.maxImageMb} MB provider limit. Downscale it or raise `
      + 'MEDIA_DESCRIBE_MAX_IMAGE_MB if the provider in use allows more.',
    );
  }

  return { base64: buffer.toString('base64'), mediaType };
};

/**
 * The pictures to send for one asset.
 *
 * A photograph is one picture. A video is several, because a single frame
 * of a video is a bad summary of it — mediaVideo pulls them from across
 * the body of the clip (never the first frame, which on edited footage is
 * black) so the caption can describe what actually happens rather than
 * whatever was on screen at one instant.
 */
const loadFrames = async (asset, cfg) => {
  if (asset.kind !== 'video') {
    const source = asset.url || asset.key;
    if (!source) throw new AssetError('Asset has neither url nor key to fetch.');
    return { frames: [await loadImageFromUrl(asset, source, cfg)] };
  }

  const prepared = await prepareForDescribe(asset);
  if (prepared.ok) {
    return {
      probe: prepared.probe,
      frames: prepared.frames.map((f) => ({
        base64: f.base64, mediaType: f.mime, atSec: f.atSec,
      })),
    };
  }

  // ffmpeg has gone missing but an earlier backfill left a poster behind.
  // That poster is still a picture of this video and it is already in the
  // bucket, so describe it rather than parking a video we can in fact see.
  if (asset.posterKey) {
    return {
      posterOnly: true,
      frames: [await loadImageFromUrl(asset, asset.posterKey, cfg)],
    };
  }

  throw new UndescribableError(prepared.reason);
};

// ------------------------------------------------------------- adapters
//
// Each adapter takes the same inputs and returns the same
// { raw, inputTokens, outputTokens } — the shared code above and below it
// does the rest, so the three stay honestly comparable.

/**
 * A label before each picture. With several frames of one video this is
 * what stops the model averaging them into "various shots" — it can say
 * the room is empty at 4s and full at 30s only if it knows which is which.
 * A single picture gets no label; there is nothing to disambiguate.
 */
const frameLabel = (frames, i) => (frames.length === 1
  ? null
  : `Frame ${i + 1} of ${frames.length}${
    frames[i].atSec === undefined ? '' : `, at ${frames[i].atSec}s`}:`);

const anthropicAdapter = async ({ model, frames, userText, cfg }) => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new ConfigError('ANTHROPIC_API_KEY is not set.');

  const content = [];
  frames.forEach((f, i) => {
    const label = frameLabel(frames, i);
    if (label) content.push({ type: 'text', text: label });
    content.push({ type: 'image', source: { type: 'base64', media_type: f.mediaType, data: f.base64 } });
  });
  content.push({ type: 'text', text: userText });

  const body = {
    model,
    max_tokens: cfg.maxOutputTokens,
    // cache_control on the system block: the prompt is byte-identical every
    // call, which is the only reason one-asset-per-call is affordable.
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    output_config: {
      format: { type: 'json_schema', schema: OUTPUT_SCHEMA },
    },
    messages: [{ role: 'user', content }],
  };

  // effort is rejected outright by Haiku 4.5 and Sonnet 4.5, so it is only
  // sent to the models that have it. Cataloguing is high-volume extraction,
  // which is the workload the low end of the range exists for.
  if (/^claude-(fable-5|mythos-5|opus-5|opus-4-[5678]|sonnet-5|sonnet-4-6)/.test(model)) {
    body.output_config.effort = cfg.effort;
  }

  const json = await postJson('https://api.anthropic.com/v1/messages', {
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
  }, body, cfg);

  if (json.stop_reason === 'refusal') {
    const why = json.stop_details && json.stop_details.category;
    throw new AssetError(`Model declined to describe this asset${why ? ` (${why})` : ''}.`);
  }
  if (json.stop_reason === 'max_tokens') {
    throw new AssetError(
      'Response hit max_tokens and the JSON is truncated. Raise '
      + 'MEDIA_DESCRIBE_MAX_OUTPUT_TOKENS.',
    );
  }

  const block = (json.content || []).find((b) => b.type === 'text');
  if (!block) throw new AssetError('Provider returned no text block.');

  const u = json.usage || {};
  return {
    raw: block.text,
    // Cache creation and cache reads are billed but are NOT included in
    // input_tokens; leaving them out would under-report every cached call.
    inputTokens: (u.input_tokens || 0)
      + (u.cache_creation_input_tokens || 0)
      + (u.cache_read_input_tokens || 0),
    outputTokens: u.output_tokens || 0,
  };
};

const openaiAdapter = async ({ model, frames, userText, cfg }) => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new ConfigError('OPENAI_API_KEY is not set.');

  const headers = { authorization: `Bearer ${key}` };
  if (process.env.OPENAI_ORG_ID) headers['openai-organization'] = process.env.OPENAI_ORG_ID;

  const content = [];
  frames.forEach((f, i) => {
    const label = frameLabel(frames, i);
    if (label) content.push({ type: 'text', text: label });
    content.push({
      type: 'image_url',
      // "high" detail costs more tokens and is the whole point: at "low"
      // the model cannot read a whiteboard, and reading the whiteboard is
      // a stated requirement of this catalogue.
      image_url: { url: `data:${f.mediaType};base64,${f.base64}`, detail: 'high' },
    });
  });
  content.push({ type: 'text', text: userText });

  const json = await postJson('https://api.openai.com/v1/chat/completions', headers, {
    model,
    max_completion_tokens: cfg.maxOutputTokens,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'media_asset_description', strict: true, schema: OUTPUT_SCHEMA },
    },
  }, cfg);

  const choice = (json.choices || [])[0];
  if (!choice) throw new AssetError('Provider returned no choices.');
  if (choice.message && choice.message.refusal) {
    throw new AssetError(`Model declined to describe this asset: ${choice.message.refusal}`);
  }
  if (choice.finish_reason === 'length') {
    throw new AssetError(
      'Response hit the output limit and the JSON is truncated. Raise '
      + 'MEDIA_DESCRIBE_MAX_OUTPUT_TOKENS.',
    );
  }

  const u = json.usage || {};
  return {
    raw: (choice.message && choice.message.content) || '',
    inputTokens: u.prompt_tokens || 0,
    outputTokens: u.completion_tokens || 0,
  };
};

/**
 * Gemini takes an OpenAPI-flavoured schema, not JSON Schema: types are
 * upper-case and additionalProperties is rejected rather than ignored.
 * propertyOrdering is added because without it the field order drifts
 * between calls, which makes two responses harder to diff than they need
 * to be.
 */
const toGeminiSchema = (node) => {
  if (Array.isArray(node)) return node.map(toGeminiSchema);
  if (!node || typeof node !== 'object') return node;
  const out = {};
  Object.entries(node).forEach(([k, v]) => {
    if (k === 'additionalProperties') return;
    if (k === 'type') { out.type = String(v).toUpperCase(); return; }
    if (k === 'properties') {
      out.properties = Object.fromEntries(
        Object.entries(v).map(([pk, pv]) => [pk, toGeminiSchema(pv)]),
      );
      return;
    }
    if (k === 'items') { out.items = toGeminiSchema(v); return; }
    out[k] = v;
  });
  if (out.type === 'OBJECT' && out.properties) out.propertyOrdering = Object.keys(out.properties);
  return out;
};

const GEMINI_SCHEMA = toGeminiSchema(OUTPUT_SCHEMA);

const googleAdapter = async ({ model, frames, userText, cfg }) => {
  // Deliberately not GOOGLE_CLIENT_ID/SECRET: those are the Calendar OAuth
  // credentials for booking Meet links and have nothing to do with this.
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new ConfigError('GOOGLE_AI_API_KEY is not set.');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const parts = [];
  frames.forEach((f, i) => {
    const label = frameLabel(frames, i);
    if (label) parts.push({ text: label });
    parts.push({ inline_data: { mime_type: f.mediaType, data: f.base64 } });
  });
  parts.push({ text: userText });

  // Key goes in a header, never the query string: a URL with a key in it
  // ends up in access logs, proxy logs and error reports.
  const json = await postJson(url, { 'x-goog-api-key': key }, {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: GEMINI_SCHEMA,
      maxOutputTokens: cfg.maxOutputTokens,
    },
  }, cfg);

  if (json.promptFeedback && json.promptFeedback.blockReason) {
    throw new AssetError(`Request blocked: ${json.promptFeedback.blockReason}`);
  }
  const candidate = (json.candidates || [])[0];
  if (!candidate) throw new AssetError('Provider returned no candidates.');
  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    throw new AssetError(`Generation stopped early: ${candidate.finishReason}`);
  }

  const raw = ((candidate.content && candidate.content.parts) || [])
    .map((p) => p.text || '').join('');

  const u = json.usageMetadata || {};
  return {
    raw,
    inputTokens: u.promptTokenCount || 0,
    // 2.5-series models think by default and those tokens bill as output.
    // Counting only candidatesTokenCount here would under-report by more
    // than the visible answer costs.
    outputTokens: (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0),
  };
};

const ADAPTERS = {
  anthropic: anthropicAdapter,
  openai: openaiAdapter,
  google: googleAdapter,
};

// -------------------------------------------------------- normalisation

const oneOf = (value, allowed, fallback) =>
  (allowed.includes(value) ? value : fallback);

/**
 * Normalise even though every provider was given a schema. Structured
 * output is a strong guarantee, not an absolute one — a refusal, a
 * truncation or a provider quietly ignoring an enum all produce a
 * well-formed object with a wrong value in it, and applyResult writes
 * whatever it is handed straight into an indexed column.
 */
const normalise = (parsed) => {
  const str = (v, cap) => String(v == null ? '' : v).trim().slice(0, cap);
  const tags = Array.isArray(parsed.tags) ? parsed.tags : [];
  const shows = Array.isArray(parsed.shows) ? parsed.shows : [];
  const rights = oneOf(parsed.rights, RIGHTS, 'unknown');

  return {
    caption: str(parsed.caption, 1000),
    altText: str(parsed.altText, 300),
    tags: Array.from(new Set(
      tags.map((t) => String(t || '').trim().toLowerCase()).filter(Boolean),
    )).slice(0, 15),
    category: oneOf(parsed.category, CATEGORY_VOCABULARY, ''),
    shows: Array.from(new Set(shows.filter((s) => SHOWS_VOCABULARY.includes(s)))),
    assetType: oneOf(parsed.assetType, ASSET_TYPES, 'unknown'),
    people: Math.max(0, Math.trunc(Number(parsed.people) || 0)),
    // Capped: ocrText is in the text index, and a screenshot of a wall of
    // code would otherwise dominate every search that touches it.
    ocrText: str(parsed.ocrText, 4000),
    rights,
    consent: oneOf(parsed.consent, MODEL_CONSENT, 'unknown'),
    sensitive: Boolean(parsed.sensitive),
    usable: Boolean(parsed.usable),
  };
};

const parseResult = (raw) => {
  const text = String(raw || '').trim();
  if (!text) throw new AssetError('Provider returned an empty response.');
  try {
    return normalise(JSON.parse(text));
  } catch (err) {
    if (err instanceof AssetError) throw err;
    throw new AssetError(`Provider returned unparseable JSON: ${text.slice(0, 200)}`);
  }
};

// ------------------------------------------------------------ the worker

const markFailed = async (asset, message) => {
  const readable = String(message || 'Unknown error').slice(0, 500);
  logger.error(`visionProviders: asset ${asset._id} failed — ${readable}`);
  try {
    await MediaAsset.updateOne({ _id: asset._id }, {
      describeStatus: 'failed',
      describeError: readable,
    });
  } catch (err) {
    // A DB write failing here must not take the batch with it; the asset
    // stays 'processing' and the next run picks it up on attempt count.
    logger.error(`visionProviders: could not record failure for ${asset._id}: ${err.message}`);
  }
};

const describeOne = async (asset, { adapter, provider, model, price, job, cfg }) => {
  const loaded = await loadFrames(asset, cfg);
  const { raw, inputTokens, outputTokens } = await adapter({
    model,
    frames: loaded.frames,
    userText: buildUserText(asset, job, loaded),
    cfg,
  });

  return {
    ...parseResult(raw),
    inputTokens,
    outputTokens,
    costUsd: costOf(price, inputTokens, outputTokens),
    // Not read by applyResult today; carried because the value is free at
    // this point and reconstructing it later costs another vision call.
    provider,
    model,
  };
};

/** Bounded parallelism. Single-threaded, so the index grab needs no lock. */
const mapWithConcurrency = async (items, width, worker) => {
  const out = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(width, items.length) }, async () => {
    for (;;) {
      const i = cursor;
      cursor += 1;
      if (i >= items.length) return;
      out[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return out;
};

/**
 * describe(assets) -> array, index-aligned with `assets`.
 *
 * Each slot is either:
 *   { caption, altText, tags[], category, shows[], assetType, people,
 *     ocrText, rights, consent, sensitive, usable,
 *     inputTokens, outputTokens, costUsd, provider, model }
 * or null, meaning "this one already has its status and reason written to
 * Mongo — 'failed' for a fault, 'skipped' for a video waiting on ffmpeg —
 * so carry on without it".
 *
 * The first twelve keys are the contract applyResult() reads. shows,
 * assetType and consent are the taxonomy fields; applyResult persists them
 * as of the same change that wired this file in.
 */
const describe = async (assets, options = {}) => {
  const cfg = CONFIG();
  const provider = options.provider || cfg.provider;
  const model = options.model || cfg.model;

  // Config problems throw. They are not facts about an asset and they must
  // not be written into five hundred describeError columns as if they were.
  const adapter = ADAPTERS[provider];
  if (!adapter) {
    throw new ConfigError(
      `MEDIA_DESCRIBE_PROVIDER="${provider}" is not a provider. `
      + `Use one of: ${Object.keys(ADAPTERS).join(', ')} (or 'none' to stay inert).`,
    );
  }
  if (!model) {
    throw new ConfigError(
      'MEDIA_DESCRIBE_MODEL is not set. It has no default on purpose: '
      + 'describeMeta.model records what was billed, and a blank there means '
      + 'nobody can tell later which model wrote a description. See '
      + '.env.example for the per-provider suggestions.',
    );
  }
  const price = priceFor(provider, model);

  // One query for the whole batch. The job carries the client name and the
  // NDA flag, which are what turn a rights guess into a rights proposal.
  const jobIds = Array.from(new Set(assets.map((a) => a.job).filter(Boolean).map(String)));
  const jobs = new Map();
  if (jobIds.length) {
    const rows = await MediaJob.find({ _id: { $in: jobIds } })
      .select('name client clientType industry genre nda').lean();
    rows.forEach((j) => jobs.set(String(j._id), j));
  }

  return mapWithConcurrency(assets, cfg.concurrency, async (asset) => {
    try {
      return await describeOne(asset, {
        adapter,
        provider,
        model,
        price,
        job: asset.job ? jobs.get(String(asset.job)) : null,
        cfg,
      });
    } catch (err) {
      if (err instanceof ConfigError) throw err;
      // A video with no ffmpeg is parked, not failed. mediaVideo owns that
      // write because it also owns the reason string the admin reads.
      if (err instanceof UndescribableError) {
        await markUndescribable(asset, err.message);
        return null;
      }
      await markFailed(asset, err.message);
      return null;
    }
  });
};

module.exports = {
  describe,
  SYSTEM_PROMPT,
  OUTPUT_SCHEMA,
  SHOWS_VOCABULARY,
  CATEGORY_VOCABULARY,
  MODEL_CONSENT,
};
