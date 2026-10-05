// Media values are stored as S3 keys ("folder/file.ext"); older records and
// external media (YouTube etc.) hold full URLs. This turns any of them into
// something the browser can load.
const S3_URL = (import.meta as any).env?.VITE_AWS_URL || '';
const API_URL = (import.meta as any).env?.VITE_API_URL || '';

/**
 * Absolute URL for a stored media value.
 * - full URLs (http/https), blob: and data: URLs are returned untouched
 * - a site path ("/Images/x.jpg") is resolved against `sitePathBase` when given
 * - anything else is an S3 key and is prefixed with VITE_AWS_URL
 */
export function resolveMediaUrl(value?: string | null, opts: { sitePathBase?: string } = {}): string {
  if (!value) return '';
  if (/^(https?:|blob:|data:)/i.test(value)) return value;
  if (value.startsWith('/') && opts.sitePathBase) return `${opts.sitePathBase}${value}`;
  const base = S3_URL || API_URL;
  return `${base}/${value}`.replace(/([^:]\/)\/+/g, '$1');
}
