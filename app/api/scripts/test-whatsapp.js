'use strict';

/**
 * Twilio WhatsApp smoke test — verifies credentials and sandbox setup without
 * touching Mongo, the job queue, or the CRM.
 *
 * Run:   node scripts/test-whatsapp.js +919770601469            (from app/api)
 *        node scripts/test-whatsapp.js +919770601469 "free text"
 *
 * With no message argument it sends the Content template in
 * TWILIO_WHATSAPP_CONTENT_SID (variables 12/1 and 3pm) — the only thing that
 * works outside the 24-hour customer-service window. Pass a message to send
 * free-form text instead, which requires the recipient to have messaged you
 * within the last 24 hours.
 *
 * Prerequisites:
 *   - TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM in .env
 *   - The recipient has sent "join <your-code>" to +1 415 523 8886 on WhatsApp.
 *     Sandbox participants expire after 72h of inactivity and must re-join.
 *     Find your code: Twilio Console → Messaging → Try it out → Send a WhatsApp message.
 */

require('dotenv').config();

const to = process.argv[2] || process.env.WHATSAPP_TEST_TO;
const freeText = process.argv[3];

if (!to) {
  console.error('Usage: node scripts/test-whatsapp.js <+E164 number> ["optional free-form message"]');
  process.exit(1);
}

const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_WHATSAPP_FROM;

if (!sid || !token || !from) {
  console.error('Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM in .env');
  process.exit(1);
}

const params = new URLSearchParams({
  To: `whatsapp:+${String(to).replace(/[^\d]/g, '')}`,
  From: from,
});

if (freeText) {
  params.set('Body', freeText);
} else {
  const contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID;
  if (!contentSid) {
    console.error('No message given and TWILIO_WHATSAPP_CONTENT_SID is unset — nothing to send.');
    process.exit(1);
  }
  params.set('ContentSid', contentSid);
  // Use the configured variables, not a hardcoded pair — otherwise this script
  // passes while the CRM's own config is wrong, which is the opposite of a test.
  let vars = { 1: '12/1', 2: '3pm' };
  const raw = (process.env.TWILIO_WHATSAPP_CONTENT_VARS || '').trim();
  if (raw) {
    try {
      vars = JSON.parse(raw);
    } catch (e) {
      console.error(`TWILIO_WHATSAPP_CONTENT_VARS is not valid JSON: ${e.message}`);
      process.exit(1);
    }
  }
  params.set('ContentVariables', JSON.stringify(vars));
  console.log(`Sending template ${contentSid} with ${JSON.stringify(vars)}`);
}

(async () => {
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error(`\n✗ Twilio rejected the send (HTTP ${res.status}, code ${data.code})`);
    console.error(`  ${data.message}`);
    const hint = {
      63015: 'The recipient has not joined the sandbox. Send "join <your-code>" from that phone to +14155238886.',
      63016: 'Outside the 24-hour window — run without the message argument to send the Content template.',
      21211: 'Invalid destination. Use full E.164, e.g. +919770601469.',
      20003: 'Authentication failed — check TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN.',
    }[data.code];
    if (hint) console.error(`  → ${hint}`);
    if (data.more_info) console.error(`  ${data.more_info}`);
    process.exit(1);
  }

  console.log(`\n✓ Accepted by Twilio`);
  console.log(`  SID:    ${data.sid}`);
  console.log(`  Status: ${data.status}`);
  console.log(`  To:     ${data.to}`);
  console.log('\nNote: "accepted"/"queued" means Twilio took it, not that WhatsApp delivered it.');
  console.log('Check Console → Monitor → Logs → Messaging for the final status.');
})().catch((err) => {
  console.error(`\n✗ Request failed: ${err.message}`);
  process.exit(1);
});
