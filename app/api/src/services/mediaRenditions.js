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
  thumb: { width: 480, quality: 72 },
  preview: { width: 1400, quality: 80 },
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

  /* An image already smaller than the target is not worth a second copy:
   * re-encoding it would spend storage to produce a file no smaller and
   * very slightly worse. */
  if (asset.width && asset.width <= spec.width) return null;

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
  try {
    out = await sharp(buffer)
      .rotate() // honour EXIF orientation, or portraits come out sideways
      .resize({ width: spec.width, withoutEnlargement: true, fit: 'inside' })
      .jpeg({ quality: spec.quality, mozjpeg: true })
      .toBuffer();
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
  await MediaAsset.updateMany(
    { checksum: asset.checksum },
    { $set: { [`renditions.${variant}`]: key } },
  );

  logger.info(
    `rendition ${variant} ${asset.checksum.slice(0, 10)} `
    + `${buffer.length} -> ${out.length} bytes (${Math.round((1 - out.length / buffer.length) * 100)}% smaller)`,
  );
  return urlFor(key);
};

/** What a projection should show, without generating anything. */
const renditionUrls = (doc) => {
  const r = doc.renditions instanceof Map
    ? Object.fromEntries(doc.renditions)
    : (doc.renditions || {});
  return {
    thumbUrl: r.thumb ? urlFor(r.thumb) : null,
    previewUrl: r.preview ? urlFor(r.preview) : null,
  };
};

module.exports = { ensureRendition, renditionUrls, VARIANTS, isVariant };
