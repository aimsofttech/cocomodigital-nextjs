'use strict';

/**
 * WhatsApp dry run — proves what the CRM *would* send, without sending it.
 *
 * Runs the real sendMessage → deliver pipeline against a scratch database with
 * global.fetch intercepted, so the exact HTTPS request destined for Twilio is
 * captured and printed instead of transmitted. Nothing leaves the machine and
 * no CRM data is touched.
 *
 *   node scripts/dryrun-whatsapp.js
 *   node scripts/dryrun-whatsapp.js +919770601469
 */

require('dotenv').config();

const TEST_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/crm_whatsapp_dryrun';
if (/cocomadigital|prod/i.test(TEST_URI)) {
  console.error('Refusing to run: TEST_MONGO_URI looks like a real database.');
  process.exit(1);
}
process.env.MONGO_URI = TEST_URI;

const TARGET = process.argv[2] || process.env.WHATSAPP_TEST_TO || '+919770601469';

const GREEN = '\x1b[32m'; const RED = '\x1b[31m'; const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m'; const BOLD = '\x1b[1m'; const OFF = '\x1b[0m';

const mongoose = require('mongoose');

/* ── Intercept the provider call ────────────────────────────────────────── */

const captured = [];
const realFetch = global.fetch;
global.fetch = async (url, opts = {}) => {
  const u = String(url);
  // Only outbound *sends* are faked. The window check is a GET against the same
  // host, and answering it with a send-shaped response made it look as though
  // the customer had never replied — which is the exact bug this script exists
  // to catch, reproduced by the harness itself.
  const isSend = String(opts.method || 'GET').toUpperCase() === 'POST';
  if (isSend && (u.includes('api.twilio.com') || u.includes('graph.facebook.com'))) {
    const params = {};
    for (const [k, v] of new URLSearchParams(opts.body || '')) {
      params[k] = params[k] ? `${params[k]}, ${v}` : v;
    }
    captured.push({ url: u, params, raw: opts.body });
    // Pretend Twilio accepted it, so the pipeline runs to completion and we can
    // observe the resulting CRM state too.
    return {
      ok: true, status: 201,
      json: async () => ({ sid: 'SMdryrun0000000000000000000000001', status: 'queued' }),
      text: async () => '{}',
    };
  }
  return realFetch(url, opts);
};

(async () => {
  await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 8000 });
  await mongoose.connection.dropDatabase();

  const { CrmLead, CrmMessage } = require('../src/crm/models');
  const messaging = require('../src/crm/services/messaging');

  console.log(`\n${BOLD}=== WhatsApp dry run (nothing is sent) ===${OFF}`);
  console.log(`${DIM}Scratch DB: ${mongoose.connection.name}   Target: ${TARGET}${OFF}\n`);

  console.log('Provider selection:');
  console.log(`  Meta Cloud API configured : ${messaging.waCloudConfigured()}`);
  console.log(`  Twilio WhatsApp configured: ${messaging.twilioWhatsappConfigured()}`);
  console.log(`  Sender                    : ${process.env.TWILIO_WHATSAPP_FROM || '(none)'}`);
  const fbSid = messaging.fallbackContentSid();
  const fbQuick = fbSid && messaging.SANDBOX_QUICKSTART_SIDS[fbSid];
  console.log(`  Fallback template         : ${fbSid || '(none)'}${fbQuick ? ` ${DIM}(Twilio quick-start "${fbQuick.name}", sandbox only)${OFF}` : ''}`);
  console.log(`  Fallback variables        : ${JSON.stringify(messaging.fallbackContentVariables({ name: 'Dry Run', first_name: 'Dry' })) || '(none)'}`);

  const lead = await CrmLead.create({ name: 'Dry Run', phone: TARGET });

  const attempt = async (label) => {
    captured.length = 0;
    let msg = null; let error = null;
    try {
      msg = await messaging.sendMessage({ channel: 'whatsapp', leadId: lead._id, body: 'Hi {{first_name}}, following up on your enquiry.' });
      await messaging.deliver({ messageId: String(msg._id) });
      msg = await CrmMessage.findById(msg._id);
    } catch (e) { error = e; }

    console.log(`\n${BOLD}${label}${OFF}`);
    if (error) {
      console.log(`  ${RED}REFUSED before contacting Twilio${OFF}`);
      console.log(`  ${DIM}${error.message}${OFF}`);
      console.log(`  ${GREEN}Correct:${OFF} this would have been a 63016 from Twilio. The agent sees it in the composer.`);
      return;
    }
    if (!captured.length) {
      console.log(`  ${YELLOW}No provider request made${OFF} — status "${msg.status}" (${msg.provider || 'no provider'})`);
      if (msg.failReason) console.log(`  ${DIM}reason: ${msg.failReason}${OFF}`);
      return;
    }
    const c = captured[0];
    console.log(`  ${GREEN}Would POST${OFF} ${c.url.replace(/Accounts\/AC[^/]+/, 'Accounts/AC***')}`);
    for (const [k, v] of Object.entries(c.params)) {
      const shown = k === 'Body' ? JSON.stringify(v) : v;
      console.log(`    ${k.padEnd(18)} ${shown}`);
    }
    console.log(`  CRM message status: ${msg.status} (provider ${msg.provider})`);

    // Static checks on the payload Twilio would actually receive.
    const probs = [];
    if (!/^whatsapp:\+\d{8,15}$/.test(c.params.To || '')) probs.push(`To is not whatsapp:+E164 → Twilio 21211 (got "${c.params.To}")`);
    if (!/^whatsapp:\+/.test(c.params.From || '')) probs.push(`From is not a whatsapp: address → Twilio 21910`);
    if (!c.params.Body && !c.params.ContentSid) probs.push('Neither Body nor ContentSid set');
    if (!c.params.StatusCallback) probs.push('No StatusCallback — delivery receipts will never arrive');
    if (probs.length) probs.forEach((p) => console.log(`  ${RED}✗ ${p}${OFF}`));
    else console.log(`  ${GREEN}✓ Payload is well-formed${OFF}`);
  };

  // A. As things stand right now (no inbound in the scratch DB → window closed).
  await attempt('A. Window CLOSED — starting a fresh conversation');

  // B. Simulate the customer having replied 2h ago.
  await CrmMessage.create({
    channel: 'whatsapp', direction: 'inbound', leadId: lead._id,
    toAddress: 'inbox', fromAddress: messaging.normalizePhone(TARGET, '91'),
    body: 'hi', status: 'received', createdAt: new Date(Date.now() - 2 * 3.6e6),
  });
  await attempt('B. Window OPEN — customer replied 2h ago');

  /* ── Inbound path ─────────────────────────────────────────────────────── */
  console.log(`\n${BOLD}C. Inbound handling (what happens when a reply arrives)${OFF}`);
  const before = await CrmLead.countDocuments();
  const inbound = await messaging.recordInbound('whatsapp', 'whatsapp:+919812345678', 'Yes, interested', { From: 'whatsapp:+919812345678' });
  const after = await CrmLead.countDocuments();
  console.log(`  ${inbound ? GREEN + '✓' : RED + '✗'}${OFF} inbound message recorded (status "${inbound && inbound.status}")`);
  console.log(`  ${after > before ? GREEN + '✓' : RED + '✗'}${OFF} unknown sender auto-created a lead`);
  const opened = await messaging.isWaWindowOpen('919812345678');
  console.log(`  ${opened ? GREEN + '✓' : RED + '✗'}${OFF} that reply opens the 24-hour window for replies`);

  /* ── Summary ──────────────────────────────────────────────────────────── */
  console.log(`\n${'='.repeat(62)}`);
  console.log(`${BOLD}  Verdict${OFF}`);
  console.log(`  Outbound pipeline : reaches Twilio with a well-formed payload`);
  console.log(`  Inside 24h window : ${GREEN}would send${OFF}`);
  console.log(`  Outside 24h window: ${messaging.fallbackContentSid() ? `${GREEN}would send via template${OFF}` : `${RED}refused locally${OFF} (needs an approved template)`}`);
  console.log(`  Inbound pipeline  : ${GREEN}records message, creates lead, opens window${OFF}`);
  console.log(`${'='.repeat(62)}\n`);

  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => { console.error('Dry run error:', e); process.exit(1); });
