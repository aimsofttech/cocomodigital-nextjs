# Real-time WhatsApp chat — implementation guide

Live two-way WhatsApp between the CRM inbox and a customer's phone, over Twilio.

- **Verified working** on the Twilio sandbox: messages delivered and read on `+91 9770601469`, replies appearing in the CRM with no refresh.
- Test suites: `test-messaging.js` 34/34, `test-realtime.js` 18/18.

---

## 1. What was already there, and what was added

The messaging module was already substantial. Most of this work was filling gaps, not rebuilding.

| Capability | Before | Now |
|---|---|---|
| Send WhatsApp via Twilio | ✅ | unchanged |
| Twilio webhooks + signature verification | ✅ | unchanged |
| Messages persisted (`crm_messages`) | ✅ | + media, provider SID on inbound |
| Send / inbox / thread REST APIs | ✅ | + pagination, search, mark-read |
| Job queue with retry + backoff | ✅ | unchanged |
| Inbox UI (list, bubbles, status) | ✅ | rewritten as live chat |
| 24-hour window enforcement | ✅ | unchanged |
| **Real-time push** | ❌ | Socket.IO |
| **Duplicate webhook suppression** | ❌ | idempotent on provider SID |
| **Failure reason from Twilio** | ❌ | code + message + plain-language cause |
| **Read receipts (blue ticks)** | ❌ | `read` status mapped |
| **Out-of-order status guard** | ❌ | rank-based, never regresses |
| **Meta Cloud webhook signature** | ❌ | `X-Hub-Signature-256` |
| **Inbound media capture** | ❌ | `MediaUrl0..N` |
| **Infinite history** | ❌ | cursor pagination |
| **Conversation search** | ❌ | name / phone / body |
| **Non-text inbound** (photo, voice, location, button) | blank bubble | described |
| **Window check** | trusted local mirror | asks Twilio when unsure |
| Duplicate-send on save failure | bug | fixed |
| Repeatable jobs never registered | bug | fixed |

### The 24-hour window is now checked against Twilio

Originally the window was decided purely from `CrmMessage` inbound rows. That is only a **mirror** of what the inbound webhook delivered, and it is wrong whenever the webhook is misconfigured or dropped a delivery.

That produced the worst possible failure: the customer had just replied, the window was open, and the CRM either refused the agent's message or silently swapped in a template — because it had no record of a reply Twilio had already received.

Now:

| Local history | Twilio | Result |
|---|---|---|
| reply < 24h | not asked | send free-form (fast path, no API call) |
| nothing | reply < 24h | **send free-form** + log that the webhook is probably unconfigured |
| nothing | nothing / > 24h | refuse with an explanation |
| nothing | unreachable | refuse (fail safe) |

Twilio is only consulted when the local mirror says "closed", so the common case costs nothing.

### Replies are recovered even when the webhook is broken

The inbound webhook lives in the Twilio Console — outside this codebase — and it is a single point of failure. When it is unset, wrong, or aimed at a tunnel that has since died, Twilio answers your customer with its own canned *"Configure your WhatsApp Sandbox's Inbound URL to change this message"* and the CRM never learns the conversation happened.

Twilio keeps those messages regardless, so a repeatable job (`messages:reconcile`, every 30s) polls for inbound messages and imports anything missing. `recordInbound()` dedupes on the Twilio SID, so the webhook and the poller can never double up.

| | Latency | Needs Console config |
|---|---|---|
| Webhook (primary) | instant | yes |
| Reconcile (safety net) | ≤ 30s | **no** |

This mirrors `calls:reconcile`, which exists for the same reason on the voice side. Tune with `WHATSAPP_RECONCILE_MS`; one Twilio API call per run.

> Configure the webhook anyway — 30s is not a chat experience. The poller is insurance, not a substitute.

### Inbound message types

Only plain text arrives in Twilio's `Body`. Everything else came through as an empty bubble. Now:

| Customer sends | Stored as |
|---|---|
| Text | the text |
| Photo / video / voice / PDF | `📷 Photo`, `🎬 Video`, `🎤 Voice message`, `📄 PDF` + `mediaUrls` |
| Media **with** a caption | the caption (media still attached) |
| Location | `📍 Location: …` + a Google Maps link |
| Quick-reply button tap | `[tapped: Confirm]` |
| Anything else | `[unsupported message type]` — raw payload kept in `statusHistory` |

