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
| POST | `/api/wa-agent/enquiry` | Create an enquiry (= website contact form) | 201 `{ ok: true, ref }` | 401, 422, 429 | *step 4* |
| POST | `/api/wa-agent/book` | Create a pending booking (= website booking) | 201 `{ ok: true, booking_ref, status: "pending", when }` | 400 `slot_not_offered`, 401, 409 `slot_taken`, 422 `invalid_input`, 429 `rate_limited` | *step 5* |

Reused as-is, public, no key: `GET /api/contact/availability?date=YYYY-MM-DD&tz=<IANA>` (day's slots, each `booked` true/false) and `?month=YYYY-MM&tz=` (open dates).

Every error has the shape `{ ok: false, reason: "<code>", message: "<one plain sentence the agent can relay>" }`. Unknown paths under the prefix return 404 in the same shape. A 401 is always the same bare body whether the key is missing or wrong.

Header: `X-Agent-Key: <key>`. Optional `X-Conversation-Id` is echoed into the log line only (*step 2*).

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

## Changelog (newest first)

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
