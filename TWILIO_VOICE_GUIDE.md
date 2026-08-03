# Twilio Voice + Automated Calling — Cocoma CRM

Everything needed to run production voice calling in this CRM: what was built, what
your Twilio account actually looks like today, the exact console settings to change,
and how to test and deploy it.

---

## 1. Audit of your live Twilio account

The screenshot you sent is the **Organization settings** page. It shows billing-group
and SSO structure and tells you nothing about voice, so I queried the account through
the REST API instead. These are facts read from Twilio on 2026-08-03, not inferences.

| Item | Value | Verdict |
|---|---|---|
| Account type | **Trial** | ❌ Blocks production |
| Account status | active | ✅ |
| Balance | $9.38 | ⚠️ ~3 hours of India mobile calling |
| Phone numbers | 1 — `+1 785 336 9380` (US, voice-capable) | ⚠️ US number calling India |
| Number's Voice URL | `https://demo.twilio.com/welcome/voice/` | ❌ Still Twilio's demo |
| Number's Fallback URL | not set | ❌ |
| Number's status callback | not set | ❌ |
| Verified caller IDs | 1 — `+91 97706 01469` | ❌ Trial can call **only** this number |
| Calls placed, all time | 0 | — |
| Geo permission: India | low-risk numbers **enabled** | ✅ |
| Geo permission: US/Canada | low-risk numbers **enabled** | ✅ |
| Outbound price, US → India mobile | $0.0496/min | — |

**Verdict: not production-ready.** Four blockers, in priority order:

1. **`API_PUBLIC_URL` points at the wrong host.** It is set to
   `https://cocomadigital.com`, which serves your marketing site. I probed it:
   `POST https://cocomadigital.com/crm/api/webhooks/twilio/call-status` returns
   **404 with the Next.js HTML error page**. Twilio cannot reach the API there, so no
   status callback, no duration, no recording, no retry, and automated calls fail
   outright. Fix this first — nothing else matters until webhooks land. See §3.1.
2. **Trial account.** You can only call `+91 97706 01469`. Every other number fails
   with error `21219`. Upgrade before onboarding agents (§3.2).
3. **The number's Voice URL is still Twilio's demo.** Inbound callers hear a Twilio
   demo message; the CRM never sees the call (§3.4).
4. **A US number calling Indian leads.** It works and geo permissions allow it, but
   Indian recipients see an unknown US caller ID — expect low answer rates and spam
   flagging. Buying an Indian number requires KYC and a registered address (§3.3).

---

## 2. What was built

The CRM already had partial voice support: a raw-`fetch` click-to-call, one status
webhook and signature verification. That has been replaced with a full stack.

### Backend

```
app/api/src/crm/
├── services/
│   ├── twilioVoice.js      NEW  Twilio SDK wrapper: config, readiness, E.164,
│   │                            error mapping, REST calls w/ retry, all TwiML
│   ├── callEngine.js       NEW  Orchestration: dial, retry policy, quiet hours,
│   │                            do-not-call, campaign runner, post-call bookkeeping
│   ├── workers.js          EDIT +call:auto-dial, +campaign:run, +calls:reconcile
│   └── settings.js         EDIT +callWindowStart/End, +automatedCallingEnabled
├── routes/
│   ├── voice.js            NEW  Public TwiML: outbound bridge, auto script,
│   │                            DTMF gather, inbound, fallback
│   ├── calls.js            EDIT SDK-backed dial + config/history/stats/start/
│   │                            bulk/hangup/retry/recording/scripts/campaigns
│   ├── webhooks.js         EDIT call-status hardened, +dial-status, +recording-status
│   └── index.js            EDIT mounts /voice
├── models/
│   ├── engagement.js       EDIT CrmCall extended; +CrmCallScript, +CrmCallCampaign
│   └── crm.js              EDIT +doNotCall on leads and contacts
└── middleware/
    └── twilioSignature.js  (unchanged — already correct)
```

### Frontend

```
app/crm/src/
├── components/calls/index.tsx   NEW  CallButton (live polling + hang up),
│                                     CallHistory, RecordingPlayer,
│                                     VoiceSetupBanner, useCallConfig
├── pages/leads/LeadDetail.tsx   EDIT Call button + Call history card + DNC notice
└── pages/calls/CallsPage.tsx    EDIT Tabs: Calls | Campaigns | Scripts
```

