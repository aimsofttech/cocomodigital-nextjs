const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { PutObjectCommand } = require('@aws-sdk/client-s3');

const MediaAsset = require('../models/MediaAsset');
const { s3, buildS3Url } = require('../utils/s3Upload');
const logger = require('../utils/logger');

/**
 * Video support — probe, frame extraction, poster frames.
 *
 * Videos have always been registerable and have never been describable,
 * because a vision model needs a picture and an .mp4 is not one. This is
 * the missing half: pull a few JPEG frames out of a video so the same
 * describe worker that handles photographs can handle video, and store
 * one of them as the poster the admin grid and the site show.
 *
 * ── FFMPEG IS REQUIRED AND IS NOT INSTALLED ANYWHERE YET ──────────────
 *
 *   macOS (dev):   brew install ffmpeg
 *   Ubuntu/Debian: sudo apt-get update && sudo apt-get install -y ffmpeg
 *   verify:        ffmpeg -version && ffprobe -version
 *
 * Both binaries are used and both ship in that one package. The VPS
 * (89.116.32.146) is aaPanel-managed and may keep its own build outside
 * PATH; if so, point FFMPEG_PATH and FFPROBE_PATH at the absolute paths
 * rather than symlinking into /usr/bin, which aaPanel updates overwrite.
 *
 * No npm package here bundles a binary. `ffmpeg-static` and
 * `@ffmpeg-installer/ffmpeg` would make this work from `npm install`
 * alone with no server change, at the price of ~80 MB in node_modules, a
 * licensing question about which build gets shipped, and a binary the
 * deploy script now has to carry to production. That is a deployment
 * decision and it is Anshu's, not something to smuggle in inside a
 * service file.
 *
 * Design rules, in priority order:
 *
 *  1. A missing ffmpeg is a normal state, not an error. Nothing here
 *     throws when the binary is absent: every entry point returns a
 *     reason and the asset stays registered and searchable on whatever
 *     tags a human typed. If this module threw instead, one video in the
 *     queue would take down the batch around it and photographs — which
 *     need none of this — would stop being described.
 *
 *  2. Say it once. The "ffmpeg not found" warning is logged on the first
 *     check and never again. A backfill over 600 videos that logged one
 *     line per file is a log nobody reads afterwards.
 *
 *  3. Never the first frame. Most edited video opens on black, a slate
 *     or a fade-in, so `-ss 0` gets a black rectangle — which is how a
 *     naive poster ends up blank and a naive describe returns "a dark
 *     image with no discernible subject". Frames are taken across the
 *     body of the video instead; see FRAME_WINDOW.
 *
 *  4. Read from S3, do not download. Frames are pulled with input-side
 *     seeking straight off the object URL, so three frames out of a 4 GB
 *     master move a few megabytes, not four gigabytes, and nothing large
 *     ever lands on the API box's disk.
 *
 *  5. Technical facts only. This module writes duration, width, height,
 *     posterKey and (when nobody has ruled otherwise) assetType. It never
 *     touches caption, tags, rights or consent. Those belong to the
 *     describe worker and the reviewer, and a poster run has to stay safe
 *     to re-run over an asset a human has already signed off.
 */

const CONFIG = {
  ffmpeg: process.env.FFMPEG_PATH || 'ffmpeg',
  ffprobe: process.env.FFPROBE_PATH || 'ffprobe',
  frames: Math.max(Number(process.env.MEDIA_VIDEO_FRAMES || 3), 1),
  // Frames for the model are deliberately small. Vision pricing is per
  // tile of pixels, so a 1080p frame costs several times a 640px one and
  // tells the model nothing extra about what room it is looking at.
  frameWidth: Number(process.env.MEDIA_VIDEO_FRAME_WIDTH || 640),
  posterWidth: Number(process.env.MEDIA_POSTER_WIDTH || 1280),
  posterFolder: process.env.MEDIA_POSTER_FOLDER || 'uploads/posters',
  timeoutMs: Number(process.env.MEDIA_VIDEO_TIMEOUT_SEC || 90) * 1000,
};

// Sample between 10% and 90% of the running time. The head is titles and
// the tail is credits or a fade to black on almost everything we have
// ever cut, and neither describes the video.
const FRAME_WINDOW = [0.1, 0.9];

// A frame arrives on stdout as one buffer. 32 MB is far above any JPEG
// this produces and still bounded, so a corrupt file that makes ffmpeg
// emit a stream instead of one image kills the child rather than the API.
const MAX_STDOUT = 32 * 1024 * 1024;

