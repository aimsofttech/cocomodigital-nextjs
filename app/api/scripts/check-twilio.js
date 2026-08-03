'use strict';

/**
 * Twilio Voice configuration checker.
 *
 * Reads .env, then asks Twilio what is actually true — account type, number
 * capabilities, webhook URLs, verified caller IDs, geo permissions — and tells
 * you exactly what still needs changing. Read-only: places no calls, changes
 * nothing.
 *
 *   cd app/api && node scripts/check-twilio.js
 */

require('dotenv').config();

const tw = require('../src/crm/services/twilioVoice');

const GREEN = '\x1b[32m'; const RED = '\x1b[31m';
const YELLOW = '\x1b[33m'; const DIM = '\x1b[2m'; const OFF = '\x1b[0m';
const okMark = `${GREEN}OK${OFF}`;
const bad = `${RED}FAIL${OFF}`;
const warnMark = `${YELLOW}WARN${OFF}`;

const todo = [];
const line = (mark, label, detail = '') => console.log(`  ${mark}  ${label}${detail ? `\n        ${DIM}${detail}${OFF}` : ''}`);

/** Twilio secrets must never be printed in full — someone always pastes output. */
const mask = (s) => (!s ? '(not set)' : `${String(s).slice(0, 6)}…${String(s).slice(-4)}`);

