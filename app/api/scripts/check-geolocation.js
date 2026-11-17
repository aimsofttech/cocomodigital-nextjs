'use strict';

/**
 * Diagnose booking location capture on THIS machine (run it on the server).
 *
 * Checks, in order:
 *   1. the runtime has what the lookup needs (fetch, AbortSignal.timeout)
 *   2. each geolocation provider answers from this server's network
 *   3. the full lookup the booking flow uses
 *   4. the userLocation stored on the 5 most recent meetings (read-only)
 *
 * Run (from app/api):
 *   node scripts/check-geolocation.js              # tests with 8.8.8.8
 *   node scripts/check-geolocation.js 49.36.10.20  # tests with your own IP
 */

require('dotenv').config();

const ip = process.argv[2] || '8.8.8.8';

(async () => {
  console.log(`Node ${process.version}`);
  const hasFetch = typeof fetch === 'function';
  const hasTimeout = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function';
  console.log(`fetch: ${hasFetch ? 'ok' : 'MISSING (needs Node 18+)'}   AbortSignal.timeout: ${hasTimeout ? 'ok' : 'MISSING (needs Node 18+)'}`);
  console.log(`GEOIP_PROVIDER=${process.env.GEOIP_PROVIDER || '(unset → on)'}   IPINFO_TOKEN=${process.env.IPINFO_TOKEN ? 'set' : '(unset → keyless tier)'}`);
  if (!hasFetch || !hasTimeout) process.exit(1);

  console.log(`\nProviders, looking up ${ip}:`);
  const probes = [
    ['ipinfo', `https://ipinfo.io/${ip}/json${process.env.IPINFO_TOKEN ? `?token=${process.env.IPINFO_TOKEN}` : ''}`],
    ['ipwhois', `https://ipwho.is/${ip}?fields=success,message,city,country`],
  ];
  for (const [name, url] of probes) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const text = (await res.text()).replace(/\s+/g, ' ').slice(0, 200);
      console.log(`  ${name.padEnd(8)} HTTP ${res.status}  ${text}`);
    } catch (err) {
      console.log(`  ${name.padEnd(8)} FAILED  ${err.name === 'TimeoutError' ? 'timed out' : err.message}`);
    }
  }

  const { lookupLocation } = require('../src/services/geoLocation');
  const loc = await lookupLocation(ip);
  console.log(`\nBooking-flow lookup: ${loc ? JSON.stringify(loc) : 'NO LOCATION (see warnings above)'}`);

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) return;
  const mongoose = require('mongoose');
  await mongoose.connect(uri);
  const recent = await mongoose.connection.db.collection('meetings')
    .find({}, { projection: { userName: 1, createdAt: 1, userLocation: 1 } })
    .sort({ createdAt: -1 }).limit(5).toArray();
  console.log('\nLatest meetings:');
  for (const m of recent) {
    const l = m.userLocation;
    const where = l === undefined ? 'NO userLocation KEY (API running old code?)'
      : (l.city || l.country) ? `${l.city}, ${l.country} (${l.source})` : 'empty';
    console.log(`  ${m.createdAt ? m.createdAt.toISOString() : '?'}  ${m.userName}  →  ${where}`);
  }
  await mongoose.disconnect();
})().catch((err) => {
  console.error('Check failed:', err.message);
  process.exit(1);
});
