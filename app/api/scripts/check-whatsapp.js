'use strict';

/**
 * WhatsApp configuration checker.
 *
 * Read-only: sends nothing. Reads .env, asks Twilio what is actually true, and
 * reports the recent failures with their cause, so "WhatsApp isn't working"
 * turns into a specific fix.
 *
 *   cd app/api && node scripts/check-whatsapp.js
 *   cd app/api && node scripts/check-whatsapp.js +919770601469   (check one recipient)
 */

require('dotenv').config();

const GREEN = '\x1b[32m'; const RED = '\x1b[31m';
const YELLOW = '\x1b[33m'; const DIM = '\x1b[2m'; const OFF = '\x1b[0m';
const ok = `${GREEN}OK${OFF}`; const bad = `${RED}FAIL${OFF}`; const warn = `${YELLOW}WARN${OFF}`;

const todo = [];
const line = (m, label, detail = '') => console.log(`  ${m}  ${label}${detail ? `\n        ${DIM}${detail}${OFF}` : ''}`);
const mask = (s) => (!s ? '(not set)' : `${String(s).slice(0, 6)}…${String(s).slice(-4)}`);

const SANDBOX = '14155238886';

/**
 * Twilio's quick-start Content templates (Messaging → Try it out → Send a
 * WhatsApp message). Owned by Twilio, not by you: they 20404 from the Content
 * API and never appear in your template list, but the sandbox sender may send
 * them. Knowing which SIDs these are is what lets the report say "borrowed,
 * works on the sandbox" instead of "broken SID".
 */
const QUICKSTART = {
  HXb5b62575e6e4ff6129ad7c8efe1f983e: { name: 'Appointment Reminders', vars: { 1: 'date', 2: 'time' } },
};

/** Twilio's numeric codes, in the words of someone who has to fix them. */
const CAUSE = {
  63003: 'Recipient channel not found — the number may not be on WhatsApp.',
  63007: 'TWILIO_WHATSAPP_FROM is not a valid WhatsApp sender on this account.',
  63015: 'Recipient has not joined the sandbox (or their 72h session expired).',
  63016: 'Outside the 24-hour window — free-form text is not allowed, only an approved template.',
  63018: 'WhatsApp rate limit reached.',
  63021: 'Content template variables do not match the approved template.',
  63024: 'Content template is not approved for this sender.',
  21211: 'Destination number is not valid E.164.',
  21910: 'From/To channel mismatch (whatsapp: sender must message a whatsapp: recipient).',
  20404: 'Content SID does not exist on this account.',
};

