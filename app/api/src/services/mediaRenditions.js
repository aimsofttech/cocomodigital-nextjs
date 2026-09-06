/**
 * Derivatives — the smaller copies everything except an editor's download
 * should actually be using.
 *
 * WHY THIS EXISTS
 *
 * Until now every surface served the original object. A grid of sixty
 * tiles pulled sixty full-resolution photographs; a 12 MB still was
 * downloaded in full to be painted 216 pixels wide. On studio wifi that is
 * slow, and on a phone it is somebody's data.
 *
 * WHY ON DEMAND AND NOT AT INGEST
 *
 * Generating at upload costs CPU and storage for every asset, including
 * the majority nobody ever opens, and does nothing for the assets already
 * in the library — which is all of them. Generating on first request costs
 * nothing for the unviewed, backfills the existing collection for free as
 * people browse, and is idempotent: the second request finds the file and
 * returns it.
 *
 * The cache key is the CONTENT hash, not the asset id. Roughly a third of
 * this library is byte-identical duplicates, so keying on checksum means
 * the duplicates share one rendition and the work is done once for all of
 * them — the same saving the describer already gets from checksum reuse.
 *
 * ON sharp
 *
 * utils/mediaProbe deliberately avoids sharp, and its reasoning is sound
 * for what it does: reading four numbers out of a header does not justify
 * a native build on a shared aaPanel host. Resizing is a different
 * question — there is no header trick that produces a smaller image — and
 * app/web already depends on sharp for next/image, so the deploy host
 * builds it either way.
 *
 * If sharp is genuinely unavailable at runtime, this degrades to serving
 * the original rather than failing. A slow picture beats a broken one.
 */
const MediaAsset = require('../models/MediaAsset');
const { putBuffer, urlFor } = require('./mediaStorage');
const logger = require('../utils/logger');

/* Loaded lazily and once. A missing native build must not take the whole
 * API down at boot over a feature that is an optimisation. */
let sharpLib;
let sharpTried = false;
const getSharp = () => {
  if (sharpTried) return sharpLib;
  sharpTried = true;
  try {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    sharpLib = require('sharp');
  } catch (err) {
    sharpLib = null;
    logger.warn(`sharp is unavailable (${err.message}); serving originals instead of renditions`);
  }
  return sharpLib;
};

/**
 * The variants, and what each is for.
 *
 * Two, not a size ladder. Every extra variant is storage and CPU spent on
 * a distinction nobody asked for, and there are exactly two consumers that
 * are not the original: a tile in a grid, and a picture on a detail
 * screen. The third consumer — an editor pulling the file — wants the
 * original and should get it untouched.
 *
 * `fit: 'inside'` everywhere — never crop. The library's job is to show
 * what an asset is, and a square crop of a 32:9 title card shows almost
 * nothing of it. Aspect-ratio crops for social formats are a different
 * feature with a different owner, and inventing centre-crops here would
 * quietly become the thing people used.
 */
const VARIANTS = {
  /* Scaled, never cropped. The library's job is to show what an asset IS,
   * and a crop hides part of the answer. */
  thumb: { width: 480, quality: 72 },
  preview: { width: 1400, quality: 80 },

  /* Cropped to a shape, because a video studio's output has shapes. These
   * three cover what actually gets published: a 16:9 thumbnail or player
   * still, a square for a feed, and a vertical for Shorts and Reels.
   *
   * Deliberately not a matrix of every platform's exact pixel spec —
   * those change, and a 1080x1080 that is really a 1200x1200 resized is
   * nobody's problem. The RATIO is the thing that cannot be fixed later
   * without going back to the original. */
  wide: { width: 1920, ratio: 16 / 9, quality: 82 },
  square: { width: 1080, ratio: 1, quality: 82 },
  tall: { width: 1080, ratio: 9 / 16, quality: 82 },
};


/**
 * Where to cut, when a shape has to be cut out of a photograph.
 *
 * The problem with automatic cropping is that it is confidently wrong. A
 * centre crop of a 16:9 group shot into 9:16 keeps the middle of a table
 * and loses the two people at the edges, and nothing about the result
 * looks like a mistake — which is why it goes out.
 *
 * Two sources, in order of how much they deserve to be trusted:
 *
 *   1. TAGGED FACES. Somebody has already told us where the people are,
 *      in fractions of the frame, for the person index. That is a human
 *      statement about what matters in this picture, and it is better
 *      evidence than any saliency heuristic will ever be. It costs
 *      nothing here because the work was done for a different reason.
 *
 *   2. libvips' attention strategy, which finds the region of highest
 *      saliency. Good on a single subject, unreliable on a group, and
 *      the honest fallback when nobody has said where to look.
 *
 * Returns an extract rectangle in PIXELS for case 1, or null to let sharp
 * choose for case 2.
 */
