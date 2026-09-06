/**
 * Where Caspian's bytes go.
 *
 * One interface, two drivers. `mediaIngest` asks for a buffer to be
 * stored and gets back a key and a URL; whether that landed in S3 or on
 * this machine's disk is not its business.
 *
 * WHY THIS EXISTS
 *
 * Ingest used to call putBufferToS3 directly, which meant that adding a
 * file — anywhere, by anyone, including a developer testing a drag-and-
 * drop on their laptop — required live AWS credentials and wrote into the
 * production bucket. There was no way to build the upload half of this
 * system without either putting test files in the real library or not
 * building it at all.
 *
 * It also makes defect D4 tractable. "Make the bytes private" is a change
 * to one driver here, not an edit scattered across five ACL call sites
 * that each serve a different consumer.
 *
 * DRIVER SELECTION
 *
 * Explicit MEDIA_STORAGE_DRIVER wins. Otherwise: S3 when AWS credentials
 * are present, local disk when they are not. That default is deliberate —
 * a machine with no credentials cannot reach the bucket anyway, so the
 * choice is between working locally and failing, and the failure would be
 * an opaque one from deep inside the SDK.
 *
 * The local driver refuses to run in production. It stores files on one
 * machine's disk, which behind a load balancer means an asset that exists
 * on whichever server received it and 404s everywhere else — a failure
 * that looks like corruption and is nearly impossible to read from the
 * symptoms. Better to refuse at boot.
 */
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const { putBufferToS3, deleteFromS3, buildS3Url } = require('../utils/s3Upload');
const logger = require('../utils/logger');

/** Same shape the S3 helper produces, so a key means one thing everywhere. */
const buildKey = (folder, originalName) => {
  const safe = String(originalName || 'file').replace(/[^A-Za-z0-9_\-.]/g, '_');
  return `${folder}/${Date.now()}_${Math.round(Math.random() * 1e6)}_${safe}`;
};

const hasAwsCredentials = () => Boolean(
  process.env.AWS_ACCESS_KEY_ID
  && process.env.AWS_SECRET_ACCESS_KEY
  && process.env.AWS_BUCKET,
);

const driverName = () => {
  const explicit = String(process.env.MEDIA_STORAGE_DRIVER || '').trim().toLowerCase();
  if (explicit === 's3' || explicit === 'local') return explicit;
  return hasAwsCredentials() ? 's3' : 'local';
};

/* Everything the local driver writes lives under one root, so a developer
 * can delete the whole thing without wondering what else is in there. */
const localRoot = () => path.resolve(
  process.env.MEDIA_LOCAL_ROOT || path.join(__dirname, '../../.media-local'),
);

