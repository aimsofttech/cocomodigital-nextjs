const logger = require('./logger');

/**
 * Real dimensions, read out of the bytes.
 *
 * Everything here parses headers directly rather than adding an image
 * library, because the only thing we need is four numbers and `sharp`
 * is a native build that has to be recompiled on every deploy of a
 * shared aaPanel host.
 *
 * Two rules the callers depend on:
 *
 *  1. NOTHING here throws. A file whose header we cannot read is still a
 *     perfectly good file — it gets null dimensions and is stored anyway.
 *     Losing a photograph because we could not measure it would be an
 *     absurd trade.
 *
 *  2. Dimensions are taken from the file, never from what the client
 *     said. The upload form is the one place a wrong number gets baked
 *     into the library permanently.
 */

/* ------------------------------------------------------------------ images */

const pngSize = (b) => {
  if (b.length < 24) return null;
  if (b.readUInt32BE(0) !== 0x89504e47) return null;
  // IHDR is required to be the first chunk, so the offsets are fixed.
  if (b.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
};

const gifSize = (b) => {
  if (b.length < 10 || b.toString('ascii', 0, 3) !== 'GIF') return null;
  return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
};

const bmpSize = (b) => {
  if (b.length < 26 || b.toString('ascii', 0, 2) !== 'BM') return null;
  // Height is signed: a negative value means the rows are stored top-down.
  return { width: Math.abs(b.readInt32LE(18)), height: Math.abs(b.readInt32LE(22)) };
};

const webpSize = (b) => {
  if (b.length < 30) return null;
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const fourcc = b.toString('ascii', 12, 16);
  if (fourcc === 'VP8X') {
    return { width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1 };
  }
  if (fourcc === 'VP8 ') {
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
    return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  }
  if (fourcc === 'VP8L') {
    if (b[20] !== 0x2f) return null;
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
};

/**
 * EXIF orientation, so a phone photograph is not indexed as landscape.
 * A portrait shot off an iPhone is stored 4032x3024 with orientation 6;
 * without this the library records every portrait as a landscape and any
 * layout that picks images by aspect ratio picks the wrong ones.
 */
const jpegOrientation = (b) => {
  let i = 2;
  while (i + 4 < b.length) {
    if (b[i] !== 0xff) { i += 1; continue; }
    const marker = b[i + 1];
    if (marker === 0xda || marker === 0xd9) return 1;
    const len = b.readUInt16BE(i + 2);
    if (len < 2) return 1;
    if (marker === 0xe1 && b.toString('ascii', i + 4, i + 10) === 'Exif\0\0') {
      const tiff = i + 10;
      if (tiff + 8 > b.length) return 1;
      const le = b.toString('ascii', tiff, tiff + 2) === 'II';
      const u16 = (o) => (le ? b.readUInt16LE(o) : b.readUInt16BE(o));
      const u32 = (o) => (le ? b.readUInt32LE(o) : b.readUInt32BE(o));
      const ifd = tiff + u32(tiff + 4);
      if (ifd + 2 > b.length) return 1;
      const count = u16(ifd);
      for (let e = 0; e < count; e += 1) {
        const entry = ifd + 2 + e * 12;
        if (entry + 12 > b.length) break;
        if (u16(entry) === 0x0112) return u16(entry + 8) || 1;
      }
      return 1;
    }
    i += 2 + len;
  }
  return 1;
};

const jpegSize = (b) => {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    // Fill bytes of 0xFF between segments are legal, so resync rather than bail.
    if (b[i] !== 0xff) { i += 1; continue; }
    const marker = b[i + 1];
    if (marker === 0xff) { i += 1; continue; }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) { i += 2; continue; }
    if (marker === 0xda || marker === 0xd9) break; // entropy-coded data starts here
    const len = b.readUInt16BE(i + 2);
    if (len < 2) break;
    const isSof = marker >= 0xc0 && marker <= 0xcf
      && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      const height = b.readUInt16BE(i + 5);
      const width = b.readUInt16BE(i + 7);
      const orientation = jpegOrientation(b);
      return orientation >= 5 && orientation <= 8
        ? { width: height, height: width }
        : { width, height };
    }
    i += 2 + len;
  }
  return null;
};

/**
 * AVIF / HEIC. Both are ISO base media files and carry their size in an
 * `ispe` box; we scan for the box rather than walking the full property
 * tree because the tree costs fifty lines to reach the same four bytes.
 */
const isoImageSize = (b) => {
  const window = b.subarray(0, Math.min(b.length, 64 * 1024));
  const at = window.indexOf('ispe', 0, 'ascii');
  if (at < 0 || at + 16 > window.length) return null;
  const width = window.readUInt32BE(at + 8);
  const height = window.readUInt32BE(at + 12);
  if (!width || !height) return null;
  return { width, height };
};

/**
 * SVG has no pixel size at all, only a declared one. It matters here
 * because roughly 40% of this library is vector art, and a facet that
 * sorts by dimension would otherwise treat every logo as unmeasurable.
 */