const cropWindow = (asset, targetRatio) => {
  const W = asset.width;
  const H = asset.height;
  if (!W || !H) return null;

  const boxes = (asset.taggedPeople || [])
    .map((t) => t.box)
    .filter((b) => b && Number.isFinite(b.x) && Number.isFinite(b.w));
  if (!boxes.length) return null;

  /* The union of every tagged face, in pixels. Keeping ALL of them is the
   * point: a crop that keeps one person and slices another is worse than
   * a centre crop, because it looks deliberate. */
  const minX = Math.min(...boxes.map((b) => b.x)) * W;
  const maxX = Math.max(...boxes.map((b) => b.x + b.w)) * W;
  const minY = Math.min(...boxes.map((b) => b.y)) * H;
  const maxY = Math.max(...boxes.map((b) => b.y + b.h)) * H;

  /* Headroom. A face box is a face; a photograph of a person is not
   * cropped to their jawline. A fifth of the subject's height above and
   * below is roughly what a person framing this by hand would leave. */
  const padY = (maxY - minY) * 0.2;
  const padX = (maxX - minX) * 0.1;
  const sx = Math.max(0, minX - padX);
  const sy = Math.max(0, minY - padY);
  const sw = Math.min(W, maxX + padX) - sx;
  const sh = Math.min(H, maxY + padY) - sy;

  /* The largest window of the target shape that still fits inside the
   * image and contains the subject. Grow the subject box out to the
   * target ratio rather than shrinking it in — losing a face to satisfy a
   * shape is the failure this whole function exists to avoid. */
  let cw = Math.max(sw, sh * targetRatio);
  let ch = cw / targetRatio;
  if (ch < sh) { ch = sh; cw = ch * targetRatio; }

  /* Cannot exceed the source. If the subject genuinely does not fit the
   * requested shape, the window is clamped and part of it is lost — but
   * centred on the subject rather than on the frame. */
  if (cw > W) { cw = W; ch = cw / targetRatio; }
  if (ch > H) { ch = H; cw = ch * targetRatio; }

  /* Centre the window on the subject, then slide it back inside the
   * image. Sliding rather than re-centring keeps as much of the subject
   * as the edge allows. */
  const cx = sx + sw / 2;
  const cy = sy + sh / 2;
  let left = Math.round(cx - cw / 2);
  let top = Math.round(cy - ch / 2);
  left = Math.max(0, Math.min(left, W - Math.round(cw)));
  top = Math.max(0, Math.min(top, H - Math.round(ch)));

  const win = { left, top, width: Math.round(cw), height: Math.round(ch), from: 'faces' };

  /* Whether the shape could actually hold everyone.
   *
   * Three people spread across a 16:9 frame do not fit inside a square or
   * a 9:16 window at any position — the subject is simply wider than the
   * shape. The crop is still made, because somebody asked for a vertical
   * and needs one, but it must not pretend it kept the group.
   *
   * This is the specific failure the top of this file is about: a crop
   * that loses two of three people looks deliberate, so nothing about the
   * output reveals the mistake. Counting the faces left outside is what
   * lets a caller say "this crop leaves 2 people out" instead of shipping
   * a group photo of one person. */
  const lost = boxes.filter((b) => !(
    b.x * W >= win.left - 1 && (b.x + b.w) * W <= win.left + win.width + 1
    && b.y * H >= win.top - 1 && (b.y + b.h) * H <= win.top + win.height + 1
  )).length;

  return { ...win, faces: boxes.length, lost, fits: lost === 0 };
};

const isVariant = (v) => Object.prototype.hasOwnProperty.call(VARIANTS, v);

/**
 * The URL for one variant of one asset, generating it if this is the
 * first time anyone has asked.
 *
 * Returns null when a rendition is neither available nor makeable — the
 * caller then falls back to the original, which is always correct and
 * sometimes slow.
 */
