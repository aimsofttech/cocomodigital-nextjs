'use strict';

/**
 * Where the CRM API is reachable from the public internet.
 *
 * Twilio (and Meta) call us back over the internet, so every callback URL has to
 * be built from the *externally visible* origin and path — not from how the app
 * happens to be mounted locally.
 *
 * These can differ, which is the whole reason this file exists. On
 * cocomadigital.com Apache forwards BOTH `/api/*` and `/crm/api/*` here, so the
 * local mount `/crm/api` is publicly reachable and CRM_PUBLIC_PATH can simply
 * stay at its default. It previously
 * could not: `/crm/*` went to the Next.js site, and production had to be set to
 * `/api/crm` instead. Both mounts are kept alive by mountPaths() below, so
 * callbacks already registered in the Twilio/Meta consoles against `/api/crm`
 * keep working and need no re-pointing.
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