`twilio@^6` was added to `app/api/package.json`.

### Why calls are bridged, not direct

Click-to-call rings **the agent first**, and only when they answer does the TwiML dial
the lead. This means the lead never hears dead air waiting for a human, and the agent's
personal mobile number is never exposed — the lead's phone shows your Twilio number.
The trade-off is two billed legs per conversation.

---

## 3. Twilio console configuration — every setting

### 3.0 Local development (fastest route to a working call)

Twilio calls *you*. It fetches TwiML mid-call and posts status callbacks, so
`localhost` is unreachable — a call would connect and then sit in silence. A
tunnel gives `localhost:5000` a temporary public HTTPS address.

**One-time install** (no account needed, unlike ngrok):

```bash
winget install --id Cloudflare.cloudflared
```

**Every session:**

```bash
# terminal 1 — the API
cd app/api && npm run dev

# terminal 2 — the tunnel
cloudflared tunnel --url http://127.0.0.1:5000
#   → https://<random-words>.trycloudflare.com
```

Or `npm run tunnel` from `app/api`.

> Use `127.0.0.1`, **not** `localhost`. On Windows cloudflared resolves
> `localhost` to `::1` and fails with
> `dial tcp [::1]:5000: connectex: No connection could be made`, which surfaces
> as a 502 on every webhook while the app is plainly healthy on
> `http://localhost:5000` in a browser.

Put that URL in `app/api/.env` and restart the API:

```env
API_PUBLIC_URL=https://<random-words>.trycloudflare.com
CRM_PUBLIC_PATH=/crm/api
```

Confirm the whole chain before touching the Twilio console:

```bash
cd app/api && node scripts/check-twilio.js
```

Two things that bite people here:

- **The URL changes every restart.** Cloudflare quick tunnels are ephemeral.
  Update `.env` *and* the Twilio console webhooks each time, or every webhook
  fails signature validation — the signature covers the URL Twilio called.
- **Never set `TWILIO_VALIDATE_WEBHOOKS=false` to "fix" that.** It disables the
  only thing stopping a stranger who guesses your tunnel URL from forging calls.

### 3.1 Fix the callback host (production)

Twilio must reach this API over public HTTPS. Decide where the API is deployed and set
`API_PUBLIC_URL` to that exact origin — typically an `api.` subdomain:

```env
API_PUBLIC_URL=https://api.cocomadigital.com
```

Verify before touching anything else:

```bash
curl -i -X POST https://api.cocomadigital.com/crm/api/voice/fallback -d 'CallSid=probe'
# Expect: 403 (signature missing) — that proves the route exists and is protected.
# A 404 with HTML means you are still hitting the marketing site.
```

For local development, tunnel instead:

```bash
ngrok http 5000
# then API_PUBLIC_URL=https://<id>.ngrok-free.app
```

`API_PUBLIC_URL` must have **no trailing slash** and must be HTTPS. Twilio refuses
plain HTTP and rejects self-signed certificates.

### 3.2 Upgrade from trial

Console → top-right account menu → **Upgrade**, then add a payment method and billing
address. Until you do:

* Only `+91 97706 01469` can be called; everything else fails with `21219`.
* Every call is prefixed with Twilio's "trial account" announcement.
* Balance is capped at your initial credit.

Then set **Billing → Auto-recharge**: trigger $10, recharge $20. A campaign that runs
the balance to zero mid-flight leaves half your leads uncalled.

### 3.3 Phone number (optional but recommended for India)

Console → **Phone Numbers → Manage → Buy a number**
* Country: India · Capabilities: ✅ Voice
* Indian numbers need a **Regulatory Bundle**: Console → Phone Numbers → Regulatory
  Compliance → Bundles → Create. Requires business proof and a local address; approval
  takes 2–5 business days.

Keep the US number as `TWILIO_SMS_FROM` if it already carries SMS traffic; voice can
use a different number via `TWILIO_VOICE_FROM`.

### 3.4 Configure the number's Voice settings

Console → **Phone Numbers → Manage → Active numbers → +1 785 336 9380 → Voice
Configuration**. Replace the demo URL:

