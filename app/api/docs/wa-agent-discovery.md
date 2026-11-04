# WhatsApp agent gateway — Step 0 discovery

Date: 2026-11-04 · Branch: `feature/kd/whatsapp-bot` (cut from `main` at `b1e2fa0`) · Read-only step: this file is the only change.

Governing brief: `Refs/WhatsApp Agent Gateway Build Brief.md` (untracked). Section numbers below refer to it.

---

## 0. Blockers and conflicts (read these first)

| # | Finding | Affects | Severity |
|---|---|---|---|
| B1 | **The local `app/api/.env` points at a remote MongoDB, database `cocomadigital`, not localhost.** It also carries real Gmail SMTP, Twilio and Google Calendar credentials. Running `npm run dev` on this machine today writes to that database, emails real inboxes and can place Twilio calls / WhatsApp sends. Not verified by connecting (deliberately). Treat it as production until proven otherwise. | 4b, every step | **Stop-level** |
| B2 | **Docker is not installed on this machine, and nothing listens on `127.0.0.1:27017`.** The 4b default (Mongo + Mailpit in Docker) cannot run as written, and the existing `tests/meetingFlow.test.js` (the booking regression test) cannot run either. | 4b, baseline, steps 4–6 | **Stop-level** |
| B3 | The env variable is **`MONGO_URI`**, not `MONGODB_URI` (`src/config/db.js:34`). The brief's 4b text and guard rules must use `MONGO_URI`. | 4b | Naming fix |
| B4 | **`dotenv` only reads `app/api/.env`** (`src/server.js:1`, `require('dotenv').config()`). A `.env.local` is never loaded. Preloading it (`DOTENV_CONFIG_PATH=.env.local node -r dotenv/config src/server.js`) works without code changes, **but dotenv never overrides an already-set key and still reads `.env` afterwards — any key missing from `.env.local` silently falls through to the real `.env` (Twilio, Google, SMTP).** `.env.local` must therefore set every sensitive key explicitly (blank where unused). | 4b | High |
| B5 | **No separate booking or enquiry service exists.** All orchestration is inline in `src/controllers/api/contactController.js` (`contact`, `freeConsultation`). The building blocks it calls *are* callable without `req` (see §2), so a thin wrapper is possible, but it means **re-composing ~40 lines of the booking sequence in new code**, which can drift from the website path later. See §9 for options. | 4, steps 4–5 | Decision needed |
| B6 | **CRM channel for bookings.** `ingest()` in `src/crm/services/leadIngest.js:139` only auto-creates the CRM discovery call (+ its 15-min reminder job) when `channel === 'meeting'`. A WhatsApp booking ingested as `whatsapp_inbound` would **skip** that call and score 0 (`SCORE` map, line 18). "Same as the website" and "channel `whatsapp_inbound`" conflict for `/book`. | 4, step 5 | Decision needed |
| B7 | **`/enquiry` with optional `email` cannot be stored as-is.** `ContactUs.email` is `required: true` (`src/models/ContactUs.js:6`), and so is `FreeConsultationItem.email`. | 4, step 4 | Decision needed |
| B8 | **16 KB body limit cannot be a router-level `express.json`.** `src/server.js:198` parses every body globally with a **50 MB** limit before any router runs; a second parser in the new router is a no-op. | 4, step 3 | Design change |
| B9 | **Global error handler leaks internals.** `src/middleware/errorHandler.js` returns `err.message` and, on E11000, the duplicate **field name** (`"${field} already exists"`). Thrown errors from the new router would reach it via `express-async-errors`. The new router must catch everything itself and end with its own error middleware. | Rule 5 | Design constraint |
| B10 | The 4b startup guard (refuse to boot against production) **cannot be added without touching an existing file** (`src/server.js` or `package.json` scripts). Section 2 allows only the router mount, `.env.example`, and `package.json` for a real dependency. | 4b | Needs your OK |
| B11 | Hard-coded fallback recipient: `ownerEmail()` in `src/services/bookingMailer.js:8` returns `anil@cocomadigital.com` when `OWNER_EMAIL` is unset. A dev env that forgets `OWNER_EMAIL` sends owner mail to a real inbox *if* SMTP is live. Mailpit-only SMTP neutralises it; still set `OWNER_EMAIL` explicitly in dev. | 4b | Medium |
| B12 | Branch/process mismatch: the brief names `feature/wa-agent-gateway` and says "Kirk deploys"; the repo is on `feature/kd/whatsapp-bot`, and `CLAUDE.md` says only Anshu merges to `main` (which auto-deploys). The brief also says commit after each step; `CLAUDE.md` says commit only when asked. | Process | Confirm |
| B13 | Baseline `git status` is **not clean**: untracked `Refs/` and `app/web/REFS/` (pre-existing, not touched). | §6 | Info |

