# Calling module — analysis, fixes, and operating guide

Verified against the live Twilio account on 2026-08-04.
Suites: `test-calls.js` 32/32, `test-messaging.js` 45/45, `test-realtime.js` 24/24.

---

## 0. Round two — 2026-08-04: why it *still* did not ring

Three new causes, found by measurement. A real call now completes:

```
node scripts/place-test-call.js +919770601469
  → CAc7fbc61b6847b4baadf859af6f513088  status "completed"  duration 20s
```

### 0.1 The rejected API key was back in `.env` (decisive)

`TWILIO_API_KEY_SID` / `_SECRET` had been diagnosed as 401 and commented out —
then **re-added, uncommented, below the comment block**, putting the dead key
back in charge:

```
# TWILIO_API_KEY_SID=SKe68a…996d      ← the fix
TWILIO_API_KEY_SID=SKe68a…996d        ← undid it
```

`restCredentials()` prefers an API key over the auth token, so a dead key
**masks a perfectly working token** and every call dies with an opaque
`20003 Authenticate` — while `readiness()` still reports voice ready. Measured:
key → HTTP 401, account auth token → 200.

Fixed three ways, because config alone clearly does not stay fixed:
1. `.env` key blanked again (with a note explaining what happened).
2. `verifyCredentials()` probes at boot and **demotes a rejected key to the auth
   token automatically**, logging exactly what to do about it.
3. `createCall()` catches `20003`/401 mid-call, demotes, and retries — a bad
   credential must not cost an agent their call.

### 0.2 `API_PUBLIC_URL` was dead, and nothing stopped the call

The `trycloudflare` tunnel in `.env` no longer resolves (`HTTP 000`). Twilio
fetches the call's TwiML from that host **the instant the phone is answered**,
so the old behaviour was: call placed → phone rings → dead air → no status
callback ever arrives to explain it.

`isVoiceReady()` only ever checked the variable was *set*.

- `callEngine.assertVoiceUsable()` now refuses to dial when the last probe
  failed, with a message naming the host and the reason.
- `voice:probe` re-probes every 5 minutes, so a tunnel that moves is noticed
  without restarting the API. A *never-probed* host does **not** block.
- `GET /calls/config` reports `publicUrlReachable` / `publicUrlError`; the
  button degrades to a `tel:` link and the banner says why.

### 0.3 Rescheduling silently dropped the auto-dial

`CallsPage.submitReschedule()` sent only `scheduledAt`. The backend then
inherited `old.autoDial` — which is `false` by default. **So rescheduling a
normally-scheduled call produced a reminder and nothing else, and the phone
never rang at the new time either.** This is the most likely reason your
rescheduled call did nothing.

- Reschedule modal now has the same "Dial automatically" toggle as scheduling,
  and sends it.
- `autoDialGuard()` is now shared by create *and* reschedule — past-dated dial,
  Twilio not ready, callback host dark, owner has no phone. Reschedule
  previously applied **none** of these.
- The guard runs *before* the old call is marked `rescheduled`, so a rejected
  reschedule cannot orphan the original.
- The timeline entry now says "will dial automatically" or "reminder only, no
  call is placed".

### 0.4 The diagnostic crashed on the exact case you had

`check-twilio.js:98` referenced `warn` instead of `warnMark` — a
`ReferenceError` reached **only** when the API key is rejected and the auth
token works. The one script that could have named the cause died on it.

---

## 1. Why calling did not work (round one, 2026-08-03)

The decisive measurement: **zero calls have ever existed on your Twilio account.**

```
GET /2010-04-01/Accounts/AC53ac…/Calls.json  →  calls: 0
```

Nothing was ever rejected by Twilio, because nothing was ever *sent* to Twilio. The failure was entirely inside the CRM. Two independent causes, either of which alone breaks calling.

### Cause 1 — the logged-in agent has no phone number (blocks everything)

Click-to-call is a **bridge**: Twilio rings the *agent* first, then dials the customer and joins the two legs. With no agent number there is nothing to ring.

[`GET /calls/config`](app/api/src/crm/routes/calls.js) reports:

```js
agentPhoneSet: Boolean(tw.toE164(req.crmUser.phone, s.defaultCountryCode))
```