| Field | Value |
|---|---|
| Configure with | Webhooks, TwiML Bins, Functions, Studio, or Proxy |
| **A CALL COMES IN** | Webhook · `https://api.cocomadigital.com/crm/api/voice/inbound` · **HTTP POST** |
| **PRIMARY HANDLER FAILS** | Webhook · `https://api.cocomadigital.com/crm/api/voice/fallback` · **HTTP POST** |
| **CALL STATUS CHANGES** | `https://api.cocomadigital.com/crm/api/webhooks/twilio/call-status` · **HTTP POST** |
| Caller ID Lookup | off (paid, not needed) |

Click **Save configuration**. The method must be POST — the signature check and all
handlers read `req.body`.

> Outbound calls do **not** use these fields. The API passes its own `url`,
> `statusCallback` and `fallbackUrl` on every `calls.create`, so outbound behaviour is
> code-controlled and cannot drift when someone edits the console.

### 3.5 Geographic permissions

Console → **Voice → Settings → Geographic Permissions**. Already correct on your
account (India and US/Canada low-risk enabled). Leave **high-risk special** and
**high-risk toll-fraud** ranges **disabled** — those are premium-rate ranges and the
usual vector for toll fraud running up thousands of dollars overnight.

### 3.6 Create an API Key (recommended)

Console → **Account → API keys & tokens → Create API key** · Friendly name
`cocoma-crm-voice` · Type **Standard** · Create.

Copy the SID and Secret into `TWILIO_API_KEY_SID` / `TWILIO_API_KEY_SECRET`. The code
prefers these over the auth token. A leaked API key is revoked on its own; a leaked
auth token forces you to rotate the one secret that also validates every webhook
signature, which breaks all webhooks the moment you rotate it.

Keep `TWILIO_AUTH_TOKEN` set regardless — signature validation requires it.

### 3.7 Voice Settings

Console → **Voice → Settings → General**
* **Enable Answering Machine Detection**: not needed here — the API requests AMD
  per-call via `machineDetection`.
* **Recording encryption**: optional; if enabled you must supply a public key and the
  recording proxy will need a decrypt step.
* **Voice Insights → Advanced Features**: optional paid add-on, useful for diagnosing
  call quality complaints.

### 3.8 Recording retention and compliance

Console → **Voice → Settings → Recording** — set retention to match your privacy
policy. Recordings contain customer PII and Twilio keeps them indefinitely by default.

`TWILIO_RECORD_CALLS=true` plays `TWILIO_RECORDING_ANNOUNCEMENT` before the customer
leg connects. Do not remove it: India's TRAI guidance and two-party-consent
jurisdictions require the disclosure. Deleting a call in the CRM also deletes its
Twilio recording, so audio never outlives the record justifying it.

---

## 4. Environment variables

Added to `app/api/.env.example` and `app/api/.env`:

```env
# REST credentials — prefer an API key over the auth token
TWILIO_API_KEY_SID=
TWILIO_API_KEY_SECRET=

# Recording (announcement is legally required in many jurisdictions)
TWILIO_RECORD_CALLS=true
TWILIO_RECORDING_ANNOUNCEMENT=This call may be recorded for quality and training purposes.

# Answering-machine detection for automated calls
TWILIO_MACHINE_DETECTION=true

# Ring timeout and a hard ceiling on call length
TWILIO_CALL_TIMEOUT_SEC=30
TWILIO_MAX_CALL_SEC=3600

# Automatic retry of unanswered/busy/failed calls
TWILIO_MAX_CALL_ATTEMPTS=3
TWILIO_RETRY_DELAY_MIN=30

# Campaign throttling
TWILIO_MAX_CONCURRENCY=5
CRM_MAX_CAMPAIGN_TARGETS=2000

# Inbound greeting
TWILIO_INBOUND_GREETING=
CRM_BRAND_NAME=Cocoma Digital
```

Already present and still required: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
`TWILIO_VOICE_FROM`, `API_PUBLIC_URL`, `TWILIO_VALIDATE_WEBHOOKS=true`.

**Secret handling.** `.env` is gitignored and must stay that way. In production inject
these through your process manager or secret store, never a file in the image. Rotate
`TWILIO_AUTH_TOKEN` if it has ever been pasted into a chat, ticket or screenshot —
that token can place calls billed to you.

---

