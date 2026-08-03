'use strict';

/**
 * Where the CRM API is reachable from the public internet.
 *
 * Twilio (and Meta) call us back over the internet, so every callback URL has to
 * be built from the *externally visible* origin and path — not from how the app
 * happens to be mounted locally.
 *
 * These can differ. On cocomadigital.com the reverse proxy forwards `/api/*` to
 * this Express app but hands `/crm/*` to the Next.js site, so the local mount
 * `/crm/api` is not publicly reachable while `/api/crm` is. CRM_PUBLIC_PATH
 * lets the callback URLs point at whichever prefix the proxy actually forwards,
 * without touching the proxy config.
 *
 * The signature check in middleware/twilioSignature rebuilds the signed URL as
 * API_PUBLIC_URL + req.originalUrl, so whatever path Twilio calls must arrive at
 * Express unchanged. That holds for a plain pass-through proxy; if yours strips
 * a prefix, mount the CRM under the un-stripped path instead of rewriting here.
 */

/** Public origin, no trailing slash. Empty when unconfigured. */
const base = () => (process.env.API_PUBLIC_URL || '').replace(/\/+$/, '');

const clean = (p) => {
  let out = String(p || '').trim();
  if (!out) return '';
  if (!out.startsWith('/')) out = `/${out}`;
  return out.replace(/\/+$/, '');
};

/** The default mount, and the fallback when CRM_PUBLIC_PATH is unset. */
const LOCAL_MOUNT = '/crm/api';

/** Public path prefix the CRM API answers on, e.g. '/crm/api' or '/api/crm'. */
const publicPath = () => clean(process.env.CRM_PUBLIC_PATH) || LOCAL_MOUNT;

/**
 * Every path the CRM router should be mounted at. The local mount is always
 * included so existing links and local development keep working when
 * CRM_PUBLIC_PATH points somewhere else.
 */
const mountPaths = () => [...new Set([LOCAL_MOUNT, publicPath()])];

/**
 * Absolute public URL for a CRM path.
 * @param {string} suffix path below the CRM mount, e.g. '/webhooks/twilio/call-status'
 */
const crmUrl = (suffix) => `${base()}${publicPath()}${clean(suffix)}`;

module.exports = { base, publicPath, mountPaths, crmUrl, LOCAL_MOUNT };