const ensureRendition = async (asset, variant) => {
  if (!asset || !isVariant(variant)) return null;
  if (asset.kind !== 'image') return null;
  if (!asset.checksum) return null;

  /* Already made. A Mongoose Map when the document is hydrated and a plain
   * object when it arrived via .lean(); both shapes reach here. */
  const existing = asset.renditions instanceof Map
    ? asset.renditions.get(variant)
    : (asset.renditions || {})[variant];
  if (existing) return urlFor(existing);

  const sharp = getSharp();
  if (!sharp) return null;

  const spec = VARIANTS[variant];

  /* A scaled variant of an image already smaller than the target is not
   * worth a second copy: re-encoding spends storage to produce a file no
   * smaller and slightly worse. A CROPPED variant is a different shape, so
   * it is worth making at any size. */
  if (!spec.ratio && asset.width && asset.width <= spec.width) return null;

  let buffer;
  try {
    const res = await fetch(asset.url);
    if (!res.ok) throw new Error(`source responded ${res.status}`);
    buffer = Buffer.from(await res.arrayBuffer());
  } catch (err) {
    logger.warn(`rendition ${variant} for ${asset._id}: source unreadable — ${err.message}`);
    return null;
  }

  let out;
  let how = 'scaled';
  let lostFaces = 0;
  try {
    /* EXIF orientation is applied FIRST and the result re-measured, because
     * a portrait shot on a phone is stored landscape with a rotate flag —
     * and every crop rectangle below is computed against width and height
     * as a person sees them, not as the file stores them. Cropping before
     * rotating cuts the wrong part of the picture. */
    const upright = sharp(buffer).rotate();
    const meta = await upright.metadata();

    let pipeline = sharp(await upright.toBuffer());

    if (spec.ratio) {
      /* Explicit fields, not a spread.
       *
       * `asset` is a Mongoose document, and {...doc} copies its internals
       * ($__, _doc, isNew) rather than its schema fields — so taggedPeople
       * arrived undefined, cropWindow returned null, and every crop
       * quietly used saliency while appearing to work. The only symptom
       * was a log line reading "cropped by saliency" on an asset that
       * plainly had faces tagged.
       *
       * Dimensions come from `meta` rather than the stored width/height,
       * because EXIF rotation has already been applied above. */
      const window = cropWindow({
        width: meta.width,
        height: meta.height,
        taggedPeople: asset.taggedPeople || [],
      }, spec.ratio);
      /* The output box, bounded by what the source can actually supply.
       *
       * `withoutEnlargement` cannot be used here and that is the whole
       * subtlety: combined with fit:'cover' it makes sharp abandon the
       * target box rather than scale up, so a small source comes back at
       * its original dimensions and the requested SHAPE is silently not
       * applied. A 200x200 avatar asked for 9:16 came back 200x200.
       *
       * The shape is the one thing a caller cannot fix afterwards without
       * the original, so it is honoured at whatever size the source
       * allows. Size is negotiable; ratio is not. */
      const capW = Math.min(spec.width, meta.width, Math.round(meta.height * spec.ratio));
      const outW = Math.max(1, capW);
      const outH = Math.max(1, Math.round(outW / spec.ratio));

      if (window) {
        how = window.fits
          ? `cropped to ${window.faces} tagged face${window.faces === 1 ? '' : 's'}`
          : `cropped to faces — ${window.lost} of ${window.faces} left outside `
            + '(the group is wider than this shape)';
        lostFaces = window.lost;
        pipeline = pipeline.extract(window).resize({ width: outW, height: outH, fit: 'fill' });
      } else {
        /* Nobody has said where to look. libvips picks the most salient
         * region, which is good on one subject and a guess on a group. */
        how = 'cropped by saliency';
        pipeline = pipeline.resize({
          width: outW,
          height: outH,
          fit: 'cover',
          position: sharp.strategy.attention,
        });
      }
    } else {
      pipeline = pipeline.resize({ width: spec.width, withoutEnlargement: true, fit: 'inside' });
    }

    out = await pipeline.jpeg({ quality: spec.quality, mozjpeg: true }).toBuffer();
  } catch (err) {
    /* A file sharp cannot decode is still a perfectly good file — the same
     * rule mediaProbe follows. It simply has no rendition. */
    logger.warn(`rendition ${variant} for ${asset._id}: ${err.message}`);
    return null;
  }

  const { key } = await putBuffer(out, {
    folder: `caspian/rend/${asset.checksum}`,
    originalName: `${variant}.jpg`,
    contentType: 'image/jpeg',
  });

  /* Written to every row sharing these bytes, not just this one. The work
   * is already done; making a duplicate regenerate it would waste the
   * saving that keying on checksum exists to produce. */
  const patch = { [`renditions.${variant}`]: key };
  /* Stored, not just logged. A log line is read by nobody at the moment
   * somebody is choosing a crop for a client. */
  if (lostFaces > 0) patch[`renditionWarnings.${variant}`] = `${lostFaces} tagged face(s) fall outside this crop`;
  await MediaAsset.updateMany({ checksum: asset.checksum }, { $set: patch });

  logger.info(
    `rendition ${variant} ${asset.checksum.slice(0, 10)} ${how} · `
    + `${buffer.length} -> ${out.length} bytes`,
  );
  return urlFor(key);
};

/** What a projection should show, without generating anything. */
const renditionUrls = (doc) => {
  const r = doc.renditions instanceof Map
    ? Object.fromEntries(doc.renditions)
    : (doc.renditions || {});
  const warnings = doc.renditionWarnings instanceof Map
    ? Object.fromEntries(doc.renditionWarnings)
    : (doc.renditionWarnings || {});
  return {
    thumbUrl: r.thumb ? urlFor(r.thumb) : null,
    previewUrl: r.preview ? urlFor(r.preview) : null,
    /* Every shape that has been made, by name, each with whatever the
     * crop had to give up. Absent until somebody asks for one — the crops
     * are generated on request like the sizes. */
    crops: Object.keys(VARIANTS)
      .filter((v) => VARIANTS[v].ratio && r[v])
      .reduce((acc, v) => ({
        ...acc,
        [v]: { url: urlFor(r[v]), warning: warnings[v] || null },
      }), {}),
  };
};

/* cropWindow is exported for its own sake: it is pure geometry, it is the
 * part of this file most likely to be wrong, and a rectangle is far easier
 * to assert on than a JPEG. */
module.exports = { ensureRendition, renditionUrls, cropWindow, VARIANTS, isVariant };