## 5. Database schema

### `crm_calls` — extended

| Field | Type | Notes |
|---|---|---|
| `leadId` / `contactId` / `dealId` | ObjectId | who was called |
| `ownerId` | ObjectId | agent |
| `direction` | enum | `outbound` \| `inbound` |
| `mode` | enum | `bridge` \| `auto` \| `inbound` |
| `status` | enum | `scheduled`, `queued`, `initiated`, `ringing`, `in_progress`, `completed`, `no_answer`, `busy`, `failed`, `cancelled`, `missed`, `rescheduled` |
| `providerCallSid` | String | Twilio Call SID, indexed |
| `fromNumber` / `toNumber` | String | E.164 |
| `startedAt` / `endedAt` | Date | |
| `durationSec` | Number | from the customer leg, not the agent leg |
| `recordingSid` | String | |
| `recordingUrl` | String | points at **our** proxy, not Twilio |
| `recordingDurationSec` | Number | |
| `errorCode` | String | Twilio numeric code, e.g. `21219` |
| `errorMessage` | String | human-readable translation |
| `attemptNo` | Number | 1 for the first try |
| `retryOfId` | ObjectId | previous attempt in the chain |
| `retryScheduledAt` | Date | |
| `answeredBy` | String | `human`, `machine_end_beep`, … |
| `priceUsd` | Number | |
| `campaignId` / `scriptId` | ObjectId | |
| `responses[]` | `{at, digits, speech, step}` | keypresses on automated calls |
| `outcome` | enum | `interested`, `not_interested`, `callback_requested`, `converted`, `wrong_number`, `voicemail` |

Indexes: `{leadId, createdAt}`, `{contactId, createdAt}`, `{campaignId, status}`,
`{ownerId, createdAt}`, plus the existing sparse `providerCallSid`.

**A retry is a new document**, linked by `retryOfId` — not a mutation of the original.
Three attempts show as three rows, so the history reflects what actually happened
rather than only the last outcome.

### `crm_call_scripts` — new
`name`, `language`, `voice`, `voicemailText`, `isActive`, and `steps[]` of kind
`say` | `play` | `gather` | `record` | `dial` | `hangup`. A `gather` step carries
`branches` mapping a pressed digit to a CRM outcome, e.g. `{"1":"interested"}`.
`say`/`gather` text supports `{{firstName}}`, `{{name}}`, `{{company}}`, `{{agent}}`,
`{{brand}}`.

### `crm_call_campaigns` — new
`name`, `mode`, `scriptId`, `ownerId`, `status` (`draft`/`scheduled`/`running`/
`paused`/`completed`/`cancelled`), `startAt`, `windowStart`/`windowEnd`, `concurrency`,
`maxAttempts`, `retryDelayMin`, `stats{total,dialed,completed,failed,answered,machine}`
and a frozen `targets[]` array.

Targets are snapshotted at creation so editing a lead filter later cannot silently
widen a campaign that is already dialling.

### Leads / contacts
`doNotCall`, `doNotCallAt`, `lastCallAt` added to both. Contacts keep their existing
`dnd` flag, which also blocks voice.

**No migration is required** — every field is additive and Mongoose applies defaults on
write. Add the indexes at deploy time:

```js
db.crm_calls.createIndex({ leadId: 1, createdAt: -1 })
db.crm_calls.createIndex({ contactId: 1, createdAt: -1 })
db.crm_calls.createIndex({ campaignId: 1, status: 1 })
db.crm_calls.createIndex({ ownerId: 1, createdAt: -1 })
```

---

## 6. API reference

