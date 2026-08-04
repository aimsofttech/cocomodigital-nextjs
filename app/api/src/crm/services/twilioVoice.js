'use strict';

/**
 * Twilio Voice — the single place this project talks to Twilio's REST API and
 * the single place TwiML is generated.
 *
 * Everything voice-related funnels through here so that credentials, retry
 * policy, phone normalisation and the public callback URLs are defined once.
 * Routes stay thin: they decide *whether* to call, this decides *how*.
 */

const twilio = require('twilio');
const logger = require('../../utils/logger');

const { VoiceResponse } = twilio.twiml;

/* ── Configuration ──────────────────────────────────────────────────────── */

const cfg = () => ({
  accountSid: process.env.TWILIO_ACCOUNT_SID || '',
  authToken: process.env.TWILIO_AUTH_TOKEN || '',
  // Prefer an API Key pair over the account auth token for REST calls: a leaked
  // key can be revoked on its own, a leaked auth token means rotating the one
  // secret that also verifies every webhook signature.
  apiKeySid: process.env.TWILIO_API_KEY_SID || '',
  apiKeySecret: process.env.TWILIO_API_KEY_SECRET || '',
  from: process.env.TWILIO_VOICE_FROM || process.env.TWILIO_PHONE_NUMBER || '',
  publicUrl: (process.env.API_PUBLIC_URL || '').replace(/\/+$/, ''),
  // Twilio bills per-second after the first minute; recording is opt-in because
  // two-party consent laws (and Indian TRAI guidance) require an announcement.
  recordCalls: process.env.TWILIO_RECORD_CALLS !== 'false',
  recordingAnnouncement: process.env.TWILIO_RECORDING_ANNOUNCEMENT
    || 'This call may be recorded for quality and training purposes.',
  machineDetection: process.env.TWILIO_MACHINE_DETECTION !== 'false',
  callTimeoutSec: Number(process.env.TWILIO_CALL_TIMEOUT_SEC || 30),
  // Hard stop on a runaway call. Twilio caps this per account rather than at a
  // fixed maximum — a trial account rejects anything above 899s with error
  // 13216 and refuses to place the call at all. 899 is therefore the safe
  // default: it works on trial and paid alike, and createCall() drops the
  // parameter entirely if an account caps it even lower.
  maxCallSec: Number(process.env.TWILIO_MAX_CALL_SEC || 899),
});

/** REST credentials are usable; note this says nothing about *voice* being set up. */
const hasCredentials = () => {
  const c = cfg();
  return Boolean(c.accountSid && (c.authToken || (c.apiKeySid && c.apiKeySecret)));
};

/** Fully configured for outbound voice, including a reachable callback host. */
const isVoiceReady = () => {
  const c = cfg();
  return Boolean(hasCredentials() && c.from && c.publicUrl);
};

/**
 * Why voice is not ready — surfaced to the UI and the health endpoint so an
 * operator gets a specific cause instead of a silent fallback to tel: links.
 */
const readiness = () => {
  const c = cfg();
  const missing = [];
  if (!c.accountSid) missing.push('TWILIO_ACCOUNT_SID');
  if (!c.authToken && !(c.apiKeySid && c.apiKeySecret)) missing.push('TWILIO_AUTH_TOKEN (or TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET)');
  if (!c.from) missing.push('TWILIO_VOICE_FROM');
  if (!c.publicUrl) missing.push('API_PUBLIC_URL');
  const warnings = [];
  if (c.publicUrl && !c.publicUrl.startsWith('https://')) {
    warnings.push('API_PUBLIC_URL is not HTTPS — Twilio will refuse to post webhooks to it.');
  }
  if (c.publicUrl && /localhost|127\.0\.0\.1/.test(c.publicUrl)) {
    warnings.push('API_PUBLIC_URL points at localhost — Twilio cannot reach it. Use a tunnel or the deployed host.');
  }
  if (process.env.TWILIO_VALIDATE_WEBHOOKS === 'false') {
    warnings.push('TWILIO_VALIDATE_WEBHOOKS=false — webhook signatures are NOT being verified. Never ship this.');
  }
  if (apiKeyDemoted) {
    warnings.push(`TWILIO_API_KEY_SID ${c.apiKeySid} is rejected by Twilio — running on TWILIO_AUTH_TOKEN instead. Recreate the key or blank both API-key variables.`);
  }
  if (lastProbe && !lastProbe.ok) {
    warnings.push(`API_PUBLIC_URL is unreachable (${lastProbe.reason}) — Twilio cannot fetch call TwiML or deliver status callbacks.`);
  }
  return {
    ready: missing.length === 0,
    missing,
    warnings,
    from: c.from,
    publicUrl: c.publicUrl,
    publicUrlReachable: lastProbe ? lastProbe.ok : null,
  };
};

