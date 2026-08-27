'use strict';

/**
 * Place ONE real call to prove the phone actually rings.
 *
 *   cd app/api && node scripts/place-test-call.js +919770601469
 *
 * This is the measurement that separates "the CRM never sent anything to
 * Twilio" from "Twilio refused" — the two failures look identical from the UI,
 * and the CRM's own logs only ever showed the first.
 *
 * It deliberately bypasses two things the CRM depends on, so it can isolate
 * them:
 *
 *  - **No API_PUBLIC_URL.** The TwiML is passed inline (`twiml:`) instead of
 *    fetched from a callback URL, so a dead tunnel cannot mask a working
 *    account. If this rings but the CRM does not, the tunnel is your problem.
 *  - **No bridge.** One leg only, straight to the number given. The CRM's
 *    click-to-call rings the *agent* first, which on a trial account with a
 *    single verified number can never work — see CALLING_GUIDE.md.
 *
 * This costs money and rings a real phone, so the number is required as an
 * argument: there is no default and no way to run it by accident.
 */

require('dotenv').config();

const tw = require('../src/crm/services/twilioVoice');

const RED = '\x1b[31m'; const GREEN = '\x1b[32m'; const YELLOW = '\x1b[33m'; const OFF = '\x1b[0m';

const to = tw.toE164(process.argv[2], '91');
if (!to) {
  console.error(`${RED}Usage: node scripts/place-test-call.js <number>${OFF}`);
  console.error('   e.g. node scripts/place-test-call.js +919770601469');
  console.error('\nThe number is required — this places a REAL call and rings a REAL phone.');
  process.exit(1);
}

(async () => {
  console.log(`\n=== Placing a real test call to ${to} ===\n`);

  if (!tw.hasCredentials()) {
    console.error(`${RED}No Twilio credentials. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env.${OFF}`);
    process.exit(1);
  }
  if (!tw.cfg().from) {
    console.error(`${RED}TWILIO_VOICE_FROM is not set — there is no number to call from.${OFF}`);
    process.exit(1);
  }

  // Demote a rejected API key before we start, so the failure below is about
  // the call and not about a credential we already know how to work around.
  const cred = await tw.verifyCredentials();
  if (!cred.ok) {
    console.error(`${RED}Twilio rejected the credentials (${cred.reason}). Run: node scripts/check-twilio.js${OFF}`);
    process.exit(1);
  }
  console.log(`Credentials: ${GREEN}accepted${OFF} (${cred.credential})${cred.demoted ? `${YELLOW} — API key was rejected, using the auth token${OFF}` : ''}`);
  console.log(`From:        ${tw.cfg().from}`);
  console.log(`To:          ${to}\n`);

  try {
    const call = await tw.getClient().calls.create({
      to,
      from: tw.cfg().from,
      // Inline, so no public callback URL is involved at all.
      twiml: '<Response><Say voice="Polly.Aditi" language="en-IN">'
        + 'This is a test call from your Cocoma C R M. If you can hear this, calling works. Goodbye.'
        + '</Say><Hangup/></Response>',
      timeout: 30,
    });
    console.log(`${GREEN}Call placed.${OFF}  SID ${call.sid}  status "${call.status}"`);
    console.log(`\n${GREEN}Your phone should ring within a few seconds.${OFF}`);
    console.log('If it does not, check the call in Console → Monitor → Logs → Calls.\n');
  } catch (err) {
    const info = tw.describeError(err);
    console.error(`${RED}Twilio refused the call.${OFF}`);
    console.error(`  code:   ${info.errorCode}`);
    console.error(`  reason: ${info.errorMessage}`);
    if (String(info.errorCode) === '21219' || String(info.errorCode) === '21214') {
      console.error(`\n${YELLOW}This is the trial-account restriction.${OFF} Verify the number at`);
      console.error('  Console → Phone Numbers → Manage → Verified Caller IDs → Add a new number,');
      console.error('  or upgrade the account to call anyone.');
    }
    process.exit(1);
  }
})().catch((e) => { console.error('Harness error:', e); process.exit(1); });
