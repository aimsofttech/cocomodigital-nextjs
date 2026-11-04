// Tests for the WhatsApp agent gateway (/api/wa-agent).
//
// Same style as tests/meetingFlow.test.js: plain Node + assert, the real
// router mounted on a throwaway Express app, no test framework.
//
// Step 1 scope: key check and the health endpoint. No database needed yet;
// later steps add the booking/enquiry cases against a local MongoDB.
//
//   node tests/waAgent.test.js

const assert = require('assert');
const http = require('http');

// ── environment: the keys the router must accept ───────────────────────────
process.env.WA_AGENT_KEYS = ' testkey1, testkey2 ,,';
process.env.NODE_ENV = 'test';

// Logger writes to logs/*.log files and the console; keep the test output clean.
const path = require('path');
const logPath = require.resolve(path.join(__dirname, '../src/utils/logger'));
const logged = [];
require.cache[logPath] = {
  id: logPath, filename: logPath, loaded: true,
  exports: { info: (m) => logged.push(m), warn: (m) => logged.push(m), error: (m) => logged.push(m) },
};

require('express-async-errors');
const express = require('express');

const app = express();
app.use(express.json());
app.use('/api/wa-agent', require('../src/routes/api/waAgent'));
// The real app's shared error handler sits after every router. It must never
// see a gateway error; mounting it here proves that.
app.use(require('../src/middleware/errorHandler'));

let baseUrl;
const call = async (method, url, { key, body, rawHeaders } = {}) => {
  const headers = { 'content-type': 'application/json', ...(rawHeaders || {}) };
  if (key !== undefined) headers['x-agent-key'] = key;
  const res = await fetch(`${baseUrl}${url}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, json, text, contentType: res.headers.get('content-type') || '' };
};

const results = [];
const test = async (name, fn) => {
  try {
    await fn();
    results.push([true, name]);
    console.log(`  PASS  ${name}`);
  } catch (err) {
    results.push([false, name]);
    console.log(`  FAIL  ${name}\n        ${err.message}`);
  }
};

const UNAUTH = { ok: false, reason: 'unauthorized', message: 'Invalid or missing agent key.' };

(async () => {
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  console.log('\nwa-agent gateway — step 1: key check + health\n');

  await test('GET /health without a key → 401, bare unauthorized shape', async () => {
    const r = await call('GET', '/api/wa-agent/health');
    assert.strictEqual(r.status, 401);
    assert.deepStrictEqual(r.json, UNAUTH);
  });

  await test('GET /health with a wrong key → 401, identical body (no hint)', async () => {
    const r = await call('GET', '/api/wa-agent/health', { key: 'wrongkey' });
    assert.strictEqual(r.status, 401);
    assert.deepStrictEqual(r.json, UNAUTH);
  });

  await test('a key of the right length but wrong value → 401', async () => {
    const r = await call('GET', '/api/wa-agent/health', { key: 'testkeyX' });
    assert.strictEqual(r.status, 401);
  });

  await test('a prefix of a valid key → 401', async () => {
    const r = await call('GET', '/api/wa-agent/health', { key: 'testkey' });
    assert.strictEqual(r.status, 401);
  });

  await test('an empty header value → 401', async () => {
    const r = await call('GET', '/api/wa-agent/health', { key: '' });
    assert.strictEqual(r.status, 401);
  });

  await test('GET /health with the first key → 200 { ok: true }', async () => {
    const r = await call('GET', '/api/wa-agent/health', { key: 'testkey1' });
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(r.json, { ok: true });
  });

  await test('GET /health with the second (rotation) key → 200', async () => {
    const r = await call('GET', '/api/wa-agent/health', { key: 'testkey2' });
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(r.json, { ok: true });
  });

  await test('header name is case-insensitive (X-Agent-Key)', async () => {
    const r = await call('GET', '/api/wa-agent/health', { rawHeaders: { 'X-Agent-Key': 'testkey1' } });
    assert.strictEqual(r.status, 200);
  });

  await test('surrounding whitespace in WA_AGENT_KEYS and the header is ignored', async () => {
    const r = await call('GET', '/api/wa-agent/health', { key: ' testkey2 ' });
    assert.strictEqual(r.status, 200);
  });

  await test('unknown path with a valid key → 404 in the gateway JSON shape, not HTML', async () => {
    const r = await call('GET', '/api/wa-agent/does-not-exist', { key: 'testkey1' });
    assert.strictEqual(r.status, 404);
    assert.deepStrictEqual(r.json, { ok: false, reason: 'not_found', message: 'No such endpoint.' });
    assert.ok(!/<html/i.test(r.text));
  });

  await test('unknown path WITHOUT a key → 401 (the key check comes first, nothing is probeable)', async () => {
    const r = await call('POST', '/api/wa-agent/book', { body: { name: 'x' } });
    assert.strictEqual(r.status, 401);
  });

  await test('401 log line carries only the IP and the first 4 characters of the attempt', async () => {
    logged.length = 0;
    await call('GET', '/api/wa-agent/health', { key: 'supersecretguess' });
    const line = logged.find((m) => String(m).includes('[wa-agent] 401'));
    assert.ok(line, 'expected a [wa-agent] 401 log line');
    assert.ok(line.includes('key_prefix=supe'), line);
    assert.ok(!line.includes('supersecretguess'), 'full key must never be logged');
  });

  await test('with WA_AGENT_KEYS unset every request is refused with 401', async () => {
    const saved = process.env.WA_AGENT_KEYS;
    process.env.WA_AGENT_KEYS = '';
    try {
      const r = await call('GET', '/api/wa-agent/health', { key: 'testkey1' });
      assert.strictEqual(r.status, 401);
    } finally {
      process.env.WA_AGENT_KEYS = saved;
    }
  });

  await test('a valid key is never written to the log', async () => {
    logged.length = 0;
    await call('GET', '/api/wa-agent/health', { key: 'testkey1' });
    assert.ok(!logged.some((m) => String(m).includes('testkey1')));
  });

  server.close();
  const failed = results.filter(([ok]) => !ok).length;
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