/**
 * Actually try to reach API_PUBLIC_URL from the outside.
 *
 * readiness() only checks the variable is set and looks like HTTPS, so a stale
 * tunnel URL — the usual state of a `trycloudflare` host after a restart —
 * passes as "voice ready" while every call dies the moment Twilio tries to
 * fetch the TwiML. Twilio fetches this host for TwiML *and* posts every status
 * callback to it, so if it is dark, calling is broken no matter what else is
 * configured. Probed at boot, reported, never fatal.
 */
/**
 * Result of the most recent probe, so every caller shares one answer instead of
 * re-probing (which would add seconds of latency to placing a call). `null`
 * until the first probe completes — never treated as a failure, because
 * "unknown" must not block calling.
 */
let lastProbe = null;

const probePublicUrl = async ({ timeoutMs = 8000 } = {}) => {
  const c = cfg();
  if (!c.publicUrl) {
    lastProbe = { ok: false, reason: 'API_PUBLIC_URL is not set', at: new Date() };
    return lastProbe;
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  // Probe the CRM prefix, not the origin root. Every callback URL is built from
  // this prefix, and in production it is the ONLY part of this app the reverse
  // proxy forwards — the server-root /health belongs to the Next.js site there,
  // so probing it would report calling as broken while it works fine.
  const target = url('/health');
  try {
    const res = await fetch(target, { method: 'GET', signal: ctrl.signal });
    lastProbe = res.ok
      ? { ok: true, url: target, at: new Date() }
      : { ok: false, reason: `responded HTTP ${res.status}`, url: target, at: new Date() };
    return lastProbe;
  } catch (err) {
    const reason = err.name === 'AbortError' ? `no response in ${timeoutMs / 1000}s` : err.message;
    lastProbe = { ok: false, reason, url: target, at: new Date() };
    return lastProbe;
  } finally {
    clearTimeout(t);
  }
};

/**
 * Last known reachability of API_PUBLIC_URL.
 *
 * Twilio fetches the call's TwiML from this host the moment the phone is
 * answered, and posts every status callback to it. When it is dark, a placed
 * call still rings — then drops the answerer into dead air and never reports a
 * status, which reads to an agent as "calling is broken" with nothing in the
 * logs to say why. A tunnel URL that changes on every restart makes this the
 * normal state in development, not an edge case.
 */
const publicUrlHealth = () => lastProbe;

/**
 * Set once an API key has been proven bad, so we stop preferring it.
 *
 * An API key secret is displayed exactly once at creation, so a mis-copied or
 * rotated secret is the single most common Twilio misconfiguration — and the
 * most damaging, because the key takes priority over the account auth token.
 * A dead key therefore *masks* a perfectly working token and every REST call
 * dies with 20003 "Authenticate", while readiness() still reports voice ready.
 * Demoting lets calling carry on with the token instead of failing outright.
 */
let apiKeyDemoted = false;

/**
 * Which username/password pair to authenticate REST calls with.
 *
 * An API key is only usable when BOTH halves are present — a half-configured
 * key (SID set, secret blank) must fall back to the account token rather than
 * pairing the key SID with the account token, which authenticates as neither
 * and fails with a 401 that looks like a credential typo.
 */
const restCredentials = () => {
  const c = cfg();
  return c.apiKeySid && c.apiKeySecret && !apiKeyDemoted
    ? { user: c.apiKeySid, pass: c.apiKeySecret }
    : { user: c.accountSid, pass: c.authToken };
};

/** True when an API key is configured and still being preferred. */
const usingApiKey = () => {
  const c = cfg();
  return Boolean(c.apiKeySid && c.apiKeySecret && !apiKeyDemoted);
};

let client = null;
/** Lazily built so the module can be required even with Twilio unconfigured. */
const getClient = () => {
  if (client) return client;
  const c = cfg();
  if (!hasCredentials()) throw new Error('Twilio is not configured');
  const { user, pass } = restCredentials();
  client = twilio(user, pass, { accountSid: c.accountSid });
  return client;
};

/** Reset the memoised client — used after a settings change or in tests. */
const resetClient = () => { client = null; };

/**
 * Stop using the API key and rebuild the client on the account auth token.
 * Returns false when there is no token to fall back to.
 */
const demoteApiKey = (reason) => {
  const c = cfg();
  if (apiKeyDemoted || !c.authToken) return false;
  apiKeyDemoted = true;
  resetClient();
  logger.error(
    `Twilio API key ${c.apiKeySid} was rejected (${reason}). Falling back to TWILIO_AUTH_TOKEN so calling `
    + 'keeps working. Fix it properly: an API key secret is shown only once, so recreate the key in '
    + 'Console → Account → API keys & tokens and update TWILIO_API_KEY_SECRET, or blank both '
    + 'TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET in .env.'
  );
  return true;
};

/**
 * Prove the configured REST credentials actually authenticate.
 *
 * readiness() only checks the variables are *present*. A rejected API key looks
 * identical to a working one until the first call is placed, at which point the
 * agent gets an opaque "Twilio authentication failed" and the call never
 * reaches Twilio at all. Probing at boot converts that into one clear log line
 * — and demotes a dead key so calling still works.
 */
const verifyCredentials = async () => {
  const c = cfg();
  if (!hasCredentials()) return { ok: false, reason: 'not configured' };
  const probe = async () => {
    const { user, pass } = restCredentials();
    const auth = Buffer.from(`${user}:${pass}`).toString('base64');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${c.accountSid}.json`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    return res.status;
  };
  try {
    let status = await probe();
    if (status === 401 && usingApiKey() && demoteApiKey('HTTP 401')) {
      status = await probe();
      if (status < 400) return { ok: true, credential: 'auth_token', demoted: true };
    }
    if (status < 400) return { ok: true, credential: usingApiKey() ? 'api_key' : 'auth_token' };
    return { ok: false, reason: `HTTP ${status}`, credential: usingApiKey() ? 'api_key' : 'auth_token' };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
};

/* ── URLs ───────────────────────────────────────────────────────────────── */

// Built from the publicly reachable prefix, which is not always the local
// mount — see crm/publicUrl.js.
const { crmUrl: url } = require('../publicUrl');

const URLS = {
  // TwiML the outbound call executes once answered.
  outboundTwiml: (callId) => url(`/voice/outbound/${callId}`),
  autoTwiml: (callId) => url(`/voice/auto/${callId}`),
  gather: (callId, step) => url(`/voice/auto/${callId}/gather/${step}`),
  // Lifecycle events for the parent (agent-leg) call.
  status: () => url('/webhooks/twilio/call-status'),
  // Lifecycle for the child (customer-leg) of a bridged call.
  dialStatus: (callId) => url(`/webhooks/twilio/dial-status/${callId}`),
  recordingStatus: () => url('/webhooks/twilio/recording-status'),
  inbound: () => url('/voice/inbound'),
  // Where <Dial> hands control back once the agent leg of an inbound call ends.
  // Unlike a statusCallback this MUST return TwiML — Twilio executes whatever
  // comes back, and the verbs after <Dial> never run when `action` is set.
  inboundDialResult: (callId) => url(`/voice/inbound/${callId}/dial-result`),
  fallback: () => url('/voice/fallback'),
  // Public URL of the authenticated recording proxy, stored on the call record.
  recordingProxy: (callId) => url(`/calls/${callId}/recording`),
};

/* ── Phone helpers ──────────────────────────────────────────────────────── */

/**
 * Normalise to E.164 (`+<country><subscriber>`). Twilio rejects anything else
 * on voice calls, and a number stored as "098765 43210" is the single most
 * common cause of a 21211 "invalid To number" error.
 */
const toE164 = (phone, defaultCountryCode = '91') => {
  if (!phone) return null;
  const raw = String(phone).trim();
  const hadPlus = raw.startsWith('+');
  let digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;
  if (!hadPlus) {
    // Common Indian formats: leading 0 (STD prefix) or a bare 10-digit mobile.
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    if (digits.length === 10) digits = String(defaultCountryCode) + digits;
    // "0091..." style international prefix.
    if (digits.startsWith('00')) digits = digits.slice(2);
  }
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
};

/** Never log a full customer number — keep the last four for correlation. */
const maskPhone = (phone) => {
  const s = String(phone || '');
  return s.length <= 4 ? '****' : `${s.slice(0, 3)}****${s.slice(-4)}`;
};

/* ── Error mapping ──────────────────────────────────────────────────────── */

/**
 * Twilio's numeric error codes, translated into something an agent can act on.
 * Anything unmapped falls back to Twilio's own message.
 * https://www.twilio.com/docs/api/errors
 */
const ERROR_HINTS = {
  13223: 'The dialled number is not a valid phone number.',
  13224: 'Twilio cannot call this number — it may be a premium or restricted range.',
  13225: 'Calls to this destination are blocked by your Geo Permissions. Enable the country in Twilio Console → Voice → Geographic Permissions.',
  21205: 'The From number is not a valid Twilio number.',
  21210: 'The From number is not owned by this Twilio account, or is not voice-enabled.',
  21211: 'The To number is not a valid E.164 phone number.',
  21214: 'The To number is not verified. Trial accounts can only call verified numbers — verify it in Console → Phone Numbers → Verified Caller IDs, or upgrade the account.',
  21215: 'Your account is not permitted to call this country. Enable it in Voice → Geographic Permissions.',
  21216: 'The From number cannot make calls to this destination.',
  21217: 'The dialled number does not appear to exist.',
  21219: 'The To number is unverified — trial accounts may only call verified numbers.',
  21601: 'The From number is not a valid, SMS/voice-capable Twilio number.',
  21606: 'The From number is not a Twilio number you own, or is not enabled for outbound calls.',
  31920: 'Answering-machine detection timed out.',
  32001: 'Twilio could not reach your Voice URL — check API_PUBLIC_URL and that the webhook is publicly reachable.',
  11200: 'Twilio could not fetch your TwiML: the webhook returned an error or timed out.',
  11205: 'Twilio could not connect to your webhook host (HTTP connection failure).',
  11206: 'Your webhook URL must use HTTPS on a publicly trusted certificate.',
  13214: 'The Dial verb had an invalid callerId.',
  20003: 'Twilio authentication failed — check TWILIO_ACCOUNT_SID / auth token or API key.',
  20404: 'The Twilio resource was not found (wrong Call SID or account).',
  20429: 'Too many requests — you are exceeding Twilio\'s concurrency or rate limit.',
};

const describeError = (err) => {
  const code = err && (err.code || err.status);
  const hint = ERROR_HINTS[Number(code)];
  return {
    errorCode: code ? String(code) : null,
    errorMessage: hint || (err && err.message) || 'Unknown Twilio error',
    // Twilio marks transient problems 5xx / 429; those are worth another try,
    // a "number does not exist" is not.
    retryable: Boolean(
      code === 20429 || code === 20500 || code === 20503
      || (err && err.status >= 500)
      || (err && /ETIMEDOUT|ECONNRESET|ENOTFOUND|EAI_AGAIN/.test(String(err.code)))
    ),
  };
};

/** Terminal Twilio CallStatus values that mean "worth dialling again later". */
const RETRYABLE_STATUSES = new Set(['no-answer', 'busy', 'failed', 'canceled']);

/* ── REST calls ─────────────────────────────────────────────────────────── */

/**
 * Small retry wrapper around a Twilio REST call. Twilio's own SDK does not
 * retry, and a single 429 during a bulk campaign would otherwise drop a lead
 * on the floor.
 */
const withRetry = async (fn, { attempts = 3, baseDelayMs = 500 } = {}) => {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!describeError(err).retryable || i === attempts - 1) break;
      const delay = baseDelayMs * Math.pow(2, i) + Math.floor(Math.random() * 250);
      logger.warn(`Twilio call attempt ${i + 1} failed (${err.code || err.message}); retrying in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
};

/**
 * Place an outbound call.
 *
 * `to` is who Twilio rings first. For a bridged click-to-call that is the
 * *agent*, and the customer is dialled by the TwiML at `twimlUrl`; for an
 * automated call it is the customer directly.
 */
/**
 * Create the call, surviving an over-long TimeLimit.
 *
 * TimeLimit has no fixed maximum — Twilio caps it per account, and on a trial
 * account the ceiling is 899s (15 minutes). Anything above it is rejected with
 * 13216 *before the call is placed*, so a single wrong env var silently breaks
 * every outbound call: `TWILIO_MAX_CALL_SEC=3600` did exactly that here.
 *
 * TimeLimit is only a safety cap on runaway calls, never something the call
 * needs in order to connect. So when Twilio refuses the value, drop it and
 * place the call anyway rather than failing the agent for a tuning parameter.
 */
const createCall = async (params) => {
  try {
    return await getClient().calls.create(params);
  } catch (err) {
    // A rejected API key masks a working auth token and kills every call with
    // an opaque 20003. Demote and place the call on the token rather than
    // losing the agent's call to a credential they cannot see.
    if (err && (Number(err.code) === 20003 || err.status === 401)
      && usingApiKey() && demoteApiKey(`error ${err.code || err.status} while placing a call`)) {
      return getClient().calls.create(params);
    }
    if (err && err.code === 13216 && params.timeLimit) {
      logger.warn(
        `Twilio rejected TimeLimit=${params.timeLimit} (13216) — this account caps it lower `
        + '(trial accounts allow at most 899s). Placing the call without a time limit. '
        + 'Set TWILIO_MAX_CALL_SEC to 899 or less to remove this retry.'
      );
      const { timeLimit, ...rest } = params;
      return getClient().calls.create(rest);
    }
    throw err;
  }
};

const placeCall = async ({ to, twimlUrl, statusCallback, machineDetection = false, timeoutSec, record = false }) => {
  const c = cfg();
  const params = {
    to,
    from: c.from,
    url: twimlUrl,
    method: 'POST',
    // If our TwiML endpoint 500s or times out, Twilio fetches this instead of
    // dropping the caller into dead air.
    fallbackUrl: URLS.fallback(),
    fallbackMethod: 'POST',
    statusCallback: statusCallback || URLS.status(),
    statusCallbackMethod: 'POST',
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    timeout: timeoutSec || c.callTimeoutSec,
    timeLimit: c.maxCallSec,
  };
  if (record) {
    params.record = true;
    params.recordingStatusCallback = URLS.recordingStatus();
    params.recordingStatusCallbackMethod = 'POST';
    params.recordingStatusCallbackEvent = ['completed'];
    // Dual channel keeps agent and customer on separate stereo tracks, which is
    // what any downstream transcription/QA tooling expects.
    params.recordingChannels = 'dual';
  }
  if (machineDetection) {
    // 'DetectMessageEnd' waits for the beep so an automated message is not
    // talking over the greeting. It costs a few extra seconds of ring time.
    params.machineDetection = 'DetectMessageEnd';
    params.machineDetectionTimeout = 15;
    params.asyncAmd = 'false';
  }
  return withRetry(() => createCall(params));
};

/** Hang up / cancel a call that is still queued, ringing or in progress. */
const endCall = async (callSid) => {
  try {
    return await getClient().calls(callSid).update({ status: 'completed' });
  } catch (err) {
    // 20404 = already finished; that is the desired end state, not a failure.
    if (Number(err.code) === 20404) return null;
    throw err;
  }
};

const fetchCall = (callSid) => getClient().calls(callSid).fetch();

/**
 * Delete a recording from Twilio's storage. Called when a call record is
 * deleted so customer audio does not outlive the CRM row that justified it.
 */
const deleteRecording = async (recordingSid) => {
  try {
    await getClient().recordings(recordingSid).remove();
    return true;
  } catch (err) {
    if (Number(err.code) === 20404) return true;
    logger.error(`Failed to delete Twilio recording ${recordingSid}: ${err.message}`);
    return false;
  }
};

/**
 * Stream a recording through our own API.
 *
 * Twilio's RecordingUrl requires HTTP basic auth, so handing it to an <audio>
 * tag in the browser either fails or forces us to embed account credentials in
 * frontend code. Proxying keeps the credentials server-side and lets the normal
 * CRM permission check decide who may listen.
 */
const fetchRecordingStream = async (recordingSid) => {
  const c = cfg();
  const { user, pass } = restCredentials();
  const auth = Buffer.from(`${user}:${pass}`).toString('base64');
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${c.accountSid}/Recordings/${recordingSid}.mp3`,
    { headers: { Authorization: `Basic ${auth}` } }
  );
  if (!res.ok) throw new Error(`Twilio recording fetch failed: ${res.status}`);
  return res;
};

/* ── TwiML builders ─────────────────────────────────────────────────────── */

const escapeXml = (s) => String(s || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/**
 * Bridged click-to-call: the agent has picked up, now ring the customer.
 * `callerId` must be a Twilio number we own, otherwise Twilio rejects with
 * 13214 — we never pass the agent's personal number through.
 */
const bridgeTwiml = ({ toNumber, callId, record, announcement, timeoutSec }) => {
  const c = cfg();
  const vr = new VoiceResponse();
  if (record && announcement) vr.say({ voice: 'Polly.Aditi', language: 'en-IN' }, announcement);
  const dial = vr.dial({
    callerId: c.from,
    timeout: timeoutSec || c.callTimeoutSec,
    timeLimit: c.maxCallSec,
    answerOnBridge: true,          // agent hears real ringback, not silence
    ...(record ? {
      record: 'record-from-answer-dual',
      recordingStatusCallback: URLS.recordingStatus(),
      recordingStatusCallbackMethod: 'POST',
      recordingStatusCallbackEvent: 'completed',
    } : {}),
  });
  dial.number({
    statusCallback: URLS.dialStatus(callId),
    statusCallbackMethod: 'POST',
    statusCallbackEvent: 'initiated ringing answered completed',
  }, toNumber);
  return vr.toString();
};

/**
 * Render a stored CrmCallScript into TwiML for an automated call.
 *
 * Steps run in order until one of them transfers control (gather / record /
 * dial / hangup): those post back to the CRM, which then decides what comes
 * next, so the script is effectively a state machine driven by webhooks.
 */
const scriptTwiml = ({ script, callId, vars = {}, fromStep = 0, answeredBy }) => {
  const vr = new VoiceResponse();
  const voice = (script && script.voice) || 'Polly.Aditi';
  const language = (script && script.language) || 'en-IN';
  const render = (t) => String(t || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) => {
    const v = k.split('.').reduce((o, part) => (o == null ? undefined : o[part]), vars);
    return v === undefined || v === null ? '' : escapeXml(String(v));
  });

  // A machine picked up: leave the short voicemail variant, never the
  // interactive script (nobody is there to press a key).
  if (answeredBy && answeredBy.startsWith('machine')) {
    if (script && script.voicemailText) {
      vr.say({ voice, language }, render(script.voicemailText));
    }
    vr.hangup();
    return vr.toString();
  }

  const steps = (script && script.steps) || [];
  for (let i = fromStep; i < steps.length; i++) {
    const step = steps[i];
    if (step.kind === 'say') {
      vr.say({ voice, language }, render(step.text));
    } else if (step.kind === 'play') {
      vr.play({}, step.url);
    } else if (step.kind === 'gather') {
      const g = vr.gather({
        input: 'dtmf',
        numDigits: step.numDigits || 1,
        timeout: step.timeoutSec || 5,
        action: URLS.gather(callId, i),
        method: 'POST',
        actionOnEmptyResult: true,
      });
      g.say({ voice, language }, render(step.text));
      // Control leaves us here — the gather action decides what follows.
      return vr.toString();
    } else if (step.kind === 'record') {
      vr.record({
        maxLength: step.maxLengthSec || 30,
        playBeep: true,
        recordingStatusCallback: URLS.recordingStatus(),
        recordingStatusCallbackMethod: 'POST',
        action: URLS.gather(callId, i),
        method: 'POST',
      });
      return vr.toString();
    } else if (step.kind === 'dial') {
      const d = vr.dial({ callerId: cfg().from, timeout: cfg().callTimeoutSec, answerOnBridge: true });
      d.number({}, step.transferTo);
      return vr.toString();
    } else if (step.kind === 'hangup') {
      vr.hangup();
      return vr.toString();
    }
  }
  vr.hangup();
  return vr.toString();
};

/** Generic spoken response — used by the inbound handler and the fallback URL. */
const sayTwiml = (text, { hangup = true, voice = 'Polly.Aditi', language = 'en-IN' } = {}) => {
  const vr = new VoiceResponse();
  vr.say({ voice, language }, text);
  if (hangup) vr.hangup();
  return vr.toString();
};

/** Append the voicemail prompt + <Record> to an existing response. */
const appendVoicemail = (vr, text) => {
  vr.say({ voice: 'Polly.Aditi', language: 'en-IN' },
    text || 'Sorry, no one is available right now. Please leave a message after the beep.');
  vr.record({
    maxLength: 120,
    playBeep: true,
    recordingStatusCallback: URLS.recordingStatus(),
    recordingStatusCallbackMethod: 'POST',
    recordingStatusCallbackEvent: 'completed',
  });
  vr.hangup();
  return vr;
};

/** Voicemail: greet, record, hang up. Used when no agent takes an inbound call. */
const voicemailTwiml = (text) => appendVoicemail(new VoiceResponse(), text).toString();

/**
 * Inbound: ring the agents, then hand control to the dial-result endpoint.
 *
 * The `action` URL is required rather than relying on fall-through. Without it
 * Twilio resumes the TwiML *after* <Dial> once the agent hangs up, so a caller
 * who just finished a perfectly good conversation would be told nobody was
 * available and dropped into voicemail. With it, dial-result branches on
 * DialCallStatus and only offers voicemail when the dial genuinely failed.
 */
const inboundTwiml = ({ greeting, agentNumbers = [], voicemailText, callId, record }) => {
  const c = cfg();
  const vr = new VoiceResponse();
  if (greeting) vr.say({ voice: 'Polly.Aditi', language: 'en-IN' }, greeting);
  // Nobody to ring — go straight to voicemail rather than emitting an empty
  // <Dial>, which Twilio rejects.
  if (!agentNumbers.length) return appendVoicemail(vr, voicemailText).toString();
  const dial = vr.dial({
    callerId: c.from,
    timeout: c.callTimeoutSec,
    answerOnBridge: true,
    action: URLS.inboundDialResult(callId),
    method: 'POST',
    ...(record ? {
      record: 'record-from-answer-dual',
      recordingStatusCallback: URLS.recordingStatus(),
      recordingStatusCallbackMethod: 'POST',
      recordingStatusCallbackEvent: 'completed',
    } : {}),
  });
  // Several <Number> children ring simultaneously; first to answer wins.
  for (const n of agentNumbers) {
    dial.number({
      statusCallback: URLS.dialStatus(callId),
      statusCallbackMethod: 'POST',
      statusCallbackEvent: 'initiated ringing answered completed',
    }, n);
  }
  return vr.toString();
};

/* ── Status mapping ─────────────────────────────────────────────────────── */

/** Twilio CallStatus → CrmCall.status. */
const STATUS_MAP = {
  queued: 'queued',
  initiated: 'initiated',
  ringing: 'ringing',
  'in-progress': 'in_progress',
  completed: 'completed',
  busy: 'busy',
  'no-answer': 'no_answer',
  failed: 'failed',
  canceled: 'cancelled',
};

const mapStatus = (twilioStatus) => STATUS_MAP[twilioStatus] || null;

const TERMINAL_STATUSES = new Set(['completed', 'busy', 'no_answer', 'failed', 'cancelled']);

module.exports = {
  cfg,
  hasCredentials,
  isVoiceReady,
  readiness,
  probePublicUrl,
  publicUrlHealth,
  verifyCredentials,
  usingApiKey,
  getClient,
  resetClient,
  URLS,
  toE164,
  maskPhone,
  describeError,
  ERROR_HINTS,
  RETRYABLE_STATUSES,
  placeCall,
  endCall,
  fetchCall,
  deleteRecording,
  fetchRecordingStream,
  bridgeTwiml,
  scriptTwiml,
  sayTwiml,
  inboundTwiml,
  voicemailTwiml,
  mapStatus,
  TERMINAL_STATUSES,
};
