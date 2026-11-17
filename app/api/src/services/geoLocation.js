'use strict';

/**
 * IP → city/country lookup for meeting bookings.
 *
 * Location is a convenience for the admin ("who is this lead, roughly where
 * are they?"), never a requirement: every failure path here — no usable IP, a
 * private/loopback address, a timeout, a rate limit, a malformed response —
 * resolves to null and is at most logged. Nothing in this module throws.
 *
 * Providers: ipinfo.io first (HTTPS, works without a key but rate limited; set
 * IPINFO_TOKEN for the higher quota), then ipwho.is as a keyless fallback.
 * Diagnose from the server with: node scripts/check-geolocation.js
 * IP geolocation is reliable
 * at country level and approximate at city level (mobile carriers and VPNs
 * often resolve to a hub city), so treat the city as a hint.
 *
 * Optional .env:
 *   GEOIP_PROVIDER     'none' switches lookups off (anything else: on)
 *   IPINFO_TOKEN       ipinfo.io access token
 *   GEOIP_TIMEOUT_MS   per-lookup timeout (default 3000)
 */

const net = require('net');
const logger = require('../utils/logger');

const DEFAULT_TIMEOUT_MS = 3000;

/** Longest string we will store from the provider for any one field. */
const MAX_FIELD_LEN = 100;

const countryNames = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    return null;
  }
})();

/** Strip an IPv4-mapped IPv6 prefix ("::ffff:1.2.3.4" → "1.2.3.4"). */
const normalizeIp = (raw) => {
  if (typeof raw !== 'string') return null;
  let ip = raw.trim();
  if (ip.toLowerCase().startsWith('::ffff:') && net.isIPv4(ip.slice(7))) ip = ip.slice(7);
  return net.isIP(ip) ? ip : null;
};

/**
 * True for addresses that can never be geolocated: loopback, private ranges,
 * link-local, CGNAT, unspecified, and their IPv6 equivalents. Looking these up
 * would only waste a request (and, in local dev, every booking is one).
 */
const isPrivateIp = (ip) => {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10
      || a === 127
      || a === 0
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 100 && b >= 64 && b <= 127);
  }
  const v6 = ip.toLowerCase();
  return v6 === '::1'
    || v6 === '::'
    || v6.startsWith('fc') || v6.startsWith('fd') // unique local
    || v6.startsWith('fe80');                      // link-local
};

/** Returns a valid public IP, or null. */
const publicIpOrNull = (raw) => {
  const ip = normalizeIp(raw);
  return ip && !isPrivateIp(ip) ? ip : null;
};

const cleanField = (value) => {
  if (typeof value !== 'string') return null;
  const v = value.trim().slice(0, MAX_FIELD_LEN);
  return v || null;
};

const countryNameOf = (code) => {
  if (!code || !countryNames) return null;
  try {
    const name = countryNames.of(code);
    return name && name !== code ? name : null;
  } catch {
    return null;
  }
};

/** GET a provider URL as JSON; throws with a readable reason on any failure. */
const getJson = async (url, timeoutMs) => {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json().catch(() => null);
  if (!body || typeof body !== 'object') throw new Error('invalid JSON response');
  return body;
};

/** Shape a provider's answer, or throw when it carries no usable location. */
const toLocation = ({ city, region, countryCode }, source) => {
  const code = cleanField(countryCode);
  const validCode = code && /^[A-Z]{2}$/.test(code) ? code : null;
  const cleanCity = cleanField(city);
  if (!cleanCity && !validCode) throw new Error('no city or country in response');
  return {
    city: cleanCity,
    region: cleanField(region),
    country: countryNameOf(validCode) || validCode,
    countryCode: validCode,
    source,
  };
};

/* Tried in order; the first answer wins. ipinfo is primary. ipwho.is is a
   keyless fallback, so a rate limit or block on one service (common for
   requests from hosting/VPS addresses) doesn't leave the location empty. */
const PROVIDERS = [
  {
    name: 'ipinfo',
    lookup: async (ip, timeoutMs) => {
      const token = process.env.IPINFO_TOKEN;
      const body = await getJson(
        `https://ipinfo.io/${encodeURIComponent(ip)}/json${token ? `?token=${encodeURIComponent(token)}` : ''}`,
        timeoutMs,
      );
      if (body.bogon) throw new Error('not a public IP');
      return toLocation({ city: body.city, region: body.region, countryCode: body.country }, 'ipinfo');
    },
  },
  {
    name: 'ipwhois',
    lookup: async (ip, timeoutMs) => {
      const body = await getJson(
        `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,message,city,region,country_code`,
        timeoutMs,
      );
      if (body.success === false) throw new Error(body.message || 'lookup refused');
      return toLocation({ city: body.city, region: body.region, countryCode: body.country_code }, 'ipwhois');
    },
  },
];

const reasonOf = (err) => (err && err.name === 'TimeoutError' ? 'timed out' : (err && err.message) || String(err));

/**
 * Resolve an IP to { city, region, country, countryCode, source, capturedAt },
 * or null when it can't be (disabled, private IP, every provider failed).
 * Each provider failure is logged with its reason.
 */
const lookupLocation = async (rawIp) => {
  if ((process.env.GEOIP_PROVIDER || '').toLowerCase() === 'none') return null;

  const ip = publicIpOrNull(rawIp);
  if (!ip) return null;

  const timeoutMs = Number(process.env.GEOIP_TIMEOUT_MS) > 0
    ? Number(process.env.GEOIP_TIMEOUT_MS)
    : DEFAULT_TIMEOUT_MS;

  for (const provider of PROVIDERS) {
    try {
      const loc = await provider.lookup(ip, timeoutMs);
      return { ...loc, capturedAt: new Date() };
    } catch (err) {
      logger.warn(`Geolocation lookup via ${provider.name} failed for ${ip}: ${reasonOf(err)}`);
    }
  }
  return null;
};

module.exports = { lookupLocation, publicIpOrNull };
