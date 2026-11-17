'use strict';

/**
 * IP → city/country lookup for meeting bookings.
 *
 * Location is a convenience for the admin ("who is this lead, roughly where
 * are they?"), never a requirement: every failure path here — no usable IP, a
 * private/loopback address, a timeout, a rate limit, a malformed response —
 * resolves to null and is at most logged. Nothing in this module throws.
 *
 * Provider: ipinfo.io. It answers over HTTPS without a key (free tier, rate
 * limited); set IPINFO_TOKEN for the higher quota. IP geolocation is reliable
 * at country level and approximate at city level (mobile carriers and VPNs
 * often resolve to a hub city), so treat the city as a hint.
 *
 * Optional .env:
 *   GEOIP_PROVIDER     'ipinfo' (default) | 'none' to switch lookups off
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

const lookupIpinfo = async (ip, timeoutMs) => {
  const token = process.env.IPINFO_TOKEN;
  const url = `https://ipinfo.io/${encodeURIComponent(ip)}/json${token ? `?token=${encodeURIComponent(token)}` : ''}`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    logger.warn(`Geolocation lookup failed: ipinfo responded ${res.status}`);
    return null;
  }

  const body = await res.json().catch(() => null);
  if (!body || typeof body !== 'object' || body.bogon) return null;

  const countryCode = cleanField(body.country);
  const validCode = countryCode && /^[A-Z]{2}$/.test(countryCode) ? countryCode : null;
  const city = cleanField(body.city);
  if (!city && !validCode) return null;

  return {
    city,
    region: cleanField(body.region),
    country: countryNameOf(validCode) || validCode,
    countryCode: validCode,
    source: 'ipinfo',
  };
};

/**
 * Resolve an IP to { city, region, country, countryCode, source, capturedAt },
 * or null when it can't be (disabled, private IP, provider error/timeout).
 */
const lookupLocation = async (rawIp) => {
  if ((process.env.GEOIP_PROVIDER || '').toLowerCase() === 'none') return null;

  const ip = publicIpOrNull(rawIp);
  if (!ip) return null;

  const timeoutMs = Number(process.env.GEOIP_TIMEOUT_MS) > 0
    ? Number(process.env.GEOIP_TIMEOUT_MS)
    : DEFAULT_TIMEOUT_MS;

  try {
    const loc = await lookupIpinfo(ip, timeoutMs);
    return loc ? { ...loc, capturedAt: new Date() } : null;
  } catch (err) {
    logger.warn(`Geolocation lookup failed: ${err.name === 'TimeoutError' ? 'timed out' : err.message}`);
    return null;
  }
};

module.exports = { lookupLocation, publicIpOrNull };