---

## 1. Routes and mounting (brief §3.1)

| Endpoint | Router file | Handler (controller) |
|---|---|---|
| `POST /api/contact` | `src/routes/api/contact.js:4` | `contact` — `src/controllers/api/contactController.js:16` |
| `GET /api/contact/availability` | `src/routes/api/contact.js:5` | `availability` — `contactController.js:73` |
| `POST /api/contact/free-consultation` | `src/routes/api/contact.js:6` | `freeConsultation` — `contactController.js:138` |

Mounted in `src/server.js:348`: `app.use('/api/contact', apiContactRoutes);`. The new router would mount alongside it (e.g. after line 356, before the CRM block), one line.

Website callers do not hit the API directly; they go through the Next.js proxy `app/web/src/app/content-api/[...slug]/route.ts` (`POST_MAP`: `contact-leads → /contact`, `consultation-leads → /contact/free-consultation`). So from the API's point of view the website's requests come from the Next server, not the visitor's IP.

Availability has three modes: `?date=YYYY-MM-DD&tz=`, `?month=YYYY-MM&tz=`, and the legacy `?from=&to=`. The `date` mode returns slot `time` values in the caller's zone, each with `startUtc`, `slotKey`, `booked`, plus a `closed` flag. The agent can use the `date` and `month` modes as they are.

## 2. Services and helpers (brief §3.2)

**Logic is inline in the handlers. There is no booking or enquiry service layer.** Every primitive below is a plain function that takes no `req`/`res`:

| Concern | Function | File | Notes |
|---|---|---|---|
| Wall-clock → UTC | `zonedTimeToUtc(date, time, tz)` | `src/utils/timezone.js:6` | Accepts `HH:mm` or `HH:mm:ss` (seconds ignored). Returns `Date` or `null`. |
| Valid IANA zone | `isValidTimeZone(tz)` | `src/utils/timezone.js:73` | Uses `Intl.DateTimeFormat`, exactly as the brief asks. Reuse it. |
| Slot gate (closed day / blocked date / off-grid time / past or min-notice) → **400** | `validateBookingInstant(startUtc)` | `src/utils/bookingWindow.js:468` | Returns `{ok:false, message}` (message safe to relay) or `{ok:true, config}`. All four 400 reasons map to `slot_not_offered`. |
| Slot already taken → **409** | inline `Meeting.findOne({slot_key, status:{$in:['pending','confirmed']}})` | `contactController.js:184` | Plus a race guard: E11000 on `Meeting.create` → 409 (line 214), backed by the unique sparse `slot_hold` index. |
| Slot key | `slotKeyOf(iso)` (local, not exported) | `contactController.js:43` | Same algorithm is exported as `slotKeyOf` from `bookingWindow.js:93`. |
| Booking creation | inline `Meeting.create({... status:'pending'})` | `contactController.js:197` | `duration: 15`, `notes: notes \|\| message`. |
| Enquiry creation | inline `ContactUs.create({name,email,phone,subject,message})` | `contactController.js:19` | |
| Owner email (enquiry) | `sendContactEnquiryEmail(lead)` | `src/services/bookingMailer.js` (near end) | Owner only, no visitor email. Fire-and-forget. |
| Owner + visitor emails (booking) | `sendMeetingRequestEmails(booking)` | `bookingMailer.js:222` | Owner email includes admin action links built from `meetingId`. Visitor email skipped if the visitor's address is the owner's. |
| CRM mirror | `ingestSafe(input)` | `src/crm/services/leadIngest.js:186` | **In-process function, not HTTP** — see §5. |
| Confirm → Meet link | `confirm` | `src/controllers/admin/meetingController.js:178` → `createMeetingEvent` in `src/services/calendarService.js` | Admin-only path. The gateway never imports either. |