/** The origin local URLs are built against. */
const localBase = () => String(
  process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`,
).replace(/\/+$/, '');

/** Public path prefix the API serves the local store from. */
const LOCAL_ROUTE = '/local-media';

/* A key is `folder/name` and is joined onto the store root, so it is a
 * path traversal waiting to happen the first time one arrives from a
 * request rather than from buildKey. Resolve and confirm containment. */
const resolveLocal = (key) => {
  const root = localRoot();
  const full = path.resolve(root, String(key || ''));
  if (full !== root && !full.startsWith(`${root}${path.sep}`)) {
    throw new Error('Refusing a storage key that escapes the media root');
  }
  return full;
};

const localDriver = {
  name: 'local',
  async put(buffer, { folder, originalName, contentType }) {
    const key = buildKey(folder || 'uploads/files', originalName);
    const full = resolveLocal(key);
    await fsp.mkdir(path.dirname(full), { recursive: true });
    await fsp.writeFile(full, buffer);
    /* contentType is not stored: the extension carries it, and the static
     * middleware serving this store infers the same thing. Keeping a
     * sidecar of MIME types would be a second source of truth for a fact
     * the filename already holds. */
    void contentType;
    return { key, url: `${localBase()}${LOCAL_ROUTE}/${key}`, driver: 'local' };
  },
  async remove(key) {
    /* Containment is checked OUTSIDE the try, so a key that escapes the
     * root throws instead of being folded into the same warning as a
     * missing file. Those are different events: one is a tidy-up that
     * found nothing, the other is a key that should not exist, and
     * hearing them at the same volume is how the second goes unnoticed. */
    const full = resolveLocal(key);
    try {
      await fsp.unlink(full);
    } catch (err) {
      if (err.code !== 'ENOENT') logger.warn(`local media delete failed: ${err.message}`);
    }
  },
  url(key) {
    if (!key) return '';
    if (/^https?:\/\//i.test(key)) return key;
    return `${localBase()}${LOCAL_ROUTE}/${key}`;
  },
  /* An absolute path the route can hand to res.download(), which sets
   * Content-Disposition for us and streams rather than buffering. */
  localPath: (key) => resolveLocal(key),
};

const s3Driver = {
  name: 's3',
  /* No local path exists for an S3 object; the route redirects instead. */
  localPath: () => null,
  async put(buffer, opts) {
    const { key, url } = await putBufferToS3(buffer, opts);
    return { key, url, driver: 's3' };
  },
  remove: (key) => deleteFromS3(key),
  url: (key) => buildS3Url(key),
};

const driver = () => (driverName() === 'local' ? localDriver : s3Driver);

/**
 * Store a buffer. Returns { key, url, driver }.
 *
 * The signature matches putBufferToS3 so ingest reads the same either
 * way, and so this can be swapped in without touching the call site's
 * shape.
 */
const putBuffer = (buffer, opts = {}) => driver().put(buffer, opts);

/** Remove one stored object. Never throws — a failed cleanup is a log line. */
const removeObject = (key) => driver().remove(key);

/** The public URL for a stored key, under whichever driver is active. */
const urlFor = (key) => driver().url(key);

/**
 * How a download route should serve one object.
 *
 * `{ mode: 'file', path }`      stream it from disk (local driver)
 * `{ mode: 'redirect', url }`   send the caller to the object (s3 driver)
 *
 * The S3 arm redirects to the plain public URL today, which is only
 * acceptable because those objects ARE public (defect D4). When the
 * caspian/ prefix goes private this becomes a presigned GET with a short
 * expiry and ResponseContentDisposition — one function, one change, and
 * every caller of this route keeps working. Proxying the bytes through
 * the API is the option NOT taken: a 500 MB video through a shared
 * aaPanel VPS is a bad trade for a filename. */
const downloadTarget = (key, storedUrl = '') => {
  const d = driver();
  /* Not named `path` — that shadows the required node:path module in this
   * scope, which works only for as long as nobody adds a line here that
   * needs it. */
  const filePath = d.localPath(key);

  /* The local path is an optimisation, not the truth. The truth is the URL
   * stored on the row: an asset uploaded before this driver existed, or
   * migrated in, or seeded, has bytes that live somewhere this driver does
   * not own — and handing res.download a path with no file behind it
   * produces a bare 404 that reads as "the asset is gone" rather than
   * "this machine does not have a copy".
   *
   * So: serve from disk when the file is actually there, otherwise fall
   * back to wherever the row says the bytes are. */
  if (filePath && fs.existsSync(filePath)) return { mode: 'file', path: filePath };
  const url = (storedUrl && /^https?:\/\//i.test(storedUrl)) ? storedUrl : d.url(key);
  return url ? { mode: 'redirect', url } : { mode: 'missing' };
};

/**
 * Called once at boot. Reports the choice, and refuses the combination
 * that would be silently wrong.
 */
const initMediaStorage = () => {
  const name = driverName();
  if (name === 'local' && process.env.NODE_ENV === 'production') {
    throw new Error(
      'MEDIA_STORAGE_DRIVER resolved to "local" in production. The local store '
      + 'lives on one machine\'s disk and cannot be served by another, so assets '
      + 'would exist on whichever server received them and 404 everywhere else. '
      + 'Set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_BUCKET, or set '
      + 'MEDIA_STORAGE_DRIVER=s3 explicitly if that is really what you want.',
    );
  }
  if (name === 'local') {
    fs.mkdirSync(localRoot(), { recursive: true });
    logger.info(`Media storage: local disk at ${localRoot()} (served from ${LOCAL_ROUTE})`);
  } else {
    logger.info(`Media storage: S3 bucket ${process.env.AWS_BUCKET}`);
  }
  return name;
};

module.exports = {
  putBuffer,
  removeObject,
  urlFor,
  downloadTarget,
  initMediaStorage,
  driverName,
  localRoot,
  LOCAL_ROUTE,
};