### Files

**New**
```
app/api/src/crm/realtime.js                 Socket.IO server, auth, rooms, emitters
app/api/src/crm/middleware/metaSignature.js X-Hub-Signature-256 verification
app/api/scripts/test-realtime.js            end-to-end realtime test
app/crm/src/services/socket.ts              client singleton
app/crm/src/hooks/useRealtime.ts            subscribe / status / room hooks
```

**Changed**
```
app/api/src/server.js                       http.createServer + io, raw-body capture
app/api/src/crm/services/messaging.js       emit on queue/send/fail, inbound idempotency
app/api/src/crm/routes/webhooks.js          media, SID, error detail, ordering, Meta signature
app/api/src/crm/routes/messages.js          pagination, search, POST /read
app/api/src/crm/services/workers.js         wait for Mongo before registering repeatables
app/crm/src/pages/inbox/InboxPage.tsx       live chat UI
```

---

## 2. Architecture

The two directions of a conversation arrive by completely different routes. That asymmetry is the whole reason a socket layer is needed.

```
AGENT SENDS                                CUSTOMER REPLIES
───────────                                ────────────────
Inbox UI                                   WhatsApp on phone
   │ POST /messages/send                        │
   ▼                                            ▼
sendMessage()                              Twilio
   │ persist (status: queued)                   │ POST webhook
   │ emit message:new  ──► agent's tabs         ▼
   ▼                                    /webhooks/twilio/whatsapp-inbound
crm_jobs (Mongo queue)                          │ verify signature
   │ poller, 15s                                │ dedupe on MessageSid
   ▼                                            ▼
deliver() ──► Twilio API                   recordInbound()
   │ emit message:status                        │ persist (status: received)
   ▼                                            │ emit message:new ──► every open inbox
Twilio status callback                          ▼
   │                                       lead auto-created if unknown
   ▼
/webhooks/twilio/sms-status
   │ rank guard, error detail
   └─ emit message:status ──► ticks update live
```

Socket.IO shares the Express port; the upgrade is routed by path (`/crm/socket.io`), so no proxy or firewall change is needed beyond allowing WebSocket upgrades.

### Rooms

| Room | Members | Carries |
|---|---|---|
| `crm` | every authenticated agent | `thread:update`, `thread:read` |
| `user:<id>` | one agent's tabs | personal notifications |
| `thread:<channel>:<leadId>` | agents viewing that conversation | `message:new`, `message:status`, `message:read`, `agent:typing` |

The thread key is built identically in [`realtime.threadKey()`](app/api/src/crm/realtime.js) and the `/inbox` response. If those ever diverge, live updates land in a conversation the list cannot find.

### Events

| Event | Direction | Payload |
|---|---|---|
| `thread:join` / `thread:leave` | client → server | `key` |
| `agent:typing` | both | `{ key, name, userId }` |
| `message:new` | server → client | `{ key, message }` |
| `message:status` | server → client | `{ key, messageId, status, failReason, message }` |
| `message:read` | server → client | `{ key, messageIds }` |
| `thread:update` | server → client | same as `message:new`, to the whole `crm` room |

---

## 3. Database

`crm_messages` — every field you asked for was already modelled except the two marked **new**.

| Field | Type | Notes |
|---|---|---|
| `channel` | enum | `whatsapp` / `sms` / `email` |
| `direction` | enum | `outbound` / `inbound` |
| `leadId` / `contactId` | ObjectId | the counterpart |
| `toAddress` / `fromAddress` | String | E.164 digits, no `+` |
| `body` | String | message text |
| `mediaUrls` | [String] | **new on inbound** — `MediaUrl0..N` |
| `providerMessageId` | String, indexed | Twilio SID; **now set on inbound** for dedupe |
| `status` | enum | `queued`→`sent`→`delivered`→`read`, or `failed`/`manual`/`received` |
| `statusHistory` | [{status, at, raw}] | full audit incl. raw provider payload |
| `failReason` | String | code + message + cause |
| `contentSid` / `contentVariables` | String / Mixed | approved template send |
| `sentBy` | ObjectId | null ⇒ automation |
| `createdAt` / `updatedAt` | Date | timestamps |