The general consultation branch of `freeConsultation` (no slot) writes `FreeConsultationItem` and calls `sendBookingEmails`; the gateway does not need it.

## 3. Models and fields (brief §3.3)

**`ContactUs`** — `src/models/ContactUs.js`, collection `contact_us`, `strict: false`, timestamps.
`slug`, `name` (req), `email` (req, lowercased), `phone`, `subject`, `message` (req), `isRead` (0/1).
No `source_page`, `channel` or `service` field in the schema, but `strict: false` means extra keys (e.g. `source_page: 'whatsapp'`) are stored without a schema change. The website maps its inquiry type into `subject` and prefixes the message with `[Type: …]`.

**`Meeting`** — `src/models/Meeting.js`, collection `meetings`, strict, timestamps.
`userName` (req), `email` (req, lowercased), `phone`, `companyName`, `meetingDate` (string, visitor zone), `meetingTime` (string, visitor zone — website stores `HH:mm:ss`), `meetingTimezone`, `meeting_start_utc` (Date), `slot_key` (`YYYY-MM-DDTHH:mm` UTC), `slot_hold` (derived in `pre('save')`), `duration` (15), `notes`, `service`, **`source_page`** (website sends `/ScheduleMeeting`), **`status`** enum `pending|confirmed|rejected|completed` (default `pending`), Meet fields (`meetLink`, `meetId`, `google_event_id`, `google_html_link`), confirm/reject/reschedule/assign audit fields, `reminderSentAt`.
Indexes: unique partial on `slot_key` where `status:'confirmed'`; unique sparse on `slot_hold` (atomic pending reservation).
No `channel` field; `source_page: 'whatsapp'` is the marker on the booking itself.

**`MeetingAvailability`** — `src/models/MeetingAvailability.js`, collection `meeting_availability`, one doc `key:'default'`: `timezone` (default `Asia/Kolkata`), `slotStepMinutes` 15, `minNoticeMinutes`, `days[]` (`weekday`, `enabled`, `slots[]` as `HH:mm` studio time), `blockedDates[]`. **If absent, `getAvailabilityConfig()` creates an all-open default (7 days, 00:00–23:45)** — so a fresh dev DB books anything unless seeded. Config is cached 30 s in-process.

**`FreeConsultationItem`** — collection `free_consultation_item`; legacy slot fields; not used by the gateway.

**`CrmLead`** — `src/crm/models/crm.js:5`, collection `crm_leads`. `name`, `email`, `phone`, `company`, `source.{channel, externalId, externalCollection, sourcePage, raw}`, `serviceInterest`, `budget`, `message`, `status`, `score`, `rating`, owner/convert fields, `deletedAt`.
`source.channel` enum: `contact_form, marketing_form, consultation, meeting, whatsapp_inbound, manual, import, referral`. **`whatsapp_inbound` already exists** — no model change needed. It is also used today by `src/crm/services/messaging.js:~700`, which auto-creates leads from inbound WhatsApp webhooks (Meta/Twilio) named `WhatsApp <last10>`.

## 4. Middleware on `/api/` and process model (brief §3.4)

Order in `src/server.js`:

1. `helmet()` — line 132, defaults.
2. `express-rate-limit` v7 — lines 134–145, on `/api/`: **500 req / 15 min per IP**, default **in-memory** store. Skipped for loopback when `NODE_ENV !== 'production'`. `trust proxy` = 1 (Apache in front).
3. `cors` — lines 148–159, allow-list from `CORS_ORIGINS`; requests **without an Origin header pass** (AiSensy server-to-server calls will pass).
4. `express.json({ limit: '50mb' })` + `urlencoded` 50 MB — lines 198–207 (B8).
5. `morgan('combined')` → winston — line 208. Logs method, URL, status, IP, user agent. **Does not log headers or bodies**, so `X-Agent-Key` is not logged by it.
6. DB-down guard → 503 `DB_UNAVAILABLE` for `/api/*` — lines 222–234.
7. Global `errorHandler` — line 381 (B9).