const svgSize = (b) => {
  const head = b.toString('utf8', 0, Math.min(b.length, 4096));
  if (!/<svg[\s>]/i.test(head)) return null;
  const num = (attr) => {
    const m = head.match(new RegExp(`\\b${attr}\\s*=\\s*["']\\s*([0-9.]+)\\s*(px)?\\s*["']`, 'i'));
    return m ? Math.round(parseFloat(m[1])) : null;
  };
  const width = num('width');
  const height = num('height');
  if (width && height) return { width, height };
  const box = head.match(/viewBox\s*=\s*["']\s*[-0-9.]+[ ,]+[-0-9.]+[ ,]+([0-9.]+)[ ,]+([0-9.]+)/i);
  if (box) return { width: Math.round(parseFloat(box[1])), height: Math.round(parseFloat(box[2])) };
  return null;
};

const imageSize = (buffer) => {
  const parsers = [pngSize, jpegSize, gifSize, webpSize, bmpSize, isoImageSize, svgSize];
  for (const parse of parsers) {
    try {
      const size = parse(buffer);
      if (size && size.width > 0 && size.height > 0) return size;
    } catch (err) {
      // A truncated or hand-edited header reads off the end of the buffer.
      // That is a measurement failure, not an upload failure.
    }
  }
  return null;
};

/* ------------------------------------------------------------------- video */

/**
 * Walk the boxes of an ISO base media file (MP4, M4V, MOV).
 * Stops at the first inconsistent length rather than walking off into
 * the media data, which is where a malformed file would otherwise spin.
 */
const eachBox = (b, start, end, visit) => {
  let i = start;
  while (i + 8 <= end) {
    let size = b.readUInt32BE(i);
    let header = 8;
    if (size === 1) {
      if (i + 16 > end) return;
      size = b.readUInt32BE(i + 8) * 4294967296 + b.readUInt32BE(i + 12);
      header = 16;
    } else if (size === 0) {
      size = end - i;
    }
    if (size < header || i + size > end) return;
    visit(b.toString('ascii', i + 4, i + 8), i + header, i + size);
    i += size;
  }
};

const readTkhd = (b, s, e) => {
  const version = b[s];
  const after = version === 1 ? s + 36 : s + 24; // through the duration field
  const matrix = after + 16; // reserved(8) layer(2) alt-group(2) volume(2) reserved(2)
  if (matrix + 44 > e) return null;
  const a = b.readInt32BE(matrix);
  const bTerm = b.readInt32BE(matrix + 4);
  const c = b.readInt32BE(matrix + 12);
  const d = b.readInt32BE(matrix + 16);
  let width = Math.round(b.readUInt32BE(matrix + 36) / 65536);
  let height = Math.round(b.readUInt32BE(matrix + 40) / 65536);
  // A 90/270 rotation lives in the display matrix, not in the stored frame.
  // Phone video is shot rotated more often than not, so without this every
  // vertical clip is indexed as landscape.
  if (a === 0 && d === 0 && bTerm !== 0 && c !== 0) {
    const swap = width; width = height; height = swap;
  }
  if (!width || !height) return null;
  return { width, height };
};

const mp4Meta = (b) => {
  const out = { width: null, height: null, duration: null };
  let timescale = 0;
  let ticks = 0;
  let best = 0;

  eachBox(b, 0, b.length, (type, s, e) => {
    if (type !== 'moov') return;
    eachBox(b, s, e, (t2, s2, e2) => {
      if (t2 === 'mvhd') {
        const version = b[s2];
        if (version === 1) {
          timescale = b.readUInt32BE(s2 + 20);
          ticks = b.readUInt32BE(s2 + 24) * 4294967296 + b.readUInt32BE(s2 + 28);
        } else {
          timescale = b.readUInt32BE(s2 + 12);
          ticks = b.readUInt32BE(s2 + 16);
        }
      } else if (t2 === 'trak') {
        eachBox(b, s2, e2, (t3, s3, e3) => {
          if (t3 !== 'tkhd') return;
          const size = readTkhd(b, s3, e3);
          // Audio tracks carry 0x0; pick the largest visual track so a
          // thumbnail track cannot win over the actual picture.
          if (size && size.width * size.height > best) {
            best = size.width * size.height;
            out.width = size.width;
            out.height = size.height;
          }
        });
      }
    });
  });

  if (timescale > 0 && ticks > 0) out.duration = Number((ticks / timescale).toFixed(3));
  return out;
};

/**
 * Measure a file from its bytes. `kind` decides which parsers run; an
 * unreadable header returns nulls, which the schema already allows.
 *
 * Async because the callers already await it and because a future
 * container that needs a real decoder can be added here without changing
 * a single call site.
 *
 * WebM, MKV and AVI parse to nulls — the box walker above is ISO base
 * media only. That is deliberate rather than an omission: reading those
 * containers needs ffmpeg, ffmpeg is not installed on the API box, and an
 * upload path that depends on a binary the server does not have would
 * fail in production and pass on every laptop that tested it. Those
 * dimensions get filled in later by the poster run, which is where the
 * ffmpeg question already lives.
 */
const probe = async ({ buffer, kind, originalName }) => {
  const empty = { width: null, height: null, duration: null };
  if (!buffer || !buffer.length) return empty;

  if (kind === 'image') {
    const size = imageSize(buffer);
    return size ? { ...size, duration: null } : empty;
  }

  try {
    return { ...empty, ...mp4Meta(buffer) };
  } catch (err) {
    logger.warn(`mediaProbe: unreadable container for ${originalName}: ${err.message}`);
    return empty;
  }
};

module.exports = { probe, imageSize, mp4Meta };