Indexes: `{channel, toAddress, createdAt}`, `providerMessageId` (sparse), `leadId`, `contactId`, `status`.

> **Read status:** `read` currently means "blue ticks" on outbound and "agent opened it" on inbound. They share one enum value, so read-rate reporting can't separate them. Left as-is — splitting it is a migration.

---

## 4. API reference

All routes are under the CRM mount (`/crm/api`), require `Authorization: Bearer <crm jwt>`, and return `{ status, data, meta? }`.

### `POST /messages/send` — `messages:send`
```jsonc
{ "channel": "whatsapp", "leadId": "…", "body": "Hi Anshu",
  "contentSid": "HX…", "contentVariables": {"1":"12/1"},   // optional, template send
  "scheduledFor": "2026-08-04T09:00:00Z" }                 // optional
```
`201` with the created message (status `queued`). Delivery is asynchronous.
`400` with a full explanation when refused — e.g. outside the 24-hour window.

### `GET /messages/inbox?channel=&q=` — `messages:read`
Conversation list, newest first. `q` filters on name, phone or last message body.
Each row: `{ key, channel, leadId, contactId, name, phone, lastMessage, total, unreadInbound }`.

### `GET /messages/thread?leadId=|contactId=&channel=&limit=&before=` — `messages:read`
One page, oldest-first. `limit` default 50, max 200.
`meta: { hasMore, nextBefore }` — pass `nextBefore` as `before` to page backwards.

### `POST /messages/read` — `messages:read`
```jsonc
{ "leadId": "…", "channel": "whatsapp" }
```
Marks inbound `received` → `read`, emits `message:read`. Returns `{ updated, messageIds }`.

### `POST /messages/bulk` — `messages:send`
`{ channel, templateId, leadIds[], scheduledFor? }`, max 200 recipients.

### `PATCH /messages/:id/mark-sent` — `messages:send`
Confirms a `manual` (wa.me link) message was sent by hand.

### Webhooks (public, signature-verified)
```
POST /crm/api/webhooks/twilio/whatsapp-inbound   inbound + STOP
POST /crm/api/webhooks/twilio/sms-status         delivery receipts (both channels)
GET  /crm/api/webhooks/whatsapp                  Meta verification handshake
POST /crm/api/webhooks/whatsapp                  Meta inbound + statuses
```

---

## 5. Twilio Console configuration

### Sandbox (what you have now)

1. **Messaging → Try it out → Send a WhatsApp message**
2. Note your join code. From `+91 9770601469`, WhatsApp `join <your-code>` to **+1 415 523 8886**.
3. **Sandbox settings** tab:
   - *When a message comes in* → `https://<PUBLIC_URL>/crm/api/webhooks/twilio/whatsapp-inbound`, **POST**
   - *Status callback URL* → `https://<PUBLIC_URL>/crm/api/webhooks/twilio/sms-status`, **POST**

`<PUBLIC_URL>` must be the same value as `API_PUBLIC_URL` — the signature is computed over the exact URL Twilio called.

### After upgrading

4. **Messaging → Senders → WhatsApp senders** → register your business number (needs a paid account; this is the screen that blocked you).
5. Complete Meta Business verification → creates your WhatsApp Business Account.
6. **Messaging → Content Template Builder** → create templates → submit for WhatsApp approval.
7. Set the same two webhook URLs on the new sender.
8. Update `.env`: `TWILIO_WHATSAPP_FROM=whatsapp:+91…`, and your own `HX…` SID.

---

## 6. Environment

```bash
TWILIO_ACCOUNT_SID=AC…
TWILIO_AUTH_TOKEN=…                  # also verifies webhook signatures
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

API_PUBLIC_URL=https://…             # public HTTPS origin, no trailing slash
CRM_PUBLIC_PATH=/crm/api             # path your proxy forwards to this app
TWILIO_VALIDATE_WEBHOOKS=true        # never false in production

# Only when starting conversations outside the 24h window.
# Whatever is set here REPLACES the agent's typed message — leave blank
# unless you have your own approved template.
TWILIO_WHATSAPP_CONTENT_SID=
TWILIO_WHATSAPP_CONTENT_VARS=        # {"1":"12/1","2":"3pm"}

# Meta Cloud API (alternative to Twilio; unused today)
WA_ACCESS_TOKEN=
WA_PHONE_NUMBER_ID=
WA_WEBHOOK_VERIFY_TOKEN=
WA_APP_SECRET=                       # required for signature verification
```