For "Demo User" that is `false`, so [`CallButton`](app/crm/src/components/calls/index.tsx) renders a plain `tel:` link — which opens your desktop dialler and **never calls the backend**. That is the *"add your number for click-to-call"* label in your screenshot. The code was behaving exactly as designed; the design just failed quietly.

**Fix: Settings → Profile → Phone.** This is data, not code.

### Cause 2 — `TWILIO_MAX_CALL_SEC=3600` is rejected by your account

This one would have bitten you immediately after fixing Cause 1, and it is not obvious.

Twilio caps `TimeLimit` **per account**, not at a documented maximum. Binary-searched against your live account:

| TimeLimit | Result |
|---|---|
| 600 | accepted |
| 899 | **accepted — the ceiling** |
| 900 | rejected — `13216 Invalid TimeLimit value` |
| 3600 (your setting) | rejected |

The call is refused *before dialling*, so an invalid tuning parameter silently kills every call.

**Fixed two ways:**
1. Default lowered to `899`, and `.env` / `.env.example` updated with the measured evidence.
2. [`createCall()`](app/api/src/crm/services/twilioVoice.js) now catches `13216`, drops `timeLimit`, and places the call anyway. `TimeLimit` is a safety cap on runaway calls — never something a call needs to connect — so a bad value must not cost the agent their call.

### Not the cause

- **Trial account** — not blocking. `+919770601469` is already a verified caller ID.
- **Credentials** — the API key authenticates (200 OK). My earlier 401 reading is superseded; you evidently fixed the secret.
- **Webhooks, backend APIs, database** — all correctly implemented.
- **`API_PUBLIC_URL`** — reachable and signature-protected.

---

## 2. Scheduled calling did not exist

You asked to verify it. It was not implemented.

[`POST /calls`](app/api/src/crm/routes/calls.js) armed one job:

```js
await scheduleReminder(call);   // call:reminder → notifies the owner. That is all.
```

`call:auto-dial` existed as a handler but **nothing scheduled it** except retries and campaigns. A call scheduled for 3pm produced a notification at 2:45pm and never rang anyone.

Two further defects in the same area:
- `PATCH /:id/cancel` cancelled only the reminder. Had auto-dial existed, a cancelled call would still have phoned the customer.
- `PATCH /:id/reschedule` likewise — the old call kept its jobs and would fire at the time it was moved *away from*.

### Implemented

| Piece | Where |
|---|---|
| `autoDial` flag | `CrmCall` schema — defaults `false`, so existing scheduled calls behave exactly as before |
| Arms the dial at `scheduledAt` | `scheduleAutoDial()` in `routes/calls.js` |
| Cancel stops both jobs | `cancelCallJobs()` |
| Reschedule re-arms, never stacks | dedupe key `call:auto-dial:<id>` |
| Refuses a past-dated auto-dial | would fire instantly — never the intent |
| Refuses auto-dial without Twilio | fails at request time, with the missing vars named |
| UI toggle | "Dial automatically at that time" in the schedule modal |

**Survives restart:** the queue lives in Mongo (`crm_jobs`), not in an in-process timer. The poller claims due jobs with an atomic `findOneAndUpdate`, so it is also safe across multiple API instances.

---

## 3. Real-time call status

Status previously arrived by polling `GET /calls/:id` every 3 seconds, from each component that showed a call. Twilio's status callbacks already tell the server the instant anything changes.

Now every point where a call's status changes emits `call:status` over Socket.IO — the 12 `call.save()` sites across `callEngine`, the three voice webhooks, and the reconciler.

- The **Call button** updates live; polling drops to an 8s backstop for when the socket is down.
- **Call history** updates live — essential now that a scheduled auto-dial fires with nobody watching.

Statuses surfaced: `queued → initiated → ringing → in_progress → completed`, plus `busy`, `no_answer`, `failed`, `cancelled`, `missed`. Duration and `errorMessage` come through on the same event.

---

## 4. Trial account — what works, what does not

| Capability | Trial | Notes |
|---|---|---|
| Outbound calls | ✅ | **Only to verified numbers** |
| Inbound calls | ✅ | Set the number's Voice webhook (yours still points at Twilio's demo) |
| Recording | ✅ | |
| Answering-machine detection | ✅ | |
| Status callbacks / webhooks | ✅ | |
| Scheduled + auto-dial | ✅ | Entirely ours; Twilio is not involved in the scheduling |
| Real-time status | ✅ | Socket.IO is ours |
| Call length | ⚠️ | **899s (15 min) maximum** |
| Trial announcement | ⚠️ | Twilio prepends "You have a trial account…" to every call |
| Calling unverified numbers | ❌ | `21219` — the blocker for real leads |