### Authenticated — `/crm/api/calls` (Bearer CRM JWT)

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/config` | `calls:read` | Is voice ready? drives the UI |
| GET | `/` | `calls:read` | List; filters `status,ownerId,leadId,contactId,mode,direction,campaignId,hasRecording,from,to` |
| GET | `/history?leadId=` | `calls:read` | Every attempt for one person |
| GET | `/stats?from=&to=` | `calls:read` | Volume, connect rate, talk time |
| POST | `/start` | `calls:create` | **Dial a lead now** (Leads module) |
| POST | `/` | `calls:create` | Schedule a call |
| POST | `/log` | `calls:create` | Log a manually-dialled call |
| POST | `/bulk` | `calls:bulk` | Create a bulk/scheduled campaign |
| GET | `/:id` | `calls:read` | One call |
| POST | `/:id/dial` | `calls:update` | Dial an existing scheduled call |
| POST | `/:id/hangup` | `calls:update` | End a live call |
| POST | `/:id/retry` | `calls:create` | `{now:true}` immediate, else queued |
| GET | `/:id/recording` | `calls:recordings` | Streams MP3 through the API |
| PUT | `/:id` | `calls:update` | Notes / outcome / mark complete |
| PATCH | `/:id/reschedule` · `/:id/cancel` | `calls:update` | |
| DELETE | `/:id` | `calls:delete` | Also deletes the Twilio recording |
| GET/POST/PUT/DELETE | `/scripts/list`, `/scripts`, `/scripts/:id` | `calls:*` | Call scripts |
| GET | `/campaigns/list`, `/campaigns/:id` | `calls:read` | |
| PATCH | `/campaigns/:id/{pause,resume,cancel}` | `calls:bulk` | Cancel also hangs up live calls |

Two new permissions: **`calls:bulk`** (Manager/Admin only — one agent placing one call
is routine, queueing a thousand robocalls is not) and **`calls:recordings`**.

### Public, signature-verified — no JWT

| Method | Path | Called by |
|---|---|---|
| POST | `/crm/api/voice/outbound/:callId` | Twilio, when the agent answers → bridges to the lead |
| POST | `/crm/api/voice/auto/:callId` | Twilio, automated call → renders the script |
| POST | `/crm/api/voice/auto/:callId/gather/:step` | Twilio, on a keypress |
| POST | `/crm/api/voice/inbound` | Twilio, on an incoming call |
| POST | `/crm/api/voice/fallback` | Twilio, when the primary TwiML URL errors |
| POST | `/crm/api/webhooks/twilio/call-status` | Twilio, parent-leg lifecycle |
| POST | `/crm/api/webhooks/twilio/dial-status/:callId` | Twilio, **customer**-leg lifecycle |
| POST | `/crm/api/webhooks/twilio/recording-status` | Twilio, when a recording is ready |

Every one validates `X-Twilio-Signature` (HMAC-SHA1 over the URL plus sorted POST
params) and is rate-limited at 1200 req/min.

**Why a separate `dial-status`:** on a bridged call the parent leg is the *agent*. It
reports `completed` even when the customer never picked up. Without the child-leg
callback the CRM would record every click-to-call as a successful conversation.

---

## 7. Call flows

**Click-to-call (bridge)**
```
Agent clicks Call
  → POST /calls/start                      creates CrmCall, status=queued
  → Twilio calls the AGENT
  → agent answers
  → Twilio POSTs /voice/outbound/:callId   → TwiML: announcement + <Dial> the lead
  → lead's phone rings (caller ID = your Twilio number)
  → /webhooks/twilio/dial-status/:callId   customer-leg ringing → in-progress → completed
  → /webhooks/twilio/call-status           parent leg completed  → finalizeCall()
  → /webhooks/twilio/recording-status      recordingSid stored
     finalizeCall → timeline entry, lead.callAttempts++, automation call.completed,
                    agent notified on failure, campaign counters updated
  → if unanswered and worth retrying → new CrmCall queued as attempt #2
```

**Automated (AI) call**
```
Campaign runner picks a target (inside the dialling window, under the concurrency cap)
  → Twilio calls the LEAD with machineDetection=DetectMessageEnd
  → machine?  → voicemailText plays → hangup
     human?   → /voice/auto/:callId renders the script
  → <Gather> → lead presses 1 → /voice/auto/:callId/gather/N
              → branches {"1":"interested"} → call.outcome = interested
              → branch "transfer" → warm-transfers to a live agent
  → terminal status → finalizeCall → campaign stats → next target
```

**Inbound**
```
Lead calls your Twilio number
  → /voice/inbound  matches the caller to a lead/contact by the last 10 digits,
                    creates an inbound CrmCall, writes the timeline entry,
                    rings the record owner (or up to 5 active agents in parallel)
  → nobody answers → voicemail recorded → recording-status stores it
