'use strict';

/**
 * WhatsApp / SMS messaging regression suite.
 *
 * Verifies phone normalisation, the 24-hour WhatsApp window gate, Content
 * template fallback and consent enforcement. Queues messages into a scratch
 * database but never delivers them — no provider call is made.
 *
 *   node scripts/test-messaging.js
 */

require('dotenv').config();

const TEST_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/crm_messaging_test';
if (/cocomadigital|prod/i.test(TEST_URI)) {
  console.error('Refusing to run: TEST_MONGO_URI looks like a real database.');
  process.exit(1);
}
process.env.MONGO_URI = TEST_URI;
// Force the Twilio WhatsApp path on, so the window gate is exercised.
process.env.TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'ACtest';
process.env.TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'testtoken';
process.env.TWILIO_WHATSAPP_FROM = 'whatsapp:+14155238886';
delete process.env.WA_ACCESS_TOKEN;

/* ── keep the suite hermetic ──────────────────────────────────────────────
 * The window gate now asks Twilio when local history shows no reply, because
 * our inbound mirror can be stale. That is right in production and wrong in a
 * test: results would depend on whatever the real account happens to have seen
 * in the last 24 hours, so the suite would pass or fail by the clock.
 *
 * Every Twilio call is stubbed. `twilioInbox` is what the fake account claims
 * to have received; tests set it to steer the gate. */
let twilioInbox = [];
const realFetch = global.fetch;
global.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.includes('api.twilio.com')) {
    if (String(opts.method || 'GET').toUpperCase() === 'POST') {
      return { ok: true, status: 201, json: async () => ({ sid: 'SMtest', status: 'queued' }) };
    }
    return { ok: true, status: 200, json: async () => ({ messages: twilioInbox }) };
  }
  return realFetch(url, opts);
};

const mongoose = require('mongoose');