**Not present:** `express-mongo-sanitize` or any NoSQL sanitiser, any validation library (`joi` is in `node_modules` only as a transitive dep of root devDep `wait-on` — not usable), any per-route body limit.

**Process model: one process.** `scripts/deploy.sh` starts the API with `pm2 start src/server.js --name cocoma-api` (fork mode, no `-i`) and reloads it with `pm2 reload`. Same process also runs Socket.IO, the CRM workers (`src/crm/services/workers.js`, Mongo-backed jobs) and the meeting reminder poller. Caveat: the server's own `ecosystem.deploy.js` is git-ignored; if the live `cocoma-api` was ever started from it in cluster mode this would differ. **Kirk: confirm with `pm2 describe cocoma-api` (look at `exec mode` and instance count).** Code comments (`bookingWindow.js:166`, `server.js:169`) anticipate a future multi-process setup.

Recommendation on quota storage despite one process: **Mongo (`wa_agent_quotas`, TTL 24 h)**. Every deploy runs `pm2 reload`, which wipes in-memory counters, so a 24-hour per-sender quota held in memory resets on each deploy.

## 5. Email and CRM mirror wiring (brief §3.5)

**Email:** `nodemailer` via `src/services/mailer.js` (`sendMail`, `verify`, `isConfigured`, `mailFrom`). One pooled SMTP transport built from `SMTP_HOST/PORT/USER/PASS/SECURE`, `MAIL_FROM`. Templates are not files: each flow has a builder function in `src/services/bookingMailer.js` (`sendContactEnquiryEmail`, `sendMeetingRequestEmails`, `sendMeetingConfirmedEmails`, …) that composes inline HTML via `shell()`/`row()` helpers and escapes values with `esc()`.

- Recipient for owner mail: `ownerEmail()` = `OWNER_EMAIL` or the hard-coded fallback (B11). Confirmed/rescheduled/rejected mails also go to the assigned team member.
- **No dev/test/dry-run mode.** The only "off switch": if any of `SMTP_HOST/USER/PASS` is empty, `sendMail` logs a warning and returns `{skipped:true}` — so blank SMTP vars act as a dry run. Otherwise all mail goes through the configured SMTP; **nothing bypasses SMTP config**, so pointing SMTP at Mailpit captures everything. Note that `isConfigured()` requires `SMTP_USER` and `SMTP_PASS` to be non-empty; Mailpit must be told to accept any credentials (`MP_SMTP_AUTH_ACCEPT_ANY=1`, `MP_SMTP_AUTH_ALLOW_INSECURE=1`) — not yet tested.
- The existing mailer logs recipient addresses (`Mailer: sent "<subject>" to <address>`). That is existing behaviour and stays; the new `[wa-agent]` line will not log emails.
- Separately, CRM `notify()` (`src/crm/services/notify.js`) emails CRM users through the same mailer.