(async () => {
  console.log('\n=== Twilio Voice configuration check ===\n');

  /* ── 1. Local env ─────────────────────────────────────────────────────── */
  console.log('1. Environment');
  const c = tw.cfg();
  line(c.accountSid ? okMark : bad, `TWILIO_ACCOUNT_SID  ${mask(c.accountSid)}`);
  line(c.authToken ? okMark : bad, `TWILIO_AUTH_TOKEN   ${mask(c.authToken)}`,
    c.authToken ? 'Required for webhook signature validation — keep it even when using an API key.' : '');
  if (!c.authToken) todo.push('Set TWILIO_AUTH_TOKEN — without it webhook signatures cannot be verified.');

  const keyHalf = Boolean(c.apiKeySid) !== Boolean(c.apiKeySecret);
  if (c.apiKeySid && c.apiKeySecret) {
    line(okMark, `API key             ${mask(c.apiKeySid)}`, 'REST calls authenticate with the API key.');
  } else if (keyHalf) {
    line(bad, 'API key is half-configured',
      'Set BOTH TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET, or clear both. Falling back to the auth token.');
    todo.push('Fill in the missing half of the API key pair, or blank both out.');
  } else {
    line(warnMark, 'API key             (not set)',
      'Optional. Recommended: an API key can be revoked on its own; the auth token cannot.');
  }

  line(c.from ? okMark : bad, `TWILIO_VOICE_FROM   ${c.from || '(not set)'}`);
  if (!c.from) todo.push('Set TWILIO_VOICE_FROM to a voice-capable Twilio number in E.164 form.');

  const r = tw.readiness();
  line(c.publicUrl ? okMark : bad, `API_PUBLIC_URL      ${c.publicUrl || '(not set)'}`);
  for (const w of r.warnings) line(warnMark, w);
  if (!c.publicUrl) todo.push('Set API_PUBLIC_URL to the public HTTPS origin of THIS API.');

  if (process.env.TWILIO_VALIDATE_WEBHOOKS === 'false') {
    todo.push('TWILIO_VALIDATE_WEBHOOKS=false disables signature checks — never ship this.');
  }

  if (!tw.hasCredentials()) {
    console.log(`\n${RED}No usable credentials — cannot query Twilio. Fix the above first.${OFF}\n`);
    process.exit(1);
  }

  /* ── 2. Credentials actually work ─────────────────────────────────────── */
  console.log('\n2. Twilio account');

  /** Try one credential pair straight against the REST API. */
  const tryAuth = async (user, pass) => {
    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${c.accountSid}.json`,
        { headers: { Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}` } });
      return { ok: res.ok, status: res.status };
    } catch (err) { return { ok: false, status: 0, err: err.message }; }
  };

  let account;
  try {
    account = await tw.getClient().api.accounts(c.accountSid).fetch();
    line(okMark, `Credentials accepted — "${account.friendlyName}"`);
  } catch (err) {
    line(bad, `Twilio rejected the credentials: ${err.message}`);
    // Work out WHICH credential is broken rather than making them guess. The
    // API key takes priority in code, so a bad key masks a working auth token.
    if (c.apiKeySid && c.apiKeySecret) {
      const [key, token] = await Promise.all([
        tryAuth(c.apiKeySid, c.apiKeySecret),
        c.authToken ? tryAuth(c.accountSid, c.authToken) : Promise.resolve({ ok: false, status: 0 }),
      ]);
      line(key.ok ? okMark : bad, `API key ${c.apiKeySid}: ${key.ok ? 'works' : `rejected (HTTP ${key.status})`}`);
      line(token.ok ? okMark : bad, `Account auth token: ${token.ok ? 'works' : `rejected (HTTP ${token.status})`}`);
      if (!key.ok && token.ok) {
        line(warn, 'The API key is the problem — your auth token is fine.',
          'Secrets are shown once at creation, so a mis-copied secret is the usual cause. '
          + 'Either recreate the key (Admin → Account management → Keys & credentials → API keys & tokens), '
          + 'or blank TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET to fall back to the auth token.');
        todo.push('Fix or blank the API key: it is rejected with 401 while the auth token works.');
      }
    }
    console.log(`\n${RED}Stopping — nothing else can be checked.${OFF}\n`);
    if (todo.length) {
      console.log(`${RED}  Fix first:${OFF}`);
      [...new Set(todo)].forEach((t, i) => console.log(`   ${i + 1}. ${t}`));
      console.log('');
    }
    process.exit(1);
  }

  if (account.type === 'Trial') {
    line(bad, 'Account is a TRIAL account',
      'Trial accounts can only call verified numbers, and prepend a Twilio message to every call.');
    todo.push('Upgrade the account: console.twilio.com → "Upgrade" (top bar).');
  } else {
    line(okMark, `Account type: ${account.type}`);
  }

  try {
    const bal = await tw.getClient().balance.fetch();
    const low = Number(bal.balance) < 5;
    line(low ? warnMark : okMark, `Balance: ${bal.balance} ${bal.currency}`,
      low ? 'Low — a campaign could run out mid-flight. Enable auto-recharge.' : '');
  } catch { /* balance is not readable with some restricted keys */ }

  /* ── 3. The number ────────────────────────────────────────────────────── */
  console.log('\n3. Phone number');
  const expectedInbound = tw.URLS.inbound();
  const expectedFallback = tw.URLS.fallback();
  const expectedStatus = tw.URLS.status();

  try {
    const numbers = await tw.getClient().incomingPhoneNumbers.list({ limit: 20 });
    if (!numbers.length) {
      line(bad, 'No phone numbers on this account');
      todo.push('Buy a voice-capable number: Phone Numbers → Manage → Buy a number.');
    }
    const mine = numbers.find((n) => n.phoneNumber === c.from);
    if (c.from && !mine) {
      line(bad, `TWILIO_VOICE_FROM (${c.from}) is not owned by this account`,
        `Owned: ${numbers.map((n) => n.phoneNumber).join(', ') || 'none'}`);
      todo.push('Point TWILIO_VOICE_FROM at a number this account owns.');
    }
    for (const n of numbers) {
      const isFrom = n.phoneNumber === c.from;
      line(n.capabilities.voice ? okMark : bad,
        `${n.phoneNumber}${isFrom ? '  <- TWILIO_VOICE_FROM' : ''}  voice=${n.capabilities.voice}`);
      if (!isFrom) continue;

      const cmp = (label, actual, expected, key) => {
        if (actual === expected) return line(okMark, `  ${label}`);
        line(bad, `  ${label} is ${actual || '(not set)'}`, `Expected: ${expected}`);
        todo.push(`Set the number's ${key} to ${expected}`);
      };
      cmp('A CALL COMES IN', n.voiceUrl, expectedInbound, '"A CALL COMES IN" webhook');
      cmp('PRIMARY HANDLER FAILS', n.voiceFallbackUrl, expectedFallback, '"PRIMARY HANDLER FAILS" webhook');
      cmp('CALL STATUS CHANGES', n.statusCallback, expectedStatus, '"CALL STATUS CHANGES" webhook');
      if (n.voiceMethod !== 'POST') {
        line(bad, `  Voice method is ${n.voiceMethod}`, 'Must be POST.');
        todo.push('Set the number\'s voice webhook method to POST.');
      }

      // SMS on the same number. Beyond losing replies, an unrouted inbound
      // webhook means STOP messages never reach the CRM, so people who opted
      // out keep receiving messages — a compliance problem, not a feature gap.
      if (n.capabilities && n.capabilities.sms) {
        const expectedSms = require('../src/crm/publicUrl').crmUrl('/webhooks/twilio/sms-inbound');
        if (n.smsUrl === expectedSms) {
          line(okMark, '  A MESSAGE COMES IN');
        } else {
          line(bad, `  A MESSAGE COMES IN is ${n.smsUrl || '(not set)'}`,
            `Expected: ${expectedSms}\n        Inbound SMS replies AND "STOP" opt-outs are being lost.`);
          todo.push(`Set the number's "A MESSAGE COMES IN" webhook to ${expectedSms} (POST) — STOP opt-outs depend on it.`);
        }
      }
    }
  } catch (err) {
    line(warnMark, `Could not read phone numbers: ${err.message}`);
  }

  /* ── 4. Trial restrictions ────────────────────────────────────────────── */
  if (account.type === 'Trial') {
    console.log('\n4. Verified caller IDs (trial only)');
    try {
      const verified = await tw.getClient().outgoingCallerIds.list({ limit: 50 });
      if (!verified.length) {
        line(bad, 'No verified numbers — this account cannot call anyone');
        todo.push('Verify a number: Phone Numbers → Manage → Verified Caller IDs.');
      }
      for (const v of verified) line(okMark, `${v.phoneNumber} is callable`);
      line(warnMark, 'Every other number will fail with error 21219 until you upgrade.');
    } catch (err) {
      line(warnMark, `Could not read verified caller IDs: ${err.message}`);
    }
  }

  /* ── 5. Geo permissions ───────────────────────────────────────────────── */
  console.log(`\n${account.type === 'Trial' ? '5' : '4'}. Geographic permissions`);
  for (const iso of ['IN', 'US']) {
    try {
      const p = await tw.getClient().voice.v1.dialingPermissions.countries(iso).fetch();
      line(p.lowRiskNumbersEnabled ? okMark : bad, `${p.name}: normal numbers ${p.lowRiskNumbersEnabled ? 'enabled' : 'BLOCKED'}`);
      if (!p.lowRiskNumbersEnabled) todo.push(`Enable ${p.name} in Voice → Settings → Geographic Permissions.`);
      if (p.highRiskTollfraudNumbersEnabled) {
        line(warnMark, `${p.name}: high-risk toll-fraud ranges are ENABLED`,
          'These are premium-rate ranges and the usual vector for toll fraud. Disable them.');
      }
    } catch (err) {
      line(warnMark, `Could not read geo permissions for ${iso}: ${err.message}`);
    }
  }

  /* ── 6. Webhook reachability ──────────────────────────────────────────── */
  console.log(`\n${account.type === 'Trial' ? '6' : '5'}. Webhook reachability`);
  if (!c.publicUrl) {
    line(bad, 'API_PUBLIC_URL is not set — skipping');
  } else {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 10000);
      const res = await fetch(expectedFallback, {
        method: 'POST', signal: ctl.signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'CallSid=probe',
      });
      clearTimeout(t);
      const body = (await res.text()).slice(0, 60).replace(/\s+/g, ' ');
      if (res.status === 403) {
        line(okMark, 'Webhook endpoint is reachable and signature-protected (403 as expected)');
      } else if (res.status === 200 && body.includes('<?xml')) {
        line(warnMark, 'Endpoint reachable but returned 200 without a signature',
          'Signature validation appears to be disabled. Set TWILIO_VALIDATE_WEBHOOKS=true.');
        todo.push('Re-enable webhook signature validation.');
      } else {
        line(bad, `Endpoint returned ${res.status}`, `Body starts: ${body}`);
        todo.push(`API_PUBLIC_URL does not serve this API — ${expectedFallback} returned ${res.status}, not 403.`);
      }
    } catch (err) {
      line(bad, `Could not reach ${expectedFallback}`, err.message);
      todo.push('Make the API reachable at API_PUBLIC_URL (deploy it, or use an ngrok tunnel for local testing).');
    }
  }

  /* ── Summary ──────────────────────────────────────────────────────────── */
  console.log(`\n${'='.repeat(60)}`);
  if (!todo.length) {
    console.log(`${GREEN}  Ready to place calls.${OFF}`);
  } else {
    console.log(`${RED}  ${todo.length} thing(s) to fix, in order:${OFF}\n`);
    todo.forEach((t, i) => console.log(`   ${i + 1}. ${t}`));
  }
  console.log(`${'='.repeat(60)}\n`);
  process.exit(todo.length ? 1 : 0);
})().catch((err) => { console.error('Checker error:', err.message); process.exit(1); });