### The trial constraint that matters most for bridge mode

A bridged call dials **two** legs, and on a trial account **both must be verified**. Your verified list has exactly one number:

```
+919770601469
```

So with agent phone = `+919770601469` and customer = `+919770601469`, Twilio would call that number, then try to bridge it to itself — the second leg hits busy.

**To test click-to-call properly on trial you need a second verified number.** Console → Phone Numbers → Verified Caller IDs → Add. Set one as the agent phone and use the other as the lead.

### After upgrading

| Change | Why |
|---|---|
| Nothing in code | — |
| Verified-caller-ID restriction disappears | Call any lead |
| Trial announcement disappears | |
| Raise `TWILIO_MAX_CALL_SEC` | 899 is a trial ceiling |
| Point the number's Voice URL at `…/crm/api/voice/inbound` | Enables inbound |

---

## 5. Testing

```bash
cd app/api
node scripts/test-calls.js       # 20 tests, scratch DB, nothing dialled
node scripts/check-twilio.js     # live account + webhook reachability
```

> `test-calls.js` stubs `tw.placeCall`, **not** `global.fetch`. The Twilio SDK uses axios, so a fetch stub leaves it free to hit the live API — an early version of this suite did exactly that and reached Twilio for real.

### Manual end-to-end
1. Restart the API (Socket.IO and the new jobs only attach at boot).
2. Settings → Profile → set your phone. The Call button should stop saying "opens your dialler".
3. Press **Call** → your phone rings → answer → the lead is dialled → status goes `ringing → in_progress → completed` live.
4. Schedule a call 2 minutes out with **Dial automatically** ticked → the call fires on its own.
5. Restart the API before it fires → it still fires (the job is in Mongo).
6. Cancel a scheduled auto-dial → confirm no `call:auto-dial` job remains.

---

## 6. Production checklist

- [ ] Agent phone set for **every** user who will make calls
- [ ] `TWILIO_MAX_CALL_SEC` ≤ your account's ceiling (899 on trial)
- [ ] Second verified caller ID, or upgrade, before testing bridge mode
- [ ] Number's Voice URL → `…/crm/api/voice/inbound` (currently Twilio's demo)
- [ ] Stable HTTPS `API_PUBLIC_URL` — not a `trycloudflare` tunnel
- [ ] `TWILIO_VALIDATE_WEBHOOKS=true`
- [ ] Recording announcement matches local consent law (TRAI in India)
- [ ] `automatedCallingEnabled` stays **off** unless you intend robocalling
- [ ] Rotate the credentials committed to `.env`

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Every call fails, `20003 Authenticate` | A rejected API key masking a good auth token | `node scripts/check-twilio.js`; blank `TWILIO_API_KEY_*` (now auto-demoted at boot) |
| "Calls are disabled: Twilio cannot reach this server" | `API_PUBLIC_URL` host is dark | Restart the tunnel, update `API_PUBLIC_URL`, restart the API |
| Rescheduled call never rings | Auto-dial toggle off on the reschedule modal | Tick "Dial automatically at the new time" |
| Want to prove the phone rings at all | — | `node scripts/place-test-call.js +91…` (inline TwiML, no tunnel needed) |
| Button says "opens your dialler" | Agent has no phone | Settings → Profile |
| Nothing in Twilio's call log | Same — the tel: link never hits the backend | as above |
| `13216 Invalid TimeLimit value` | `TWILIO_MAX_CALL_SEC` above the account cap | ≤ 899 (now auto-retried without it) |
| `21219 unverified` | Trial calling an unverified number | Verify it, or upgrade |
| `21215` / `13225` | Geo permissions | Console → Voice → Geographic Permissions → enable India |
| Call connects then silence | Twilio can't fetch TwiML | `API_PUBLIC_URL` must be public HTTPS |
| Status stuck at `ringing` | Status callback never arrived | `calls:reconcile` settles it within 10 min; check reachability |
| Scheduled call never dials | `autoDial` not ticked | Tick "Dial automatically", or dial from the reminder |
| Status not updating live | API not restarted | Restart; check the inbox pill reads **Live** |