const run = promisify(execFile);
const round3 = (n) => Math.round(n * 1000) / 1000;

// ---------------------------------------------------------------- ffmpeg

let availabilityPromise = null;

const checkBinary = async (bin) => {
  try {
    const { stdout } = await run(bin, ['-version'], { timeout: 15000, maxBuffer: 1 << 20 });
    return { ok: true, path: bin, version: String(stdout).split('\n')[0].trim() };
  } catch (err) {
    const reason = err.code === 'ENOENT' ? 'not found on PATH' : err.message;
    return { ok: false, path: bin, version: null, reason };
  }
};

const detect = async () => {
  const [ffmpeg, ffprobe] = await Promise.all([
    checkBinary(CONFIG.ffmpeg),
    checkBinary(CONFIG.ffprobe),
  ]);
  const ok = ffmpeg.ok && ffprobe.ok;
  const reason = ok ? null : [
    ffmpeg.ok ? null : `ffmpeg (${ffmpeg.path}): ${ffmpeg.reason}`,
    ffprobe.ok ? null : `ffprobe (${ffprobe.path}): ${ffprobe.reason}`,
  ].filter(Boolean).join('; ');

  if (!ok) {
    // Rule 2: this is the only place the warning is emitted, and the
    // memoised promise below means it happens once per process.
    logger.warn(
      `mediaVideo: ffmpeg unavailable — ${reason}. Video assets stay registered `
      + 'and searchable but get no poster and no description. Install with '
      + '"brew install ffmpeg" (macOS) or "apt-get install -y ffmpeg" (Ubuntu), '
      + 'or set FFMPEG_PATH / FFPROBE_PATH.',
    );
  }
  return { ok, reason, ffmpeg, ffprobe };
};

/** Is ffmpeg usable? Memoised — the answer cannot change mid-process. */
const available = () => {
  if (!availabilityPromise) availabilityPromise = detect();
  return availabilityPromise;
};

/**
 * Forget the cached answer. Needed after installing ffmpeg on a running
 * server, and by the tests, which flip FFMPEG_PATH between cases.
 */
const resetAvailability = () => { availabilityPromise = null; };

/** What to show on an admin screen next to the video count. */
const status = async () => {
  const a = await available();
  return {
    available: a.ok,
    reason: a.reason,
    ffmpeg: { path: a.ffmpeg.path, version: a.ffmpeg.version },
    ffprobe: { path: a.ffprobe.path, version: a.ffprobe.version },
    frames: CONFIG.frames,
    frameWidth: CONFIG.frameWidth,
    posterFolder: CONFIG.posterFolder,
  };
};

// ---------------------------------------------------------------- source

/**
 * Where ffmpeg should read this asset from.
 *
 * An argument beginning with "-" is rejected because execFile passes
 * argv straight through: a file stored as "-i" would otherwise be read
 * by ffmpeg as an option rather than a filename. There is no shell here,
 * so that is the only injection shape that applies.
 */
