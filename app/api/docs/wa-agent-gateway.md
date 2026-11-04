# WhatsApp agent gateway — `/api/wa-agent`

A small, key-protected, **write-only** API surface inside the existing Express API, called by the AiSensy WhatsApp AI agent to create discovery-call bookings and enquiries. It reuses the website's own booking and enquiry code, so WhatsApp records land in the same collections, trigger the same owner emails and mirror to the CRM the same way, marked as coming from WhatsApp.

Build brief: `Refs/WhatsApp Agent Gateway Build Brief.md`. Discovery findings: [`wa-agent-discovery.md`](wa-agent-discovery.md). Router: `src/routes/api/waAgent.js`.

Status legend in the tables below: **live** = built and tested; *step N* = planned, not built yet.

## Security rules (summary)

1. No CRM access from the gateway: no CRM login, token or `/crm/api` URL. The CRM mirror is the existing in-process service the website uses.
2. No read endpoints. Create only; never list, search or return leads, contacts, bookings or messages.
3. No calendar integration. The founder's confirm step in the admin panel is the only path to a Meet link.
4. The agent key lives in `WA_AGENT_KEYS` only; never logged, never returned, never written into docs (`REPLACE_ME`).
5. Responses carry no stack traces, internal ids, database field names or other people's data.
6. Every request field is hostile: strict schema, length caps, unknown fields rejected, no Mongo operators, plain-text storage.
7. Bookings are created `status: "pending"`; the gateway never confirms.

## Endpoints

| Method | Path | Purpose | Success | Errors | Status |
|---|---|---|---|---|---|
| GET | `/api/wa-agent/health` | Key check only | 200 `{ ok: true }` | 401 | **live** |
| POST | `/api/wa-agent/enquiry` | Create an enquiry (= website contact form) | 201 `{ ok: true, ref }` | 401, 413, 422, 429 | **live** |
| POST | `/api/wa-agent/book` | Create a pending booking (= website booking) | 201 `{ ok: true, booking_ref, status: "pending", when }` | 400 `slot_not_offered`, 401, 409 `slot_taken`, 413, 422 `invalid_input`, 429 `rate_limited` | **live** (429: *step 6*) |