**CRM mirror:** `ingestSafe()` → `ingest()` in `src/crm/services/leadIngest.js`. **It is an in-process function that writes to the same Mongo connection. No HTTP call, no CRM URL, no token.** So switching `MONGO_URI` to a dev database isolates it completely; **no `CRM_MIRROR_URL` stub is needed** (brief §4b's HTTP case does not apply). What it does:

1. Idempotent on `(externalCollection, externalId)`.
2. Dedup by email or phone tail (last 10 digits) against open leads → records a `lead.re_enquired` timeline entry instead of a new lead; against contacts → timeline entry and a task for the owner.
3. Creates `CrmLead` with `source.channel`, scores it, writes a timeline entry.
4. **Only if `channel === 'meeting'`:** creates a `CrmCall` at the slot and schedules a `call:reminder` job (B6).
5. `notifyRole(['Admin','Manager'])` (in-app + email), and `automation.emitEvent('lead.created')`.

Side-effect risk: automation rules can `send_whatsapp` / `send_email` / `send_sms` / `schedule_call` (`src/crm/services/automation.js:277`), gated by settings switches for automated sends. In an empty dev DB there are no rules, so nothing fires; **do not copy automation rules into dev**, and keep Twilio/Meta credentials blank in the dev env (B4). `tests/meetingFlow.test.js` already stubs `leadIngest` for exactly this reason.

## 6. Test setup and baseline (brief §3.6)

- **No test framework, no `npm test` script** (`app/api/package.json` has none; root neither). Tests are standalone Node scripts using `assert`, run one by one with `node tests/<name>.test.js`; each prints PASS/FAIL lines and sets the exit code.
- Media tests stub their models via `require.cache` (no DB). `meetingFlow.test.js` is a real end-to-end test of the booking flow through the real routers and Mongoose models; it fakes SMTP (captures `nodemailer.createTransport`), Google Calendar and the CRM ingest, and **requires a real local MongoDB** (`MEETING_TEST_MONGO_URI`, default `mongodb://127.0.0.1:27017/meeting_flow_test`; it refuses any non-local URI and drops that DB). No in-memory Mongo is installed.
- None of the tests load `.env`.

**Baseline, run 2026-11-04 on Node v24.19.0:**

| Script | Result |
|---|---|
| `tests/mediaAssetFilters.test.js` | exit 0 — 20 / 20 pass |
| `tests/mediaIngest.test.js` | exit 0 — 16 / 16 pass |
| `tests/mediaPersonTagging.test.js` | exit 0 — 14 / 14 pass |
| `tests/mediaVideo.test.js` | exit 0 — 18 / 18 pass |
| `tests/meetingFlow.test.js` | **exit 1 — not run**: `MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017` (environment, not code). 16 tests in the file. |

**Baseline: 4 / 5 scripts green, 68 / 68 assertions pass; 16 booking-flow tests unverified pending a local MongoDB.** The meetingFlow baseline must be established (once Mongo is available) before step 1, since it is the regression test for exactly the code the gateway reuses.

> **Update, later on 2026-11-04 (step 4b):** with a local `mongod` 8.0.34 on 127.0.0.1:27017, `tests/meetingFlow.test.js` passes **16 / 16**. Full baseline before step 1: **5 / 5 scripts, 84 / 84 checks.**

## 7. Env handling (brief §3.7)

- Loaded once by `require('dotenv').config()` at `src/server.js:1` → reads `app/api/.env` only (B4). `src/utils/envFile.js` can rewrite `.env` (used by the Google OAuth helper route).
- `app/api/.env.example` exists and **is tracked** (force-added; note that root `.gitignore` lists `.env.example`, so a *new* example file elsewhere would be ignored unless force-added). It currently lists a personal Gmail address as `OWNER_EMAIL` — not a secret, left untouched.
- Variables are read directly via `process.env.X` at call time (no central config module).
- Relevant keys: `MONGO_URI`, `NODE_ENV`, `PORT`, `CORS_ORIGINS`, `SMTP_*`, `MAIL_FROM`, `MAIL_BRAND`, `OWNER_EMAIL`, `OWNER_NAME`, `ADMIN_PANEL_URL`, `GOOGLE_*`, `MEETING_HOST_EMAIL`, `BOOKING_TIMEZONE`, `TWILIO_*`, `WHATSAPP_TEST_TO`, `API_PUBLIC_URL`, `CRM_PUBLIC_PATH`.

## 8. Timezone handling in the booking flow (brief §3.8)

1. Input `meeting_date` (`YYYY-MM-DD`), `meeting_time` (website sends `HH:mm:ss`, from `convertTo24Hour` in `app/web/src/views/Sedulemeating/ScheduleMeetingDetail.tsx:22`), `meeting_timezone` (IANA).
2. `visitorTz = isValidTimeZone(meeting_timezone) ? meeting_timezone : null`.
3. UTC is **recomputed server-side**: `zonedTimeToUtc(date, time, visitorTz)`; the client's `meeting_start_utc` is only a fallback.
4. `validateBookingInstant(utc)` maps the instant into the **studio zone** (`config.timezone`, default `Asia/Kolkata`) and checks blocked date → weekday enabled → `HH:mm` on the enabled slot list → future + min notice.
5. Stored: `meetingDate`/`meetingTime`/`meetingTimezone` as the visitor sent them (or re-derived in studio zone if the visitor zone was invalid), `meeting_start_utc` as a UTC `Date`, `slot_key` = `toISOString().slice(0,16)`.
6. Emailed: owner sees the slot in IST via `formatInTimeZone(utc, 'Asia/Kolkata')` labelled "IST" (e.g. `Nov 11, 2026 · 3:00 PM`-style, `en-US` format); the visitor sees it in their own zone labelled with the raw IANA name (e.g. `America/New_York`).

For the gateway's `when` string (`Wed 11 Nov 2026, 3:00 PM IST`): no single `Intl` locale yields both the `IST` and `EST` abbreviations (`en-US` gives `GMT+5:30` for Kolkata, `en-IN` gives `GMT-5` for New York). The new formatter must assemble the parts itself, with a small abbreviation map and a `GMT±h:mm` fallback. (The brief's example says "Tue 11 Nov 2026"; 11 Nov 2026 is a Wednesday.)