let pass = 0; let fail = 0;
const failures = [];
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  ok    ${n}`); } else { fail++; failures.push(n); console.log(`  FAIL  ${n}${d ? ` — ${d}` : ''}`); }
};
const section = (t) => console.log(`\n${t}`);

(async () => {
  await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 8000 });
  await mongoose.connection.dropDatabase();

  const { CrmLead, CrmContact, CrmMessage } = require('../src/crm/models');
  const messaging = require('../src/crm/services/messaging');

  section('1. Phone normalisation (destination for every WhatsApp/SMS send)');
  for (const [input, want] of [
    ['9770601469', '919770601469'],
    ['09770601469', '919770601469'],        // national trunk prefix
    ['0091 9770601469', '919770601469'],    // IDD prefix
    ['+91 97706 01469', '919770601469'],
    ['+919770601469', '919770601469'],
    ['97706-01469', '919770601469'],
    ['+1 785 555 0134', '17855550134'],
  ]) {
    const got = messaging.normalizePhone(input, '91');
    check(`${JSON.stringify(input)} -> ${want}`, got === want, `got ${got}`);
  }
  check('rejects too-short input', messaging.normalizePhone('12345', '91') === null);
  check('rejects empty input', messaging.normalizePhone('', '91') === null);
  // The bug this replaced produced whatsapp:+09770601469, rejected by Twilio 21211.
  check('never yields a leading zero after the country code',
    !String(messaging.normalizePhone('09770601469', '91')).startsWith('0'));

  section('2. WhatsApp 24-hour window detection');
  const lead = await CrmLead.create({ name: 'Ravi', phone: '9770601469' });
  check('window is closed when the customer has never replied',
    (await messaging.isWaWindowOpen('919770601469')) === false);

  await CrmMessage.create({
    channel: 'whatsapp', direction: 'inbound', leadId: lead._id,
    toAddress: 'inbox', fromAddress: '919770601469', body: 'hi', status: 'received',
    createdAt: new Date(Date.now() - 2 * 3.6e6),
  });
  check('window is open 2h after an inbound reply',
    (await messaging.isWaWindowOpen('919770601469')) === true);

  await CrmMessage.deleteMany({ direction: 'inbound' });
  await CrmMessage.create({
    channel: 'whatsapp', direction: 'inbound', leadId: lead._id,
    toAddress: 'inbox', fromAddress: '919770601469', body: 'hi', status: 'received',
    createdAt: new Date(Date.now() - 35 * 3.6e6),
  });
  check('window is closed 35h after an inbound reply (the live failure)',
    (await messaging.isWaWindowOpen('919770601469')) === false);

  section('3. Sending outside the window fails early, with a usable reason');
  delete process.env.TWILIO_WHATSAPP_CONTENT_SID;
  let err = null;
  try {
    await messaging.sendMessage({ channel: 'whatsapp', leadId: lead._id, body: 'Following up on your enquiry' });
  } catch (e) { err = e; }
  check('send is refused', !!err);
  check('reason names the 24-hour window', /24-hour WhatsApp window/i.test(err ? err.message : ''), err && err.message);
  check('reason says what to do', /template|Content SID/i.test(err ? err.message : ''), err && err.message);
  check('reason includes when they last replied', /last replied/i.test(err ? err.message : ''), err && err.message);
  check('nothing was queued', (await CrmMessage.countDocuments({ direction: 'outbound' })) === 0);

  section('4. Content template lets you start a conversation');
  process.env.TWILIO_WHATSAPP_CONTENT_SID = 'HXtest0000000000000000000000000001';
  const queued = await messaging.sendMessage({ channel: 'whatsapp', leadId: lead._id, body: 'Following up' });
  check('send is accepted when a fallback template exists', !!queued);
  check('the template SID is attached', queued.contentSid === 'HXtest0000000000000000000000000001', queued.contentSid);
  check('the substitution is recorded, not silent',
    (queued.statusHistory || []).some((h) => h.raw && h.raw.fallbackTemplate),
    'an agent must be able to see their wording was replaced');

  section('4b. The fallback template carries its variables');
  // Twilio rejects a Content send whose variables do not match the approved
  // template (63021), and the fallback has no other source for them — the CRM
  // template's named variables belong to a different template.
  const savedVars = process.env.TWILIO_WHATSAPP_CONTENT_VARS;
  process.env.TWILIO_WHATSAPP_CONTENT_VARS = '{"1":"12/1","2":"3pm"}';
  const withVars = await messaging.sendMessage({ channel: 'whatsapp', leadId: lead._id, body: 'Following up' });
  check('variables are attached to the fallback send',
    withVars.contentVariables && withVars.contentVariables['1'] === '12/1' && withVars.contentVariables['2'] === '3pm',
    JSON.stringify(withVars.contentVariables));

  process.env.TWILIO_WHATSAPP_CONTENT_VARS = '{"1":"{{first_name}}","2":"3pm"}';
  const rendered = await messaging.sendMessage({ channel: 'whatsapp', leadId: lead._id, body: 'Following up' });
  check('placeholders in the variables are rendered per recipient',
    rendered.contentVariables && rendered.contentVariables['1'] === 'Ravi',
    JSON.stringify(rendered.contentVariables));

  process.env.TWILIO_WHATSAPP_CONTENT_VARS = 'not json';
  const badVars = await messaging.sendMessage({ channel: 'whatsapp', leadId: lead._id, body: 'Following up' });
  check('unparseable variables do not crash the send', !!badVars);

  // A quick-start template with required placeholders and nothing to fill them
  // must fail in the composer, not silently at Twilio.
  delete process.env.TWILIO_WHATSAPP_CONTENT_VARS;
  process.env.TWILIO_WHATSAPP_CONTENT_SID = 'HXb5b62575e6e4ff6129ad7c8efe1f983e';
  let varErr = null;
  try {
    await messaging.sendMessage({ channel: 'whatsapp', leadId: lead._id, body: 'Following up' });
  } catch (e) { varErr = e; }
  check('a known template with no variables is refused up front', !!varErr);
  check('the refusal names the missing variables',
    /\{\{1\}\} date|TWILIO_WHATSAPP_CONTENT_VARS/.test(varErr ? varErr.message : ''), varErr && varErr.message);
  process.env.TWILIO_WHATSAPP_CONTENT_SID = 'HXtest0000000000000000000000000001';
  if (savedVars === undefined) delete process.env.TWILIO_WHATSAPP_CONTENT_VARS;
  else process.env.TWILIO_WHATSAPP_CONTENT_VARS = savedVars;

  section('4c. Twilio is the authority on the 24-hour window');
  // The failure this covers: the sandbox inbound webhook was not configured, so
  // the customer's reply reached Twilio but never reached the CRM. The CRM
  // concluded the window was shut and swapped in a template — the customer got
  // "Your appointment is coming up on 12/1 at 3pm" instead of what was typed.
  delete process.env.TWILIO_WHATSAPP_CONTENT_SID;
  delete process.env.TWILIO_WHATSAPP_CONTENT_VARS;
  await CrmMessage.deleteMany({});            // CRM has no record of any reply
  twilioInbox = [{ date_created: new Date(Date.now() - 2 * 3.6e6).toUTCString() }];

  const rescued = await messaging.sendMessage({
    channel: 'whatsapp', leadId: lead._id, body: 'Hello how are you.?',
  });
  check('a send is allowed when Twilio saw a reply the CRM missed', !!rescued);
  check('the agent\'s own words are kept', rescued && rescued.body === 'Hello how are you.?', rescued && rescued.body);
  check('no template is substituted', rescued && !rescued.contentSid, rescued && rescued.contentSid);

  // Both sources agree there is no reply → refusing is correct.
  twilioInbox = [];
  let coldErr = null;
  try {
    await messaging.sendMessage({ channel: 'whatsapp', leadId: lead._id, body: 'cold outreach' });
  } catch (e) { coldErr = e; }
  check('a genuinely cold send is still refused', !!coldErr);

  // Twilio unreachable → fall back to local history rather than guessing open.
  twilioInbox = [{ date_created: new Date(Date.now() - 40 * 3.6e6).toUTCString() }];
  let staleErr = null;
  try {
    await messaging.sendMessage({ channel: 'whatsapp', leadId: lead._id, body: 'old window' });
  } catch (e) { staleErr = e; }
  check('an expired Twilio reply does not open the window', !!staleErr);

  section('5. Inside the window, free-form text is allowed');
  await CrmMessage.deleteMany({});
  await CrmMessage.create({
    channel: 'whatsapp', direction: 'inbound', leadId: lead._id,
    toAddress: 'inbox', fromAddress: '919770601469', body: 'hi', status: 'received',
  });
  delete process.env.TWILIO_WHATSAPP_CONTENT_SID;
  const free = await messaging.sendMessage({ channel: 'whatsapp', leadId: lead._id, body: 'Thanks for your reply!' });
  check('free-form send is accepted', !!free);
  check('no template is forced onto it', !free.contentSid);
  check('body is preserved', free.body === 'Thanks for your reply!');

  section('6. An explicit template SID always wins');
  await CrmMessage.deleteMany({ direction: 'inbound' });
  const explicit = await messaging.sendMessage({
    channel: 'whatsapp', leadId: lead._id, body: 'preview', contentSid: 'HXexplicit000000000000000000000001',
  });
  check('explicit contentSid is used outside the window',
    explicit.contentSid === 'HXexplicit000000000000000000000001', explicit.contentSid);
  check('explicit send is not flagged as a fallback',
    !(explicit.statusHistory || []).some((h) => h.raw && h.raw.fallbackTemplate));

  section('7. Consent still blocks the send');
  const contact = await CrmContact.create({ firstName: 'Meera', phone: '9770601470', whatsappOptIn: false });
  const blocked = await messaging.sendMessage({
    channel: 'whatsapp', contactId: contact._id, body: 'hi', contentSid: 'HXx000000000000000000000000000001',
  });
  await messaging.deliver({ messageId: String(blocked._id) });
  const after = await CrmMessage.findById(blocked._id);
  check('opted-out contact is not messaged', after.status === 'failed', `got ${after.status}`);
  check('block reason is recorded', /consent|DND/i.test(after.failReason || ''), after.failReason);

  section('8. SMS is unaffected by the WhatsApp window');
  const sms = await messaging.sendMessage({ channel: 'sms', leadId: lead._id, body: 'SMS works any time' });
  check('SMS queues regardless of the WhatsApp window', !!sms && !sms.contentSid);

  section('9. Replies the webhook never delivered are recovered');
  // The real failure: the sandbox inbound URL was never set, so Twilio answered
  // customers with its own canned message and the CRM never saw the reply.
  // Twilio still has them, so poll for what the webhook missed.
  await CrmMessage.deleteMany({});
  twilioInbox = [
    { sid: 'SMrec2', direction: 'inbound', from: 'whatsapp:+919770601469', body: 'I am fine', date_created: new Date().toUTCString() },
    { sid: 'SMrec1', direction: 'inbound', from: 'whatsapp:+919770601469', body: 'How are you', date_created: new Date().toUTCString() },
    { sid: 'SMout', direction: 'outbound-api', from: 'whatsapp:+14155238886', body: 'ours', date_created: new Date().toUTCString() },
  ];
  const rec = await messaging.reconcileInboundWhatsapp();
  check('missed replies are imported', rec.imported === 2, JSON.stringify(rec));
  check('our own outbound messages are not imported',
    (await CrmMessage.countDocuments({ direction: 'inbound' })) === 2);

  const recovered = await CrmMessage.find({ direction: 'inbound' }).sort({ createdAt: 1 }).lean();
  check('oldest reply is recorded first',
    recovered[0] && recovered[0].body === 'How are you', recovered[0] && recovered[0].body);
  check('the Twilio SID is kept for dedupe', recovered.every((m) => m.providerMessageId));

  const again = await messaging.reconcileInboundWhatsapp();
  check('re-running imports nothing', again.imported === 0, JSON.stringify(again));

  // A recovered reply must also reopen the 24-hour window.
  check('a recovered reply opens the window', await messaging.isWaWindowOpen('919770601469'));

  console.log(`\n${'='.repeat(52)}`);
  console.log(`  ${pass} passed, ${fail} failed`);
  if (fail) console.log(`\n  Failures:\n${failures.map((n) => `    - ${n}`).join('\n')}`);
  console.log(`${'='.repeat(52)}\n`);

  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('Harness error:', e); process.exit(1); });