```

**Retry policy.** Automatic on `no_answer` / `busy` / `failed`, up to
`TWILIO_MAX_CALL_ATTEMPTS`, delayed by `TWILIO_RETRY_DELAY_MIN`, deferred to the next
dialling window if it would fire out of hours. Never retried: `21211`, `21214`,
`21217`, `21219`, `13223`, `13225`, `21215` — invalid, unverified, non-existent or
geo-blocked numbers fail identically forever, so retrying only burns money and
sender reputation.

**Reconciliation.** `calls:reconcile` runs every 10 minutes, finds calls stuck in a
live state for over 15 minutes, fetches the true status from Twilio and finalises them.
This is the safety net for a dropped webhook or a deploy mid-call — and it logs a
warning naming `API_PUBLIC_URL`, because a burst of reconciles means webhooks are not
arriving.

---

## 8. Testing

### 8.1 Automated suite — `scripts/test-voice.js` (54/54 passing)

```bash
cd app/api && node scripts/test-voice.js
```

Spins the CRM router up against a scratch database and drives the whole voice surface
with genuine HMAC-SHA1 Twilio signatures — no billable calls. It refuses to run if
`TEST_MONGO_URI` looks like a real database, and exits non-zero on failure so it can
gate a deploy.

Covers: signature rejection (unsigned and forged), bridge TwiML, the full status
lifecycle, **customer-leg vs agent-leg precedence**, duplicate-callback idempotency,
error-code capture and translation, retry scheduling, permanent-failure suppression,
retry caps, recording attachment (including orphan callbacks), script rendering,
voicemail branching, DTMF → outcome mapping, inbound matching, **inbound dial-result
branching**, the fallback endpoint, E.164 normalisation and route-level authorization.

### 8.2 Manual test — click-to-call

1. Set your own mobile as the CRM profile phone (Settings → Profile). On a trial
   account it must be `+91 97706 01469`.
2. Create a lead whose phone is also a verified number.
3. Lead page → **Call**. Your phone rings → answer → the lead's phone rings.
4. Watch the button change: *Connecting… → Ringing… → In call — hang up*.
5. Hang up. Within ~10s the Call history row shows `completed`, the duration, and a
   **Recording** play button a few seconds later.

Confirm in Twilio Console → **Monitor → Logs → Calls**: two legs, both `completed`.

### 8.3 Manual test — webhooks are actually landing

Console → **Monitor → Logs → Errors** after a test call. Any `11200`, `11205` or
`32001` means Twilio could not reach your API — go back to §3.1.

### 8.4 Manual test — automated call

1. Settings → enable `automatedCallingEnabled`.
2. Calls → **Scripts** → New script (the default template is a working qualification
   flow). Save.
3. Calls → **Campaigns** → New campaign → mode *Automated* → pick the script →
   Load audience → Create.
4. The runner dials inside the window at the configured concurrency. Press `1` on the
   receiving phone and confirm the lead's call row shows `outcome: interested`.

### 8.5 Manual test — inbound

Call `+1 785 336 9380` from a phone whose number matches a lead. Your agent phone
should ring; the lead's timeline should gain an "Inbound call" entry.

### 8.6 Negative tests worth running

| Test | Expected |
|---|---|
| Call a lead with no phone | 400 "No valid phone number on record" |
| Call a lead marked Do Not Call | 409 and the button is replaced by a notice |
| Agent with no profile phone | Button explains it and offers a `tel:` link |
| Unsigned POST to any webhook | 403 |
| Delete a call with a recording | Recording removed from Twilio too |
| Cancel a running campaign | Live calls hang up, pending targets → `skipped` |

---

## 9. Deployment checklist

- [ ] `npm install` in `app/api` (adds `twilio`)
- [ ] Deploy the API to a public HTTPS host with a valid CA certificate
- [ ] Set `API_PUBLIC_URL` to that origin — no trailing slash, HTTPS
- [ ] `curl -i -X POST $API_PUBLIC_URL/crm/api/voice/fallback -d 'CallSid=probe'` → **403**
- [ ] `TWILIO_VALIDATE_WEBHOOKS=true` (never `false` outside local dev)
- [ ] `app.set('trust proxy', 1)` — already set in `src/server.js:105`, just confirm it
      survives any proxy change. The signature check rebuilds the URL from
      `API_PUBLIC_URL`, so it is unaffected either way
- [ ] Update the number's Voice URL, Fallback URL and status callback (§3.4)
- [ ] Create the four `crm_calls` indexes (§5)
- [ ] Build the frontend: `cd app/crm && npm run build`
- [ ] Confirm the boot log reads `CRM voice: Twilio ready (from +…, callbacks → …)`
- [ ] Place one real test call end-to-end before letting agents in

---

## 10. Production checklist

**Account**
- [ ] Upgraded from trial
- [ ] Auto-recharge configured
- [ ] Billing alert at a sensible threshold
- [ ] High-risk geo permissions left **disabled**

**Security**
- [ ] `TWILIO_AUTH_TOKEN` rotated if it was ever exposed
- [ ] API Key used for REST (`TWILIO_API_KEY_SID` / `_SECRET`)
- [ ] Secrets injected from a secret store, not a file in the image
- [ ] `.env` gitignored (already true — verify it stayed that way)
- [ ] Signature validation on
- [ ] `calls:bulk` granted only to Manager/Admin
- [ ] Recording access gated behind `calls:recordings`
- [ ] Customer numbers masked in logs (already done via `maskPhone`)

**Compliance**
- [ ] Recording announcement enabled and its wording reviewed by whoever owns legal
- [ ] Recording retention policy set in Twilio
- [ ] Dialling window matches local law (default 10:00–19:00 IST)
- [ ] A documented process turns a "stop calling me" request into `doNotCall: true`
- [ ] Automated calling reviewed before enabling — robocalls are separately regulated

**Reliability**
- [ ] `calls:reconcile` running (check the boot log)
- [ ] Alert on repeated "no webhook was received" warnings
- [ ] `TWILIO_MAX_CALL_SEC` set so a stuck line cannot bill for hours
- [ ] Campaign concurrency ≤ what Twilio allows (new accounts: 1 CPS)

**Cost control at your rates**
| Scenario | Cost |
|---|---|
| One 3-min bridged call to an India mobile | ~$0.30 (two legs) |
| One 1-min automated call | ~$0.05 + AMD |
| 500-lead automated campaign, 1 min average | ~$25 |
| Recording storage | $0.0005/min/month |

Bridged calls bill **both legs**. Budget roughly double a naive per-minute estimate.

---

## 11. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Calls connect but stay "ringing" in the CRM | Webhooks not reaching the API | §3.1. Check Monitor → Errors for `11200`/`32001` |
| Twilio error `21219` / `21214` | Trial account, unverified number | Upgrade, or verify the number under Verified Caller IDs |
| Error `21211` | Number not E.164 | The API normalises 10-digit and `0`-prefixed Indian numbers; anything shorter than 8 digits is rejected |
| Error `21215` / `13225` | Country not permitted | Voice → Geographic Permissions |
| Error `20003` | Bad credentials | Check SID/token or API key pair |
| Error `11200` on TwiML | Handler errored or took >15s | Check API logs; the fallback URL keeps callers from hearing dead air |
| Error `13214` | Invalid `callerId` on `<Dial>` | `TWILIO_VOICE_FROM` must be a number you own |
| All webhooks return 403 | `API_PUBLIC_URL` ≠ the URL Twilio actually called | They must match exactly, including scheme and any path prefix |
| Recording button says "not available yet" | Twilio delivers recordings seconds after the call | Wait, then reload. If it never arrives, check the recording-status callback |
| Recording 404s | `recordingSid` missing | Confirm `TWILIO_RECORD_CALLS=true` and that the recording callback is landing |
| Agent's phone never rings | No profile phone number | Settings → Profile. The button warns about this |
| Campaign stuck at 0 dialled | Outside the dialling window | Check `callWindowStart/End`; the runner logs when it defers |
| Duplicate timeline entries | — | Guarded: terminal callbacks are idempotent (covered by the test suite) |
| Automated call plays over voicemail | AMD disabled | `TWILIO_MACHINE_DETECTION=true` |
| `Twilio is not configured` at runtime | Missing env | `GET /crm/api/calls/config` lists exactly what is missing |

**Fastest diagnosis path:** `GET /crm/api/calls/config` as an Admin returns
`voiceReady`, the precise list of missing variables, and warnings for non-HTTPS
callbacks, localhost URLs and disabled signature validation.