## 9. Impact on brief §4 / §4b and proposed resolutions

| Issue | Proposal | Regression risk |
|---|---|---|
| B5 no service layer | **(A, recommended)** New `src/services/waAgentService.js` that composes the same exported primitives in the same order as `freeConsultation` (validate → taken check → `Meeting.create` → E11000 → 409 → `sendMeetingRequestEmails` → `ingestSafe`). No existing file touched. A parity test asserts a gateway booking and a website booking produce equivalent `Meeting` docs and emails. **(B)** Extract the inline logic from `contactController.js` into a shared service used by both. Removes duplication but edits an existing controller. | A: none to existing code; drift risk covered by the parity test. B: medium, needs `meetingFlow` green before and after. |
| B6 booking channel | **(A, recommended)** Ingest bookings as `channel: 'meeting'`, `sourcePage: 'whatsapp'`, `raw.via: 'whatsapp_inbound'` — keeps the CRM call + reminder exactly like the website, and the lead's source page shows WhatsApp. **(B)** `whatsapp_inbound` as the brief says, and accept no auto-created CRM call. Enquiries use `whatsapp_inbound` either way. | None for both. A deviates from the brief's wording; B deviates from website parity. |
| B7 enquiry email | **(A, recommended)** Make `email` required on `/enquiry`. **(B)** Keep it optional and, when missing, write the enquiry to the CRM only (no `contact_us` row, no owner email via that path). | None. B changes what "same as contact form" means. |
| B8 16 KB limit | In the new router's first middleware: reject with 413 if `Content-Length` > 16384 or missing, and as a backstop if `Buffer.byteLength(JSON.stringify(req.body))` > 16384. Leave `server.js` order untouched. | None. The global parser still reads up to 50 MB before rejection, the same exposure every other `/api` route has today. |
| B9 error leaks | Wrap every handler; router-local error middleware returning `{ok:false, reason:'server_error', message:…}`; never pass to `next(err)`. | None. |
| Quota store | Mongo collection `wa_agent_quotas` with a TTL index (24 h), new model file. | None (new collection). |
| Global 200/h cap | `express-rate-limit` (already a dependency) with a fixed key, memory store; acceptable since a reset only loosens a short window. | None. |
| Validation | Hand-written validator in a new file (no library in the API; no new dependency). | None. |
| Idempotency | Before creating, look up a `Meeting` with `phone = wa_from`, same `slot_key`, `source_page:'whatsapp'`, `createdAt` within 2 min; return its stored `booking_ref`. Requires storing `booking_ref` on the meeting (Meeting is strict, so it is dropped unless added to the schema) **or** in a new `wa_agent_refs` collection mapping ref → meeting id. Recommend the new collection, no schema change. | None with the new collection. |
| B1/B2/B4 environment | Install Docker Desktop (or OrbStack, or Homebrew `mongodb-community` plus a Mailpit binary). Create `app/api/.env.local` from scratch (not from `.env`), with every Twilio/Google/Meta/AWS key blank, SMTP → Mailpit, `OWNER_EMAIL` a fake address, `MONGO_URI=mongodb://localhost:27017/cocoma_dev`. Start with `DOTENV_CONFIG_PATH=.env.local node -r dotenv/config src/server.js`. | None to code. |
| B10 startup guard | Guard as an **allow-list**, not a deny-list: when `NODE_ENV !== 'production'`, refuse to boot unless `MONGO_URI` host is `localhost`/`127.0.0.1` or its DB name is `cocoma_dev`. Lives in new `src/config/devDbGuard.js`; wiring needs one of: (a) one `require` line at the top of `server.js`, or (b) a new `dev:local` script in `package.json` using `node -r ./src/config/devDbGuard.js`. Recommend (b): `server.js` and `npm run dev` stay unchanged. The allow-list means the production host name never needs to be written into the repo. | (a) one line in the entry file; (b) none at runtime. |

