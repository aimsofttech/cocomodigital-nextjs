const { S3Client, DeleteObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');

// AWS SDK v3 client — required by multer-s3 v3 (which calls s3.send(command)).
const s3 = new S3Client({
  region: process.env.AWS_DEFAULT_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// A stored media value that is a site-root-relative path — a file that ships
// inside the website's own /public folder rather than an uploaded object.
// S3 keys are stored without a leading slash (multer-s3 produces
// "folder/name.jpg"), so a leading slash is what tells the two apart.
const isSitePath = (value) => /^\//.test(String(value));

// Build a public URL from a stored value. Idempotent: a value that is already a
// full URL is returned untouched, while a bare S3 key is prefixed with AWS_URL.
// This lets the DB hold either legacy keys or new full URLs transparently.
//
// A site-relative path is returned untouched too. Prefixing one produced
// "<bucket>//Images/x.jpg" — a double-slashed URL for an object that was never
// in the bucket, and because admin forms round-trip whatever the API hands
// them, saving the record then wrote that dead URL back over a perfectly good
// path. Modules whose media can be either an upload or a shipped site asset
// (the podcast page is the first) depend on this.
const buildS3Url = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (isSitePath(value)) return value;
  return `${process.env.AWS_URL}/${value}`;
};

// Extract the S3 object key from a stored value that may be a full URL or a key.
const s3KeyFromValue = (value) => {
  if (!value) return '';
  let v = String(value).trim();
  const base = (process.env.AWS_URL || '').replace(/\/+$/, '');
  if (base && v.startsWith(base)) v = v.slice(base.length);
  // Strip any other absolute origin (e.g. CDN) down to the path.
  else if (/^https?:\/\//i.test(v)) v = v.replace(/^https?:\/\/[^/]+/i, '');
  return v.replace(/^\/+/, '');
};

// Media type configuration: allowed extensions/mimetypes and per-type size caps.
const MEDIA_CONFIG = {
  image: {
    folder: 'uploads/images',
    extensions: /^(jpe?g|png|gif|webp|svg|avif|bmp)$/i,
    mimetypes: /^image\//i,
    maxSize: 15 * 1024 * 1024, // 15 MB
    label: 'image',
  },
  video: {
    folder: 'uploads/videos',
    extensions: /^(mp4|mov|webm|avi|mkv|m4v|ogv)$/i,
    mimetypes: /^video\//i,
    maxSize: 500 * 1024 * 1024, // 500 MB
    label: 'video',
  },
};

const buildKey = (folder, originalname) => {
  const safeName = originalname.replace(/[^A-Za-z0-9_\-.]/g, '_');
  return `${folder}/${Date.now()}_${Math.round(Math.random() * 1e6)}_${safeName}`;
};

// Generic streamed-to-S3 multer instance (used by legacy per-route uploads).
const createS3Upload = (folder) =>
  multer({
    storage: multerS3({
      s3,
      bucket: process.env.AWS_BUCKET,
      acl: 'public-read',
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (req, file, cb) => cb(null, buildKey(folder, file.originalname)),
    }),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|avi|pdf|csv|xlsx|xls|docx?/;
      const ext = allowed.test(path.extname(file.originalname).toLowerCase());
      const mime = allowed.test(file.mimetype);
      if (ext || mime) cb(null, true);
      else cb(new Error('File type not allowed'));
    },
  });

// Media-type-aware uploader. Streams directly to S3 (memory-safe for large files),
// validates against the type's allowed extensions/mimetypes and size cap.
const createMediaUpload = (type, folder) => {
  const cfg = MEDIA_CONFIG[type];
  if (!cfg) throw new Error(`Unknown media type: ${type}`);
  const targetFolder = folder || cfg.folder;
  return multer({
    storage: multerS3({
      s3,
      bucket: process.env.AWS_BUCKET,
      acl: 'public-read',
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (req, file, cb) => {
        // Optional ?folder= override lets each module organise its own media.
        const override = req.query && req.query.folder
          ? String(req.query.folder).replace(/[^A-Za-z0-9/_-]/g, '')
          : '';
        cb(null, buildKey(override || targetFolder, file.originalname));
      },
    }),
    limits: { fileSize: cfg.maxSize },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
      const okExt = cfg.extensions.test(ext);
      const okMime = cfg.mimetypes.test(file.mimetype);
      if (okExt && okMime) return cb(null, true);
      cb(new Error(`Invalid ${cfg.label} file. Allowed: ${cfg.extensions.source}`));
    },
  });
};

const uploadYoutubeThumbnailToS3 = async (thumbnailUrl, baseName, folder = 'youtube_thumbnails') => {
  if (!thumbnailUrl || !baseName) return null;
  try {
    const https = require('https');
    const http = require('http');
    const client = thumbnailUrl.startsWith('https') ? https : http;

    const buffer = await new Promise((resolve, reject) => {
      client.get(thumbnailUrl, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      });
    });

    const safeName = baseName.replace(/[^A-Za-z0-9_\-\.]/g, '_');
    const filename = `${Date.now()}_${safeName}.jpg`;
    const key = `${folder}/${filename}`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
      ACL: 'public-read',
    }));

    return key;
  } catch (err) {
    console.error('YouTube thumbnail S3 upload failed:', err.message);
    return null;
  }
};

// Delete an object from S3. Accepts either a bare key or a full URL.
const deleteFromS3 = async (value) => {
  // Never aim a delete at a file that ships with the website: it is not in the
  // bucket, and a key derived from it could collide with a real object.
  if (isSitePath(value)) return;
  const key = s3KeyFromValue(value);
  if (!key) return;
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_BUCKET, Key: key }));
  } catch (err) {
    console.error('S3 delete failed:', err.message);
  }
};

// Delete many objects (keys or URLs). Best-effort; never throws.
const deleteManyFromS3 = async (values = []) => {
  await Promise.all((values || []).filter(Boolean).map((v) => deleteFromS3(v)));
};

const getYoutubeVideoId = (url) => {
  if (!url) return null;
  if (/youtube\.com\/shorts\/([A-Za-z0-9_-]+)/i.test(url)) {
    return url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]+)/i)[1];
  }
  const pattern = /(?:youtube(?:-nocookie)?\.com\/(?:[^/]+\/.+\/|(?:v|embed)\/|.*[?&]v=)|youtu\.be\/)([^"&?/ ]{11})/i;
  const match = url.match(pattern);
  return match ? match[1] : null;
};

module.exports = {
  createS3Upload,
  createMediaUpload,
  buildS3Url,
  isSitePath,
  s3KeyFromValue,
  uploadYoutubeThumbnailToS3,
  deleteFromS3,
  deleteManyFromS3,
  getYoutubeVideoId,
  MEDIA_CONFIG,
  s3,
};