const sourceFor = (asset) => {
  const value = String((asset && (asset.url || buildS3Url(asset.key))) || '').trim();
  if (!value) return { error: 'asset has no url or key' };
  if (value.startsWith('-')) return { error: 'refusing a source that starts with "-"' };
  if (/^https?:\/\//i.test(value)) return { source: value };
  // A leading slash here is a site-relative path — a file that ships in
  // the website's own /public folder (see isSitePath in s3Upload). Those
  // live in app/web, not on the API box, so accept one only if it really
  // resolves on this filesystem.
  if (fs.existsSync(value)) return { source: path.resolve(value) };
  return { error: `source is not reachable from the API: ${value}` };
};

// ----------------------------------------------------------------- probe

const parseFps = (rate) => {
  if (!rate) return null;
  const [num, den] = String(rate).split('/').map(Number);
  if (!num || !den) return null; // "0/0" on streams with no constant rate
  return round3(num / den);
};

/**
 * A phone video carries its orientation in metadata rather than in the
 * pixels, so ffprobe reports a portrait clip as 1920x1080. Storing that
 * makes every "vertical / shorts" query wrong for exactly the footage
 * most likely to be vertical.
 */
const rotationOf = (stream) => {
  const side = (stream.side_data_list || []).find((d) => d && d.rotation !== undefined);
  const raw = side ? side.rotation : (stream.tags && stream.tags.rotate);
  return Math.abs(Number(raw) || 0) % 180 === 90 ? 90 : 0;
};

/**
 * duration / width / height / fps / codec. Returns null when ffmpeg is
 * missing or the file cannot be read — callers treat null as "unknown",
 * never as a failure.
 */
const probe = async (source) => {
  const a = await available();
  if (!a.ok) return null;
  try {
    const { stdout } = await run(CONFIG.ffprobe, [
      '-v', 'error',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      source,
    ], { timeout: CONFIG.timeoutMs, maxBuffer: 8 << 20 });

    const parsed = JSON.parse(stdout);
    const v = (parsed.streams || []).find((s) => s.codec_type === 'video');
    if (!v) return null;

    const rotated = rotationOf(v) === 90;
    const width = Number(v.width) || null;
    const height = Number(v.height) || null;
    const duration = Number(
      (parsed.format && parsed.format.duration) || v.duration || NaN,
    );

    return {
      duration: Number.isFinite(duration) ? round3(duration) : null,
      width: rotated ? height : width,
      height: rotated ? width : height,
      fps: parseFps(v.avg_frame_rate) || parseFps(v.r_frame_rate),
      codec: v.codec_name || null,
      rotated,
      bitrate: Number(parsed.format && parsed.format.bit_rate) || null,
    };
  } catch (err) {
    logger.error(`mediaVideo probe failed for ${source}: ${err.message}`);
    return null;
  }
};

// ------------------------------------------------------------ extraction

/**
 * Timestamps to sample, spread across FRAME_WINDOW.
 *
 * Exported because this is the rule the whole module exists to enforce —
 * "not the first frame" — and it is the one piece worth asserting in a
 * test without a video file to hand.
 */
const frameTimes = (duration, count = CONFIG.frames) => {
  const n = Math.max(Number(count) || 1, 1);
  // Under a second there is nothing to spread across, and seeking into a
  // clip that short frequently lands past the last frame and returns
  // nothing at all. Take what is there.
  if (!Number.isFinite(duration) || duration < 1) return [0];
  if (n === 1) return [round3(duration * 0.5)];
  const [lo, hi] = FRAME_WINDOW;
  return Array.from({ length: n }, (_, i) => round3(duration * (lo + ((hi - lo) * i) / (n - 1))));
};

const grabFrame = async (source, atSec, width) => {
  const args = [
    // ffmpeg inherits stdin and will read it if it is a TTY, which leaves
    // a script run from a terminal silently swallowing keystrokes.
    '-nostdin',
    '-v', 'error',
    // -ss BEFORE -i is input seeking: ffmpeg jumps to the keyframe before
    // the timestamp instead of decoding everything up to it. On an
    // hour-long master read over HTTPS that is a range request rather
    // than a full download, and it is why rule 4 holds.
    '-ss', String(atSec),
    '-i', source,
    '-frames:v', '1',
    // The backslash escapes the comma: unescaped, ffmpeg reads it as the
    // separator between two filters and the graph fails to parse. min()
    // keeps a small clip at its own size rather than upscaling it into a
    // blurry frame that costs more tokens and shows no more detail.
    '-vf', `scale=min(${width}\\,iw):-2:flags=bicubic`,
    '-f', 'image2',
    '-c:v', 'mjpeg',
    '-q:v', '3',
    'pipe:1',
  ];
  const { stdout } = await run(CONFIG.ffmpeg, args, {
    encoding: 'buffer',
    timeout: CONFIG.timeoutMs,
    maxBuffer: MAX_STDOUT,
  });
  return stdout && stdout.length ? stdout : null;
};

/**
 * N JPEG frames spread across the video. Individual seeks are allowed to
 * fail: a variable-frame-rate file whose reported duration is longer than
 * its real one returns nothing for the last position, and one empty seek
 * is not a reason to give up on a video we already have two good frames
 * of.
 */
const extractFrames = async (source, opts = {}) => {
  const a = await available();
  if (!a.ok) return { ok: false, reason: 'ffmpeg-unavailable', frames: [] };

  const width = opts.width || CONFIG.frameWidth;
  const meta = opts.probe !== undefined ? opts.probe : await probe(source);
  const times = frameTimes(meta && meta.duration, opts.count || CONFIG.frames);

  const frames = [];
  for (const atSec of times) {
    try {
      const buffer = await grabFrame(source, atSec, width);
      if (buffer) frames.push({ atSec, bytes: buffer.length, buffer });
    } catch (err) {
      logger.warn(`mediaVideo: frame at ${atSec}s failed for ${source}: ${err.message}`);
    }
  }

  // Last resort. A stream with no readable duration gets one attempt at
  // the very start — a black first frame is still better than no poster.
  if (!frames.length && times[0] !== 0) {
    try {
      const buffer = await grabFrame(source, 0, width);
      if (buffer) frames.push({ atSec: 0, bytes: buffer.length, buffer });
    } catch (err) {
      logger.warn(`mediaVideo: fallback frame failed for ${source}: ${err.message}`);
    }
  }

  if (!frames.length) return { ok: false, reason: 'no frames extracted', frames: [], probe: meta };
  return { ok: true, frames, probe: meta };
};

/**
 * Pick the poster out of a set of frames.
 *
 * Largest JPEG wins. There is no decoder in this process to measure
 * "interesting", but at a fixed quality setting a black frame, a fade or
 * a plain title card compresses to a small fraction of the size of a real
 * one — so byte length separates exactly the case we care about, which is
 * not shipping a poster of the fade-in.
 */
const pickPoster = (frames) => frames.reduce((best, f) => (f.bytes > best.bytes ? f : best), frames[0]);

// -------------------------------------------------------------- storage

const posterKeyFor = (asset) => {
  const base = path.basename(String(asset.originalName || asset.key || 'video'))
    .replace(/\.[^.]+$/, '')
    .replace(/[^A-Za-z0-9_\-.]/g, '_')
    .slice(0, 80) || 'video';
  return `${CONFIG.posterFolder}/${Date.now()}_${Math.round(Math.random() * 1e6)}_${base}.jpg`;
};

/**
 * Store the poster on S3 using the client the rest of the app uploads
 * with — same bucket, same public-read ACL as uploadYoutubeThumbnailToS3,
 * which is the only other place we PUT a buffer we built ourselves rather
 * than a stream multer handed us.
 */
const putPoster = async (buffer, asset) => {
  const key = posterKeyFor(asset);
  await s3.send(new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'image/jpeg',
    ACL: 'public-read',
    // The key carries a timestamp and is never rewritten, so the object
    // is safe to cache forever.
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  return key;
};

// setBy is a Map on a hydrated document and a plain object on a .lean()
// one, and this module is called with both.
const setByOf = (asset, field) => {
  const sb = asset && asset.setBy;
  if (!sb) return null;
  return typeof sb.get === 'function' ? sb.get(field) : sb[field];
};

// ---------------------------------------------------------------- public

/**
 * Give a video a poster frame, and fill in the technical facts while the
 * file is open. Idempotent: an asset that already has a posterKey is left
 * alone unless force is passed, so this is safe to run over the whole
 * library repeatedly.
 */
const ensurePoster = async (asset, opts = {}) => {
  if (!asset || asset.kind !== 'video') {
    return { id: asset && asset._id, skipped: true, reason: 'not a video' };
  }
  if (asset.posterKey && !opts.force) {
    return { id: asset._id, skipped: true, reason: 'poster exists' };
  }

  const a = await available();
  if (!a.ok) return { id: asset._id, skipped: true, reason: 'ffmpeg-unavailable' };

  const { source, error } = sourceFor(asset);
  if (error) return { id: asset._id, skipped: true, reason: error };

  const meta = await probe(source);
  const { ok, frames, reason } = await extractFrames(source, {
    width: opts.width || CONFIG.posterWidth,
    count: opts.count || CONFIG.frames,
    probe: meta,
  });
  if (!ok) return { id: asset._id, skipped: true, reason };

  const poster = pickPoster(frames);
  const key = await putPoster(poster.buffer, asset);

  // Rule 5: technical facts only. These are measurements, not judgements,
  // so writing them over a reviewed asset is correct — but assetType is a
  // judgement, and a reviewer who called this a deck-slide export keeps
  // that call.
  const patch = { posterKey: key };
  if (meta) {
    if (Number.isFinite(meta.duration)) patch.duration = meta.duration;
    if (meta.width) patch.width = meta.width;
    if (meta.height) patch.height = meta.height;
  }
  if (asset.assetType === 'unknown' && setByOf(asset, 'assetType') !== 'human') {
    patch.assetType = 'video';
  }
  await MediaAsset.updateOne({ _id: asset._id }, patch);

  return {
    id: asset._id,
    posterKey: key,
    posterUrl: buildS3Url(key),
    atSec: poster.atSec,
    frames: frames.length,
    probe: meta,
  };
};

/**
 * Frames for the describe worker.
 *
 * This is the contract callProvider() in mediaDescriber.js consumes for a
 * video: it gets the same thing it would get for a photograph, several
 * times over, plus the probe so a caption can say how long the clip runs.
 * Three frames rather than one because a single mid-point frame of an
 * interview and a single mid-point frame of a title sequence look
 * identical, and because "what the video contains" is not a property of
 * any one instant of it.
 *
 * Returns { ok: false, reason } rather than throwing — see rule 1.
 */
const prepareForDescribe = async (asset) => {
  if (!asset || asset.kind !== 'video') return { ok: false, reason: 'not a video' };

  const a = await available();
  if (!a.ok) return { ok: false, reason: 'ffmpeg-unavailable' };

  const { source, error } = sourceFor(asset);
  if (error) return { ok: false, reason: error };

  const meta = await probe(source);
  const { ok, frames, reason } = await extractFrames(source, {
    width: CONFIG.frameWidth,
    count: CONFIG.frames,
    probe: meta,
  });
  if (!ok) return { ok: false, reason, probe: meta };

  return {
    ok: true,
    probe: meta,
    // base64 alongside the buffer because every vision API wants the
    // former and every S3 put wants the latter, and at 640px a frame is
    // tens of kilobytes — not worth making the caller choose.
    frames: frames.map((f) => ({
      atSec: f.atSec,
      mime: 'image/jpeg',
      bytes: f.bytes,
      buffer: f.buffer,
      base64: f.buffer.toString('base64'),
    })),
  };
};

/**
 * Park a video the describer cannot handle.
 *
 * 'skipped' rather than 'failed' on purpose: enqueue() retries failed
 * rows up to MEDIA_DESCRIBE_MAX_ATTEMPTS, so a library of videos on a box
 * with no ffmpeg would burn three attempts each and settle as permanently
 * failed — which reads like a broken describer instead of a missing
 * binary. 'skipped' is not selected by the queue at all.
 */
const markUndescribable = async (asset, reason) => {
  await MediaAsset.updateOne({ _id: asset._id }, {
    describeStatus: 'skipped',
    describeError: `video: ${reason}`,
  });
  return { id: asset._id, skipped: true, reason };
};

/**
 * Put skipped videos back in the queue. This is the button to press after
 * ffmpeg is finally installed; without it every video parked by
 * markUndescribable stays parked, because the queue never looks at
 * 'skipped'. Reviewed rows are left alone — a human already decided them.
 */
const requeueSkippedVideos = async () => {
  const r = await MediaAsset.updateMany(
    { kind: 'video', describeStatus: 'skipped', reviewed: 0 },
    { describeStatus: 'pending', describeError: null, describeAttempts: 0 },
  );
  return { requeued: r.modifiedCount || 0 };
};

/**
 * Give posters to up to `limit` videos that have none.
 *
 * The query runs before the ffmpeg check so that `considered` is honest
 * when the binary is missing: an admin needs to see "17 videos waiting on
 * ffmpeg", not a run that reports zero of everything and looks like there
 * is no work to do.
 */
const backfillPosters = async (limit = 20) => {
  const summary = { considered: 0, posters: 0, skipped: 0, failed: 0 };

  const videos = await MediaAsset.find({
    kind: 'video',
    status: 1,
    $or: [{ posterKey: null }, { posterKey: '' }, { posterKey: { $exists: false } }],
  }).sort({ createdAt: 1 }).limit(Math.max(Number(limit) || 20, 1));

  summary.considered = videos.length;
  if (!videos.length) return summary;

  const a = await available();
  if (!a.ok) {
    summary.skipped = videos.length;
    summary.reason = 'ffmpeg-unavailable';
    return summary;
  }

  for (const video of videos) {
    try {
      const result = await ensurePoster(video);
      if (result.posterKey) summary.posters += 1;
      else summary.skipped += 1;
    } catch (err) {
      // One unreadable file must not end the run: the next 19 videos are
      // probably fine.
      logger.error(`mediaVideo backfill failed for ${video._id}: ${err.message}`);
      summary.failed += 1;
    }
  }
  return summary;
};

module.exports = {
  available,
  resetAvailability,
  status,
  sourceFor,
  probe,
  frameTimes,
  extractFrames,
  pickPoster,
  ensurePoster,
  backfillPosters,
  prepareForDescribe,
  markUndescribable,
  requeueSkippedVideos,
  CONFIG,
};