## 10. Proposed new files (conventions: camelCase filenames under `app/api/src/…`)

| File | Purpose | Step |
|---|---|---|
| `app/api/docs/wa-agent-discovery.md` | This document | 0 |
| `app/api/docker-compose.dev.yml` | `mongo:7` (27017, named volume) + `axllent/mailpit` (1025/8025) | 4b |
| `app/api/.env.local` (git-ignored, not committed) | Dev env | 4b |
| `app/api/src/config/devDbGuard.js` | Allow-list startup guard | 4b |
| `app/api/scripts/seed-dev.js` | Idempotent seed: availability doc from a Kirk-provided JSON, 3–5 synthetic meetings/enquiries; refuses non-dev URI | 4b |
| `app/api/src/routes/api/waAgent.js` | Router with the rules comment block (§2 rules 1–3, 7); `/health`, `/book`, `/enquiry`; router-local error handler | 1, 4, 5 |
| `app/api/src/middleware/waAgentAuth.js` | `WA_AGENT_KEYS`, `timingSafeEqual`, 401 logging (IP + first 4 chars) | 2 |
| `app/api/src/middleware/waAgentRateLimit.js` | Body-size gate, per-sender quotas, global cap | 3, 6 |
| `app/api/src/validation/waAgent.js` | Strict schemas for both bodies | 3 |
| `app/api/src/services/waAgentService.js` | `createBooking`, `createEnquiry`, `formatWhen`, ref generation | 4, 5 |
| `app/api/src/models/WaAgentQuota.js` | `wa_agent_quotas` with 24 h TTL | 6 |
| `app/api/src/models/WaAgentRef.js` | `wa_agent_refs`: opaque ref → record id, for idempotency (if approved) | 5, 6 |
| `app/api/tests/waAgent.test.js` | Same style as `meetingFlow.test.js` (plain Node + assert, local Mongo, faked SMTP/CRM) | 1–6 |
| `app/api/postman/wa-agent-gateway.postman_collection.json` + `wa-agent-gateway.postman_environment.json` | Requests and a bad-inputs folder, `agentKey = REPLACE_ME` | 1, 3 |
| `app/api/docs/wa-agent-gateway.md` | Contracts, env, cURL, AiSensy field text, rotation, changelog | 1, 7 |

**Existing files to be edited (planned):** `app/api/src/server.js` (one mount line), `app/api/.env.example` (`WA_AGENT_KEYS=REPLACE_ME` and any dev-env notes), `app/api/package.json` (only if B10 option (b) is chosen: one `dev:local` script, plus a `test:wa-agent` script if you want one — no dependencies).

## 11. Decisions needed from Kirk before step 4b / step 1

1. B1: confirm that the remote DB in `app/api/.env` is production, and that nothing in this work runs with that `.env` loaded.
2. B2: how to get a local MongoDB + Mailpit (Docker Desktop / OrbStack / Homebrew), so `meetingFlow.test.js` can set its baseline.
3. B5: service approach A (new composing service) or B (extract a shared service).
4. B6: booking CRM channel `meeting` + `sourcePage:'whatsapp'` (A) or `whatsapp_inbound` (B).
5. B7: `email` required on `/enquiry` (A) or CRM-only when missing (B).
6. B10: guard wiring (a) a line in `server.js` or (b) a `package.json` script.
7. B12: branch name (`feature/kd/whatsapp-bot` vs `feature/wa-agent-gateway`), commit cadence, and the `main`/Anshu merge path.
8. `pm2 describe cocoma-api` on the server, to confirm the single-process finding.