(async () => {
  console.log('\n=== WhatsApp configuration check ===\n');

  console.log('1. Environment');
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM || '';
  const contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID || '';
  const publicUrl = (process.env.API_PUBLIC_URL || '').replace(/\/+$/, '');
  const waCloud = Boolean(process.env.WA_ACCESS_TOKEN && process.env.WA_PHONE_NUMBER_ID);

  line(accountSid ? ok : bad, `TWILIO_ACCOUNT_SID       ${mask(accountSid)}`);
  line(authToken ? ok : bad, `TWILIO_AUTH_TOKEN        ${mask(authToken)}`);
  line(from ? ok : bad, `TWILIO_WHATSAPP_FROM     ${from || '(not set)'}`);
  if (!from) todo.push('Set TWILIO_WHATSAPP_FROM (keep the "whatsapp:" prefix).');
  if (from && !from.startsWith('whatsapp:')) {
    line(bad, 'TWILIO_WHATSAPP_FROM is missing the "whatsapp:" prefix', `Should look like whatsapp:${from}`);
    todo.push('Prefix TWILIO_WHATSAPP_FROM with "whatsapp:".');
  }
  if (from.includes(SANDBOX)) {
    line(warn, 'Using the shared Twilio SANDBOX sender',
      'Recipients must send "join <code>" to +1 415 523 8886, and re-join after 72h idle. Not usable in production.');
    todo.push('For production, get your own WhatsApp sender: Messaging → Senders → WhatsApp senders.');
  }
  if (waCloud) line(warn, 'WA_ACCESS_TOKEN is set — Meta Cloud API takes priority over Twilio for WhatsApp.');

  const qs = QUICKSTART[contentSid];
  if (!contentSid) {
    line(warn, 'TWILIO_WHATSAPP_CONTENT_SID  (not set)',
      'Without a template you can only reach customers who messaged you in the last 24 hours.');
    todo.push('Create a Content template and set TWILIO_WHATSAPP_CONTENT_SID, so you can start conversations.');
  } else if (qs && from.includes(SANDBOX)) {
    line(warn, `TWILIO_WHATSAPP_CONTENT_SID  ${contentSid}`,
      `Twilio's shared "${qs.name}" quick-start template. Sendable from the sandbox, but it is not `
      + 'yours — it will not appear in section 2 below, and it stops working on a production sender.');
    todo.push('Before production: replace the borrowed quick-start template with your own approved one.');
  } else if (qs) {
    line(bad, `TWILIO_WHATSAPP_CONTENT_SID  ${contentSid}`,
      `Twilio's shared "${qs.name}" quick-start template, but your sender is not the sandbox. `
      + 'A production sender is not approved to send it — every send fails with 63024.');
    todo.push('Replace TWILIO_WHATSAPP_CONTENT_SID with a template you created (Messaging → Content Template Builder).');
  } else {
    line(ok, `TWILIO_WHATSAPP_CONTENT_SID  ${contentSid}`);
  }

  // A template with placeholders and no values is rejected outright (63021), so
  // a "configured" fallback that cannot send is worth catching here.
  const rawVars = (process.env.TWILIO_WHATSAPP_CONTENT_VARS || '').trim();
  let parsedVars = null;
  if (rawVars) {
    try {
      parsedVars = JSON.parse(rawVars);
      if (!parsedVars || typeof parsedVars !== 'object' || Array.isArray(parsedVars)) throw new Error('not a JSON object');
      line(ok, `TWILIO_WHATSAPP_CONTENT_VARS ${JSON.stringify(parsedVars)}`);
    } catch (e) {
      parsedVars = null;
      line(bad, `TWILIO_WHATSAPP_CONTENT_VARS is not a JSON object keyed by position`, `${e.message} — e.g. {"1":"12/1","2":"3pm"}`);
      todo.push('Fix TWILIO_WHATSAPP_CONTENT_VARS so it parses as JSON, e.g. {"1":"12/1","2":"3pm"}.');
    }
  }
  if (qs) {
    const need = Object.keys(qs.vars);
    const have = parsedVars ? Object.keys(parsedVars) : [];
    const missing = need.filter((k) => !have.includes(String(k)));
    if (missing.length) {
      line(bad, `"${qs.name}" needs ${need.map((k) => `{{${k}}} ${qs.vars[k]}`).join(', ')}`,
        `Missing: ${missing.map((k) => `{{${k}}}`).join(', ')} — Twilio rejects the send with 63021.`);
      todo.push(`Set TWILIO_WHATSAPP_CONTENT_VARS={"1":"12/1","2":"3pm"} for the "${qs.name}" template.`);
    } else {
      line(ok, `Template variables satisfied (${need.map((k) => `{{${k}}}=${parsedVars[k]}`).join(', ')})`);
    }
  }

  line(publicUrl ? ok : bad, `API_PUBLIC_URL           ${publicUrl || '(not set)'}`);
  if (!publicUrl) todo.push('Set API_PUBLIC_URL — without it, inbound replies and delivery receipts never reach the CRM.');

  if (!accountSid || !authToken) {
    console.log(`\n${RED}No Twilio credentials — cannot continue.${OFF}\n`);
    process.exit(1);
  }

  const client = require('twilio')(accountSid, authToken);

  /* ── 2. Content templates ─────────────────────────────────────────────── */
  console.log('\n2. Content templates (needed to start a conversation)');
  try {
    const list = await client.content.v1.contents.list({ limit: 20 });
    if (!list.length) {
      line(qs ? warn : bad, 'This account has NO Content templates of its own',
        qs
          ? `Expected — you are borrowing Twilio's "${qs.name}" quick-start template, which is not listed here.`
          : 'Nothing can be sent outside the 24-hour window until one exists and is approved.');
      todo.push('Build a template: Messaging → Content Template Builder → Create new, then submit it for WhatsApp approval.');
    }
    for (const t of list) {
      line(ok, `${t.sid}  ${t.friendlyName} (${t.language})`);
    }
    if (contentSid) {
      try {
        const t = await client.content.v1.contents(contentSid).fetch();
        line(ok, `Configured SID resolves: "${t.friendlyName}"`, `Variables: ${JSON.stringify(t.variables || {})}`);
      } catch (e) {
        if (qs && from.includes(SANDBOX)) {
          line(warn, `Configured SID ${contentSid} is not on this account (expected)`,
            `It is Twilio's "${qs.name}" quick-start template — a 20404 here is normal, and the sandbox can still send it.`);
        } else {
          line(bad, `Configured SID ${contentSid} does not exist on this account`, `Twilio: ${e.message}`);
          todo.push('Point TWILIO_WHATSAPP_CONTENT_SID at a template that exists on THIS account.');
        }
      }
    }
  } catch (e) {
    line(warn, `Could not list Content templates: ${e.message}`);
  }

  /* ── 3. Recent traffic ────────────────────────────────────────────────── */
  console.log('\n3. Recent WhatsApp traffic');
  let lastInbound = null;
  try {
    const msgs = await client.messages.list({ limit: 50 });
    const wa = msgs.filter((m) => String(m.from).startsWith('whatsapp:') || String(m.to).startsWith('whatsapp:'));
    if (!wa.length) line(warn, 'No WhatsApp messages on this account yet.');

    const failures = wa.filter((m) => m.errorCode);
    for (const m of wa.slice(0, 10)) {
      const when = m.dateCreated ? m.dateCreated.toISOString().slice(0, 16).replace('T', ' ') : '';
      const dir = String(m.from).includes(SANDBOX) || String(m.from) === from ? '→' : '←';
      const mark = m.errorCode ? bad : ok;
      line(mark, `${when}  ${dir}  ${m.errorCode ? `${m.status} (${m.errorCode})` : m.status}`,
        m.errorCode ? (CAUSE[m.errorCode] || m.errorMessage || '') : '');
    }

    const inbound = wa.filter((m) => !String(m.from).includes(SANDBOX) && String(m.from).startsWith('whatsapp:'));
    lastInbound = inbound.length ? inbound[0].dateCreated : null;

    if (failures.length) {
      const counts = failures.reduce((a, m) => ({ ...a, [m.errorCode]: (a[m.errorCode] || 0) + 1 }), {});
      console.log(`\n  ${RED}Failure summary:${OFF}`);
      for (const [code, n] of Object.entries(counts)) {
        console.log(`    ${code} x${n} — ${CAUSE[code] || 'see twilio.com/docs/api/errors'}`);
        if (code === '63016') {
          todo.push('63016 is the current blocker: you are outside the 24-hour window. Use an approved template, or have the customer message you first.');
        }
        if (code === '63015') todo.push('63015: have the recipient send "join <code>" to +1 415 523 8886 again.');
      }
    }
  } catch (e) {
    line(warn, `Could not read message history: ${e.message}`);
  }

  /* ── 4. The 24-hour window ────────────────────────────────────────────── */
  console.log('\n4. 24-hour customer-service window');
  if (!lastInbound) {
    line(warn, 'No inbound WhatsApp message found — the window is CLOSED',
      'Only an approved template can start the conversation.');
  } else {
    const ageMs = Date.now() - new Date(lastInbound).getTime();
    const hrs = (ageMs / 3.6e6).toFixed(1);
    if (ageMs < 24 * 3.6e6) {
      line(ok, `Window OPEN — last customer reply ${hrs}h ago`, `Free-form text works for another ${(24 - hrs).toFixed(1)}h.`);
    } else {
      line(bad, `Window CLOSED — last customer reply was ${hrs}h ago`,
        'Free-form text will fail with 63016. Only an approved template delivers now.');
    }

    // Two different clocks, and mixing them up sends people to the wrong fix:
    // the sandbox JOIN lapses after 72h idle (error 63015, recipient must
    // re-send "join <code>"), while the messaging WINDOW closes after 24h
    // (error 63016, needs an approved template). Only the sandbox has the
    // former; a production sender has no join step at all.
    if (from.includes(SANDBOX)) {
      if (ageMs < 72 * 3.6e6) {
        line(ok, `Sandbox join still valid (${hrs}h of 72h idle)`,
          'So 63016 here is the 24h window, not a lapsed sandbox join — re-joining would not help.');
      } else {
        line(bad, `Sandbox join has lapsed (${hrs}h idle, limit 72h)`,
          'The recipient must send "join <code>" to +1 415 523 8886 again, or you also get 63015.');
        todo.push('Sandbox join lapsed — have the recipient re-send "join <code>" to +1 415 523 8886.');
      }
    }
  }

  /* ── 5. Inbound webhook reachability ──────────────────────────────────── */
  console.log('\n5. Inbound webhook');
  const inboundUrl = require('../src/crm/publicUrl').crmUrl('/webhooks/twilio/whatsapp-inbound');
  if (!publicUrl) {
    line(bad, 'API_PUBLIC_URL not set — skipping');
  } else {
    line(ok, `Should be configured in Twilio as: ${inboundUrl}`);
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 10000);
      const res = await fetch(inboundUrl, {
        method: 'POST', signal: ctl.signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'From=whatsapp%3A%2B10000000000&Body=probe',
      });
      clearTimeout(t);
      if (res.status === 403) {
        line(ok, 'Reachable and signature-protected (403 as expected)');
      } else {
        const body = (await res.text()).slice(0, 60).replace(/\s+/g, ' ');
        line(bad, `Returned ${res.status}`, `Body: ${body}`);
        todo.push(`API_PUBLIC_URL does not serve this API — ${inboundUrl} returned ${res.status}. Inbound replies are being lost, which is also what keeps the 24h window shut.`);
      }
    } catch (e) {
      line(bad, `Unreachable: ${e.message}`);
      todo.push('Make the API reachable at API_PUBLIC_URL, then set the sandbox/sender inbound webhook to it.');
    }
    console.log(`  ${DIM}Set it at: Messaging → Try it out → Send a WhatsApp message → Sandbox settings`);
    console.log(`  ${DIM}("WHEN A MESSAGE COMES IN", method POST)${OFF}`);
  }

  /* ── Summary ──────────────────────────────────────────────────────────── */
  console.log(`\n${'='.repeat(62)}`);
  if (!todo.length) console.log(`${GREEN}  WhatsApp looks correctly configured.${OFF}`);
  else {
    console.log(`${RED}  ${todo.length} thing(s) to fix:${OFF}\n`);
    [...new Set(todo)].forEach((t, i) => console.log(`   ${i + 1}. ${t}`));
  }
  console.log(`${'='.repeat(62)}\n`);
  process.exit(todo.length ? 1 : 0);
})().catch((e) => { console.error('Checker error:', e.message); process.exit(1); });