Frontend `app/crm/.env`: `VITE_CRM_API_URL=` (blank in dev — Vite proxies to :5000).

---

## 7. Testing

```bash
cd app/api

node scripts/check-whatsapp.js      # config + live account + webhook reachability
node scripts/dryrun-whatsapp.js     # exact Twilio payload, sends nothing
node scripts/test-messaging.js      # 34 unit tests, scratch DB
node scripts/test-realtime.js       # 18 end-to-end realtime tests, scratch DB
node scripts/test-whatsapp.js       # LIVE send to WHATSAPP_TEST_TO
```

### Manual test of the full loop
1. Restart the API (Socket.IO only attaches at boot).
2. Open the CRM inbox → the header pill should read **Live**.
3. Send to the test lead → bubble appears instantly, tick goes ✓ then ✓✓.
4. Reply from the phone → **appears in the CRM within a second, no refresh**.
5. Open a second tab → both stay in sync.
6. Stop the API → pill turns **Reconnecting…**; restart → it recovers and re-joins the room.

---

## 8. Trial account — direct answers

You asked specifically about this. Your account is on trial with $9.37 credit.

| Question | Answer |
|---|---|
| Outbound WhatsApp supported? | **Yes**, from the sandbox sender only. Verified — both test messages reached `read`. |
| Inbound replies via webhook? | **Yes**, fully. Verified: signature-protected endpoint, replies stored and pushed. |
| Real-time sync possible? | **Yes.** Socket.IO is entirely ours — Twilio is not involved and imposes no limit. |
| Verified WhatsApp Business Account needed? | **Not for the sandbox. Yes for production** — it is the only way to get your own sender. |

### Sandbox limitations

1. **Every recipient must first send `join <code>`** to +1 415 523 8886. Fine for you; impossible for real leads.
2. **The join lapses after 72h idle** → error 63015 until they re-join.
3. **Shared sender** — `+1 415 523 8886` is Twilio's, used by every trial worldwide. Customers see a US number, not your brand.
4. **No custom templates.** You can open the Content Template Builder but cannot submit for WhatsApp approval without a sender. Only Twilio's quick-start templates send — which is why cold outreach currently delivers *"Your appointment is coming up on 12/1 at 3pm"* instead of what the agent typed.
5. **The 24-hour window still applies** — this is Meta policy, not a trial restriction. It does not go away on a paid plan.
6. Trial credit is consumed per message.

### After upgrading

| Change | Why |
|---|---|
| Register your own WhatsApp sender | Removes the join step; your number and brand |
| Complete Meta Business verification | Prerequisite for the sender |
| Create + get your templates approved | Cold outreach in **your** words |
| `TWILIO_WHATSAPP_FROM=whatsapp:+91…` | Point at the new sender |
| Replace `TWILIO_WHATSAPP_CONTENT_SID` | The borrowed one fails with 63024 on a real sender |
| Re-point both webhook URLs | Sender settings are per-sender |

**Nothing in the application code changes.** It is all configuration.

---

## 9. Deployment

1. `npm install` in `app/api` (adds `socket.io`) and `app/crm` (adds `socket.io-client`).
2. Set env vars; `API_PUBLIC_URL` must be a **stable** HTTPS origin — not a `trycloudflare` tunnel, which changes on every restart and silently breaks both webhooks and signature validation.
3. Reverse proxy must allow the WebSocket upgrade:
   ```nginx
   location /crm/socket.io/ {
       proxy_pass http://127.0.0.1:5000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_set_header Host $host;
       proxy_read_timeout 300s;
   }
   ```
   Without this the client silently falls back to HTTP long-polling — still functional, just chattier.