Reused as-is, public, no key: `GET /api/contact/availability?date=YYYY-MM-DD&tz=<IANA>` (day's slots, each `booked` true/false) and `?month=YYYY-MM&tz=` (open dates).

Every error has the shape `{ ok: false, reason: "<code>", message: "<one plain sentence the agent can relay>" }`. Unknown paths under the prefix return 404 in the same shape. A 401 is always the same bare body whether the key is missing or wrong.

Header: `X-Agent-Key: <key>`. Optional `X-Conversation-Id` is echoed into the log line only.

## Request validation

Bodies must be JSON objects under 16 KB (413 `payload_too_large` otherwise). Every field is checked in the order below and the **first** failure is answered 422 `{ ok: false, reason: "invalid_input", field: "<name>", message: "<rule>" }`; the message names the rule, never the submitted value. Unknown fields are rejected (`field` = the unknown key, or `unknown` if the key itself is not a plain identifier).

| Field | `/book` | `/enquiry` | Rule |
|---|---|---|---|
| `wa_from` | required | required | 10–15 digits, no `+`, no spaces |
| `name` | required | required | 2–80 characters after trimming |
| `email` | required | required | valid address, ≤ 120 characters, stored lowercased |
| `meeting_timezone` | required | — | valid IANA zone (`Intl.DateTimeFormat` accepts it), e.g. `Asia/Kolkata` |
| `meeting_date` | required | — | `YYYY-MM-DD`, a real calendar date, today or later in `meeting_timezone` |
| `meeting_time` | required | — | `HH:MM:SS`, 24-hour |
| `service` | — | required | 2–80 characters |
| `message` | optional | required | ≤ 1,000 characters; newlines kept |

Applied to every string: must be a string (objects, arrays, numbers → 422); **any HTML tag → 422** (not stripped and stored under a different value — `<script>alert(1)</script>` must fail, not become the name `alert(1)`); stray `<`/`>` without a tag shape are removed; control characters removed (newline/tab kept in `message`); a value starting with `$` followed by a letter → 422; strings are hard-capped at 4 KB before any rule runs. Handlers only ever see the cleaned copy.

## Environment variables

| Variable | Purpose | Dev value |
|---|---|---|
| `WA_AGENT_KEYS` | Comma-separated list of valid agent keys (two during rotation). Read at request time. | `testkey1,testkey2` |

No other variables are introduced by the gateway. Email, CRM and database settings are the API's existing ones.

### Key rotation

1. Generate a new key (e.g. `openssl rand -hex 32`).
2. Set `WA_AGENT_KEYS=<old>,<new>` on the server and restart the API. Both keys now work.
3. Update the AiSensy action's `X-Agent-Key` header to `<new>` and run its Test call.
4. Set `WA_AGENT_KEYS=<new>` and restart. The old key stops working; a 401 is logged with `key_prefix=<first 4 chars>` if anything still uses it.

## Running locally (isolated from production)

Everything runs against a development database and a local mail sink. Production is never touched; see the discovery doc §0 and §9 for why each piece exists.

- `app/api/.env.local` (git-ignored): complete copy of `.env.example` with `MONGO_URI` pointing at a database named `cocoma_dev` (or localhost), SMTP at Mailpit (`127.0.0.1:1025`), `OWNER_EMAIL` at a test inbox, every provider credential blank, `WA_AGENT_KEYS=testkey1,testkey2`.
- `npm run dev:local` (root: API + admin + CRM + web; or inside `app/api` for the API alone). The API refuses to boot unless `MONGO_URI` passes `src/config/devDbGuard.js`.
- `npm run seed:dev` (inside `app/api`): admin login, studio schedule, synthetic records. Idempotent; refuses non-dev URIs.
- Mailpit: `mailpit --smtp-auth-accept-any --smtp-auth-allow-insecure`, inbox at http://localhost:8025.
- Tests: `node tests/waAgent.test.js`, plus the existing scripts in `tests/` (`meetingFlow.test.js` needs a local MongoDB on 127.0.0.1:27017; `~/.cocoma-dev/mongo/start.sh`).
- Postman: import `postman/wa-agent-gateway.postman_collection.json` and `postman/wa-agent-gateway.postman_environment.json`; set `agentKey` in the environment.

## AiSensy setup

*Completed in step 7: cURL for each action with `REPLACE_ME`, Request-field descriptions, "When should the agent call it" wording.*

## What `/enquiry` does

Same three steps as the website's Contact Us form, through the same code (`services/leadIntake.js`): one `contact_us` record, one owner email (none to the sender), one CRM lead. Mapping: `wa_from` → `phone`; `service` → `subject` (and CRM `serviceInterest`); `message` stored as `[via WhatsApp · ref XXXXXXXX]\n\n<message>` so the origin and the reference are visible in the admin panel and the email, the way the website prefixes `[Type: …]`; `source_page: "whatsapp"` on the record; CRM channel `whatsapp_inbound`, `source.sourcePage: "whatsapp"`, `source.raw: { subject, via: "whatsapp", wa_ref }`. The `ref` is 8 characters from an alphabet without look-alikes, random, not derived from any id. The CRM's existing phone dedupe applies: a sender already known as a lead gets a "re-enquired" entry on that lead instead of a duplicate.

## What `/book` does

Same sequence as the website's /ScheduleMeeting submit, through the same code (`services/leadIntake.js`, `createMeetingRequest`): the admin-schedule gate on the UTC instant (closed day, blocked date, off-grid time, past) → 400 `slot_not_offered` with the schedule's own sentence; slot already pending/confirmed → 409 `slot_taken`; one `meetings` record with **`status: "pending"`**; the duplicate-key race guard on `slot_hold` → 409; owner + visitor "request received" emails; CRM lead with **channel `meeting`** (so the CRM schedules the discovery call and its reminder exactly as for a website booking), `source.sourcePage: "whatsapp"`, `raw: { meeting_date, meeting_time, meeting_timezone, via: "whatsapp", wa_ref }`. No calendar call: the Meet link is created only when the founder confirms in the admin panel, and that path is unchanged (covered by a test that confirms a WhatsApp booking through the real admin route).

Mapping: `wa_from` → `phone`; `service` = `Discovery Call` (the website's default); `source_page: "whatsapp"`; `notes` = `[via WhatsApp · ref XXXXXXXX]` + the optional message; `meetingDate/Time/Timezone` stored as the sender gave them; `meeting_start_utc` recomputed server-side from them. `when` is the slot on the sender's clock, e.g. `Wed 11 Nov 2026, 3:00 PM IST` / `Wed 11 Nov 2026, 4:30 AM EST` (zone label: IST for India, otherwise the en-US short name such as EST/EDT/GMT/GMT+4).

## Changelog (newest first)

### 2026-11-04 — Step 5: `/book`

- **Existing file edited (option A):** `src/controllers/api/contactController.js` — the meeting branch of `freeConsultation` (slot gate → taken check → pending create → race guard → emails → CRM) moved verbatim into `createMeetingRequest` in `src/services/leadIntake.js`. The handler keeps its UTC resolution (including the client `meeting_start_utc` fallback), its `if (slot_key)` branch, its status codes and its exact messages. Three imports that moved with the code removed. Net −61 / +15 lines in the controller.
- `src/controllers/api/waAgentController.js`: `book` handler and `formatWhen`.
- `src/routes/api/waAgent.js`: `/book` wired; the 501 stub is gone.
- `tests/waAgent.test.js`: +21 cases (100 total). **Regression** on the website route: 201 shape, every record field, 2 emails, CRM call with the exact `raw`; closed day 400 and taken 409 with the unchanged messages; unusable-timezone fallback still books in studio time. **Gateway:** 201 with exactly `{ ok, booking_ref, status, when }`; `when` for `Asia/Kolkata` (IST) and `America/New_York` (EDT) checked against an independent formatter; record fields incl. `slot_hold`, `status: pending`, `source_page: whatsapp`, prefixed notes, no Meet fields; same key set as a website record; owner email in IST naming WhatsApp and the ref, visitor email in their zone; CRM channel `meeting` + `sourcePage` + `raw`; **zero calendar calls**; 409 from another sender, 409 when the website took the slot first; 400 Sunday / off-grid / outside hours / New York off-grid; race (pre-check bypassed, unique index wins) → 409 with no index name leaked; 500 shape; and a WhatsApp booking **confirmed through the real admin route** → `confirmed`, exactly one calendar call.
- Tests: existing suite 84/84 (meetingFlow 16/16 over the edited controller), gateway 100/100.
- Live check against `cocoma_dev` (real CRM ingest, Mailpit): open slot → 201 `when: "Tue 10 Nov 2026, 4:00 PM IST"`, pending record with `source_page: whatsapp`; slot held by the seed's confirmed meeting → 409; seeded occupied Monday 11:00 → 409; Sunday → 400 with the schedule's sentence; `America/New_York 02:30` → 201 `when: "… 2:30 AM EST"`, stored `07:30Z` (13:00 IST), owner email "… 1:00 PM (IST)", visitor email in their zone; CRM lead channel `meeting`, score 40 / warm, `raw.wa_ref` set.
- **Pre-existing CRM issue found (not introduced here, not fixed here — CRM is out of scope):** `leadIngest` logs `CrmCall validation failed: ownerId: Path 'ownerId' is required` for every `meeting`-channel lead, website bookings included (verified side by side on the dev DB). The lead is created; the auto-scheduled discovery call, its reminder job, the "new lead" notification and the automation event after it are skipped. Likely the same on production unless leads get an owner before ingest. Worth a separate ticket for the CRM.

### 2026-11-04 — Step 4: `/enquiry`

- **Existing file edited (option A, agreed in step 0):** `src/controllers/api/contactController.js` — the `contact` handler's three calls (`ContactUs.create` → `sendContactEnquiryEmail` → `crmIngest`) moved verbatim into new `src/services/leadIntake.js` (`createContactEnquiry`); the handler keeps its parsing, 400 check and response. Two imports that moved with the calls removed. Net: −23 / +5 lines in the controller.
- New `src/services/leadIntake.js`: optional `source_page`, `channel`, `raw` with defaults chosen so an unchanged caller yields an unchanged record, email and CRM call (`source_page` is only written when given — website records gain no field).
- New `src/controllers/api/waAgentController.js`: `enquiry` handler and `newRef()`.
- `src/routes/api/waAgent.js`: `/enquiry` wired to the handler; `/book` still 501 until step 5.
- `tests/waAgent.test.js` now needs the local test MongoDB (`wa_agent_test`, refuses non-local URIs) and fakes SMTP + CRM ingest like `meetingFlow.test.js`. +10 cases (79 total): **regression** — website `POST /api/contact` response shape, record fields (no `source_page`), one owner email with reply-to, CRM call (`contact_form`, `raw: { subject }`, no `sourcePage`), 400 wording; **gateway** — 201 `{ ok, ref }` only, no `_id` in the response; record phone/subject/source_page/message prefix; same key set as a website record apart from `source_page`; one owner email naming the service and the ref, none to the sender; CRM call with `whatsapp_inbound`, `sourcePage`, `raw`; distinct refs; a failing write → 500 in the gateway shape with the error text kept out of the response.
- Tests: existing suite 84/84 (meetingFlow 16/16 over the edited controller), gateway 79/79.
- Live check against `cocoma_dev` (real CRM ingest, Mailpit): `POST /enquiry` → 201 `{ ok, ref }`; `contact_us` record with `phone = wa_from`, `subject = service`, `source_page: whatsapp`, prefixed message; `crm_leads` record `source.channel: whatsapp_inbound`, `sourcePage: whatsapp`, `raw.wa_ref` = the ref, score 10 / cold (phone +10; the channel itself scores 0 in the CRM's table); one email to `OWNER_EMAIL` "New enquiry: Live Check — Podcast Editing", none to the sender; log `[wa-agent] POST /enquiry status=201 reason=ok wa_from=… conv=live-check-4`.

### 2026-11-04 — Step 3: validation layer

- New `src/validation/waAgent.js`: hand-written strict schemas for `/book` and `/enquiry` (no validation library in the API; none added). Rules as in the table above; first failing field reported; cleaned copy replaces `req.body`. Decision taken while testing: an HTML tag **rejects** the field rather than being stripped — stripping `<script>alert(1)</script>` yields the valid name `alert(1)`, which would have made the brief's injection test 5 pass silently.
- New `src/middleware/waAgentBodyLimit.js`: 16 KB ceiling via `Content-Length` and a re-serialised-body backstop (the app parses bodies globally at 50 MB before any router, so a router-level parser limit cannot work).
- `src/routes/api/waAgent.js`: middleware order is now log → body limit → key → (rate limits, step 6) → per-route validation. `POST /enquiry` and `POST /book` are mounted with validation and answer 501 `not_implemented` after passing it, until their handlers land in steps 4–5. Nothing is written.
- `tests/waAgent.test.js`: +49 cases (69 total): one per rule in the table, both bounds where there are two; `$`-operator as object and as string; array/number/object in string fields; unknown field; hostile unknown field name reported as `unknown`; HTML in required and optional fields; missing/null/empty required fields; array body; schema-order reporting; cleaning (lowercase, trim, control chars, newlines kept, stray `<` allowed); "today" accepted; 4 KB cap; 20 KB → 413 before the key check; 15 KB passes the gate; `/health` unaffected.
- Postman: the 16-request "Bad inputs" folder now runs green (newman: 16 requests, 32 assertions, 0 failed). Note on "HTML in name" corrected.
- Tests: existing suite 84/84, gateway 69/69.

### 2026-11-04 — Step 2: key middleware + logging

- Key middleware was already complete from step 1 (multi-key, timing-safe, bare 401, 401 logged with IP + 4-char prefix). No change to `waAgentAuth.js`.
- New `src/middleware/waAgentRequestLog.js`, mounted first in the router: one `info` line per request, `[wa-agent] <METHOD> <path> status=<code> reason=<ok|code> wa_from=<digits|-> conv=<X-Conversation-Id|->`. `reason` is read from the JSON actually sent (res.json wrapped per request), so a handler cannot forget it. `wa_from` is logged only when it is 10–15 digits, otherwise `-`; the conversation id is reduced to `[A-Za-z0-9_.:-]` and capped at 64 chars. Never the body, an email or the key.
- `tests/waAgent.test.js`: +6 cases (20 total) — one line per request with exact format; 401 line carries no key; body fields (name, email, message) never appear; non-numeric `wa_from` logged as `-`; conversation id sanitised and capped; line written even when the key is missing.
- Postman: `X-Conversation-Id` example header on "Health — with key".
- Tests: existing suite 84/84, gateway 20/20. Live boot: three requests produced three `[wa-agent]` lines; grep for the key, the name and the email in the log → 0 hits.

### 2026-11-04 — Step 1: scaffold + health

- New `src/routes/api/waAgent.js`: rules comment block, `GET /health`, JSON 404 for unknown paths, router-local error handler so nothing reaches the app's shared `errorHandler` (which returns raw error messages and duplicate-key field names).
- New `src/middleware/waAgentAuth.js`: `WA_AGENT_KEYS` multi-key, length check + `crypto.timingSafeEqual`, every configured key compared (no early exit), bare 401, 401 logged with IP and first 4 characters only. Built in full here rather than as a placeholder; step 2 adds the per-request `[wa-agent]` log line and `X-Conversation-Id`.
- New `tests/waAgent.test.js` (14 tests, no database): missing/wrong/prefix/empty/wrong-length keys → 401 with identical bodies; both rotation keys → 200; header case-insensitivity; whitespace tolerance; unknown path → JSON 404 with key, 401 without; log line has prefix only; keys unset → all 401; valid key never logged.
- New `postman/wa-agent-gateway.postman_collection.json` + `postman_environment.json`: Health, Availability, Book, Enquiry, and a 16-request "Bad inputs" folder matching the validation table (asserts 422 and the field-only error shape). `agentKey = REPLACE_ME`.
- New `docs/wa-agent-gateway.md` (this file).
- Existing files changed: `src/server.js` (+1 line: mount), `.env.example` (`WA_AGENT_KEYS=REPLACE_ME`, added in 4b).
- Tests: existing suite 84/84 (5 scripts), new 14/14. Live check on a dev boot: no key 401, wrong key 401, both keys 200, unknown path 404, website `/api/contact/availability` unaffected.

### 2026-11-04 — Step 4b: isolated test environment

- New `src/config/devDbGuard.js` (allow-list: localhost or db `cocoma_dev`; preloaded only by `dev:local`), `scripts/seed-dev.js` (admin login, Mon–Sat 10:00–19:45 IST schedule, 3 synthetic meetings incl. one occupying next Monday 11:00 IST, 2 enquiries; idempotent; refuses non-dev URIs).
- Existing files changed: `app/api/package.json` (`dev:local`, `seed:dev`), root `package.json` (`predev:local`, `dev:local`), `.env.example` (dev notes, `WA_AGENT_KEYS`).
- Environment: Atlas database `cocoma_dev` (separate user, IP allow-list), Mailpit via Homebrew, official `mongod` 8.0.34 tarball under `~/.cocoma-dev/mongo` for the test suite only (Homebrew's formula would have pulled in Node 26 and an OpenSSL upgrade).
- Gate: boot against `cocoma_dev` ✓; seed twice without duplicates ✓; guard rejects the production-shaped `.env` ✓; `meetingFlow.test.js` baseline established: 16/16.
- Found and stopped: a root `npm run dev` that had been running against the production `.env` all day. Use `npm run dev:local` from now on.

### 2026-11-04 — Step 0: discovery

- New `docs/wa-agent-discovery.md`. No code changes. Baseline at the time: 4/5 test scripts runnable (68/68 assertions), `meetingFlow` blocked by no local MongoDB (resolved in 4b). Decisions taken with Kirk: extract the booking/enquiry sequence into a shared service that both the website controller and the gateway call (step 4/5, regression-guarded by `meetingFlow`); bookings mirror to the CRM as channel `meeting` with `sourcePage: whatsapp`; `email` required on `/enquiry`; branch `feature/kd/whatsapp-bot`.