4. The proxy must pass the webhook path through **unchanged**; stripping a prefix breaks the signature check.
5. Set `CORS_ORIGINS` to the CRM's real origin — the socket enforces the same allow-list.
6. Restart the API. Socket.IO only attaches at boot.
7. Verify: `node scripts/check-whatsapp.js` (expect the inbound webhook to return **403**, meaning reachable and signature-protected).

### Scaling past one instance
The queue is Mongo-backed and claims jobs atomically, so multiple API instances are already safe. Socket.IO is **not** — a message emitted by instance A never reaches a client connected to instance B. Before running more than one instance, add the Redis adapter:
```js
const { createAdapter } = require('@socket.io/redis-adapter');
io.adapter(createAdapter(pubClient, subClient));
```

---

## 10. Production checklist

**Blocking**
- [ ] Upgrade Twilio; register your own WhatsApp sender
- [ ] Create and get your own templates approved
- [ ] Blank `TWILIO_WHATSAPP_CONTENT_SID` until then — otherwise cold sends deliver the appointment text instead of the agent's message
- [ ] Stable HTTPS `API_PUBLIC_URL`
- [ ] `TWILIO_VALIDATE_WEBHOOKS=true`
- [ ] Rotate the credentials committed to `.env` (Twilio token, Mongo password, JWT secret, AWS keys, SMTP password) and keep `.env` out of git
- [ ] Fix `TWILIO_API_KEY_SECRET` — the current pair returns **401**, which silently breaks outbound calling (WhatsApp is unaffected)

**Known gaps, deliberately not in this change**
- [ ] Leads bypass all consent checks — the block in `deliver()` only runs for contacts, and `CrmLead` has no opt-in field. Inbound WhatsApp auto-creates *leads*, so most recipients are unprotected.
- [ ] `STOP` only opts out contacts, for the same reason. A lead who replies STOP keeps receiving messages.
- [ ] Bulk sends bypass quiet hours (they carry `sentBy`).
- [ ] Window is checked at queue time, not send time — a scheduled send can go out after it closes.
- [ ] Meta Cloud path sends plain text only; ignores templates, media and the window check.

These are the highest-value follow-ups. The first two are compliance exposure.

---

## 11. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Customer gets **"You said: … Configure your WhatsApp Sandbox's Inbound URL to change this message"** | The sandbox inbound webhook URL is **empty**, so Twilio auto-replies instead of forwarding to the CRM. | Set *When a message comes in* (step 3 above). Replies still reach the inbox within 30s via `messages:reconcile`, but the auto-reply to your customer only stops once the URL is set. There is **no REST API** for this — Console only. |
| Agent types one thing, customer receives **"Your appointment is coming up on 12/1 at 3pm"** | `TWILIO_WHATSAPP_CONTENT_SID` is set, so the out-of-window fallback replaced the message | Blank it |
| Pill stuck on **Reconnecting…** | API not restarted, or proxy blocks upgrade | Restart; add the `location` block above |
| Replies never arrive | Sandbox webhook URL not set, or `API_PUBLIC_URL` stale | `node scripts/check-whatsapp.js` — section 5 must be reachable |
| Webhook returns 403 | Signature mismatch — usually a changed tunnel URL | Update `API_PUBLIC_URL`, restart |
| **63016** | Outside the 24-hour window | Customer must message first, or use an approved template |
| **63015** | Sandbox join lapsed (72h) | Re-send `join <code>` |
| **63024** | Borrowed quick-start template on a real sender | Use your own approved template |
| **63021** | Variables don't match the template | Fix `TWILIO_WHATSAPP_CONTENT_VARS` |
| **21211** | Not valid E.164 | Check the lead's phone |
| Messages stuck at `queued` | Scheduler not running, or quiet hours | Check boot log for "repeatable jobs registered"; `GET /settings/jobs` |
| Status never leaves `sent` | Status callback URL not configured | Set it in sandbox settings |
| Cold sends deliver the wrong text | `TWILIO_WHATSAPP_CONTENT_SID` is set | Blank it |
| Duplicate messages in a thread | — | Fixed: inbound dedupes on SID, outbound no longer re-sends on save failure |

**Where to look first:** `node scripts/check-whatsapp.js` reads your real Twilio account and reports recent failures with their cause. It is faster than reading logs.
