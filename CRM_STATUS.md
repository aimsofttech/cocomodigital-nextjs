# Cocoma CRM — Implementation Status

**Audit date:** 2026-08-04 · **Branch:** `main` @ `7755253`
**Scope audited:** `app/api/src/crm/**` (8,821 LOC) + `app/crm/src/**` (5,096 LOC) + integration hooks in `app/api/src/controllers/api/`
**Baseline spec:** [CRM_BUILD_GUIDE.md](CRM_BUILD_GUIDE.md) (§ references below point at it)

---

## 1. Architecture as built

| Layer | Guide said | What was actually built | Verdict |
|---|---|---|---|
| API process | Separate `crm-api` service on :6000 | Same Express app, router mounted at `/crm/api` (+ `CRM_PUBLIC_PATH` alias) — [server.js:270-276](app/api/src/server.js#L270-L276) | Simpler, works |
| DB | Separate `cocoma_crm` database | Same Mongo connection, `crm_*` collection prefix | Deviation — acceptable |
| Queues | Redis + BullMQ + separate worker process | Mongo-backed scheduler [services/jobs.js](app/api/src/crm/services/jobs.js), in-process [services/workers.js](app/api/src/crm/services/workers.js) | Deviation — no Redis dependency, but **not safe for multi-instance API** |
| Website → CRM sync | Polling sync worker every 2 min | Push hooks: `leadIngest.ingestSafe()` called inline from the public controllers | **Better** — leads appear instantly |
| Realtime | socket.io + Redis adapter | socket.io at `/crm/socket.io` [crm/realtime.js](app/api/src/crm/realtime.js), no adapter | Single-instance only |
| Frontend | React + react-query | React 18 + Vite + Redux (auth only) + manual `useState`/`useCallback` fetching | Deviation — no query cache |

---

## 2. IMPLEMENTED

### 2.1 Data model — 18 collections, all defined

[models/core.js](app/api/src/crm/models/core.js) · [crm.js](app/api/src/crm/models/crm.js) · [engagement.js](app/api/src/crm/models/engagement.js) · [system.js](app/api/src/crm/models/system.js)

| Model | Collection | Notes |
|---|---|---|
| `CrmRole` | `crm_roles` | permissions[], `ownScope` flag |
| `CrmUser` | `crm_users` | bcrypt, notification prefs |
| `CrmSetting` | `crm_settings` | single `general` key/value doc |
| `CrmAuditLog` | `crm_audit_logs` | who/what/IP on every mutation |
| `CrmJob` | `crm_jobs` | scheduler: dedupeKey, repeatEveryMs, attempts |
| `CrmLead` | `crm_leads` | source dedup index, score/rating, DNC, follow-up dates |
| `CrmCompany` | `crm_companies` | |
| `CrmContact` | `crm_contacts` | consent flags + WhatsApp opt-in evidence (`whatsappOptInAt`, `…Source`) |
| `CrmPipeline` | `crm_pipelines` | stages[] with probability |
| `CrmDeal` | `crm_deals` | stageHistory[], won/lost |
| `CrmCall` | `crm_calls` | full Twilio lifecycle, AMD, retry chain, recordings, campaign link |
| `CrmCallScript` | `crm_call_scripts` | say/play/gather/record/dial/hangup steps + branches |
| `CrmCallCampaign` | `crm_call_campaigns` | frozen targets, dial window, concurrency, stats |
| `CrmMessageTemplate` | `crm_message_templates` | WA Cloud + Twilio Content SID support |
| `CrmMessage` | `crm_messages` | unified WA/SMS/Email log, statusHistory, open tracking |
| `CrmTask` | `crm_tasks` | |
| `CrmFollowUp` | `crm_follow_ups` | snooze/escalate |
| `CrmActivity` | `crm_activities` | append-only timeline with `also[]` cross-links |
| `CrmNotification` | `crm_notifications` | 90-day TTL index |
| `CrmDocument` | `crm_documents` | |
| `CrmAutomationRule` / `CrmAutomationRun` | `crm_automation_rules` / `_runs` | trigger→conditions→actions + run audit |

### 2.2 API — 21 route modules, ~150 endpoints

**Auth** [routes/auth.js](app/api/src/crm/routes/auth.js)
`GET /auth/setup-status` · `POST /auth/setup` (first-run admin + seeds 4 system roles) · `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` · `POST /auth/change-password`

**Users & Roles** [users.js](app/api/src/crm/routes/users.js) · [roles.js](app/api/src/crm/routes/roles.js)
Full CRUD both · `GET /users/permissions` (catalog of 37 permissions) · `PUT /users/me/notification-prefs` · soft-deactivate on DELETE

**Leads** [leads.js](app/api/src/crm/routes/leads.js) — the most complete module
list/filter/paginate · `GET /leads/export` (CSV) · `POST /leads/import` (CSV/XLSX) · CRUD · `GET /:id/timeline` · `POST /:id/notes` · `PATCH /:id/status` · `PATCH /:id/assign` · `POST /:id/convert` (→ company + contact + deal in one wizard call) · soft delete

**Contacts / Companies** [contacts.js](app/api/src/crm/routes/contacts.js) · [companies.js](app/api/src/crm/routes/companies.js)
CRUD both · contact timeline (merged with origin-lead history) · notes · `PATCH /contacts/:id/consent`

**Deals** [deals.js](app/api/src/crm/routes/deals.js)
`GET/POST/PUT /deals/pipelines` · deals CRUD · `GET /deals/board` (kanban payload w/ per-column totals) · `PATCH /:id/stage` (+ stageHistory, won/lost events) · timeline

**Calls** [calls.js](app/api/src/crm/routes/calls.js) — 789 LOC, the deepest module
list/create/CRUD · `POST /calls/log` (manual outcome) · `GET /calls/config` · `GET /calls/history` · `GET /calls/stats` · `POST /calls/start` (click-to-call) · `POST /calls/bulk` (campaign) · `POST /:id/dial` · `POST /:id/hangup` · `POST /:id/retry` · `GET /:id/recording` (proxied, permissioned) · `PATCH /:id/reschedule` · `PATCH /:id/cancel` · scripts CRUD · campaigns list/detail/`PATCH /campaigns/:id/:action` (start/pause/resume/cancel)

**Messages & Templates** [messages.js](app/api/src/crm/routes/messages.js) · [templates.js](app/api/src/crm/routes/templates.js)
`POST /messages/send` · `POST /messages/bulk` · list · `GET /messages/inbox` (threaded) · `GET /messages/thread` (paged, `before` cursor) · `POST /messages/read` · `PATCH /:id/mark-sent` (wa.me link mode) · templates CRUD + `POST /:id/preview`

**Tasks / Follow-ups / Calendar / Notifications / Documents**
Tasks CRUD + `PATCH /:id/status` · Follow-ups CRUD + `done`/`snooze`/`cancel` · Calendar `day|week|month|agenda` views [calendar.js](app/api/src/crm/routes/calendar.js) + `GET /calendar/sync/status` + `POST /calendar/sync/google` · Notifications list/read/read-all · Documents list/upload(S3)/delete

**Automations** [automations.js](app/api/src/crm/routes/automations.js)
CRUD · `GET /automations/meta` (13 events, 12 actions, 10 operators, condition field catalog) · `PATCH /:id/toggle` · `POST /:id/test` (dry run) · `GET /:id/runs`

**Dashboard / Reports / Settings**
`GET /dashboard` · 6 reports (`lead-sources`, `funnel`, `agent-activity`, `deliverability`, `forecast`, `idle-leads`) each with `?format=csv` · `GET/PUT /settings` (masked provider status) · `GET /settings/jobs` · `GET /settings/audit-logs`

**Public / provider endpoints** [webhooks.js](app/api/src/crm/routes/webhooks.js) · [voice.js](app/api/src/crm/routes/voice.js)
`GET/POST /webhooks/whatsapp` (Meta verify + HMAC) · `/webhooks/twilio/sms-inbound` · `/twilio/whatsapp-inbound` · `/twilio/sms-status` · `/twilio/call-status` · `/twilio/dial-status/:callId` · `/twilio/recording-status` · TwiML: `/voice/outbound/:callId`, `/voice/auto/:callId`, `/voice/auto/:callId/gather/:step`, `/voice/inbound`, `/voice/inbound/:callId/dial-result`, `/voice/fallback` · `GET /crm/api/health` · `GET /t/open/:msgId` (open pixel)

### 2.3 Services

| Service | What works |
|---|---|
| [messaging.js](app/api/src/crm/services/messaging.js) (896 LOC) | Email (SMTP + open pixel), WhatsApp via **Cloud API**, **Twilio WhatsApp** (incl. Content templates, 24h-window detection with Twilio-authoritative check, sandbox quickstart mapping), **wa.me free-link fallback**, SMS via Twilio and MSG91; template rendering with `{{placeholders}}`; consent + quiet-hours enforcement at a single choke point; inbound recording + dedupe; **`reconcileInboundWhatsapp()`** polling safety net for missed webhooks |
| [twilioVoice.js](app/api/src/crm/services/twilioVoice.js) (723 LOC) | Credential verification, public-URL reachability probe, status mapping, recording fetch |
| [callEngine.js](app/api/src/crm/services/callEngine.js) (519 LOC) | Bridge + auto modes, dial window, campaign runner with concurrency, retry chain, finalize/outcome |
| [automation.js](app/api/src/crm/services/automation.js) (414 LOC) | Event bus, condition evaluator, **all 12 actions implemented** incl. `wait` (persisted resume), per-entity daily cap, recursion depth guard, dedupe, run audit |
| [jobs.js](app/api/src/crm/services/jobs.js) | Mongo scheduler: define/schedule/every, dedupeKey, locking, retries |
| [workers.js](app/api/src/crm/services/workers.js) | 15 registered handlers (below) |
| [leadIngest.js](app/api/src/crm/services/leadIngest.js) | 3-tier dedup (external id → open lead → existing contact), scoring, rating, auto call for meeting bookings |
| [timeline.js](app/api/src/crm/services/timeline.js) · [notify.js](app/api/src/crm/services/notify.js) · [settings.js](app/api/src/crm/services/settings.js) · [permissions.js](app/api/src/crm/services/permissions.js) · [calendar.js](app/api/src/crm/services/calendar.js) · [calendarSync.js](app/api/src/crm/services/calendarSync.js) | timeline writes, in-app + email notify, cached settings + quiet hours, 37-permission catalog + 4 default roles, calendar aggregation, Google Calendar push |

**Background jobs registered:** `message:send`, `messages:reconcile` (30s), `automation:event`, `automation:actions`, `call:reminder`, `call:auto-dial`, `campaign:run`, `voice:probe` (5m), `calls:reconcile` (10m), `followup:reminder`, `task:reminder`, `followups:escalate` (30m), `leads:idle-scan` (1h), `calls:missed-scan` (1h), `digest:daily` (hourly, fires ~08:30 IST)

### 2.4 Website → CRM integration (live)

| Source | Controller | Channel |
|---|---|---|
| Contact-us form | [contactController.js:27](app/api/src/controllers/api/contactController.js#L27) | `contact_form` |
| Meeting booking | [contactController.js:127](app/api/src/controllers/api/contactController.js#L127) | `meeting` (auto-creates scheduled call + reminder) |
| Free consultation | [contactController.js:148](app/api/src/controllers/api/contactController.js#L148) | `consultation` |
| Marketing form | [marketingController.js:175](app/api/src/controllers/api/marketingController.js#L175) | `marketing_form` |
| Job applicants | [jobController.js:52](app/api/src/controllers/api/jobController.js#L52) | rejected by design (recruitment ≠ sales) |

### 2.5 Frontend — 16 pages

[App.tsx](app/crm/src/App.tsx) routes; sidebar is permission-filtered in [Layout.tsx](app/crm/src/components/layout/Layout.tsx).

| Page | State |
|---|---|
| [Login](app/crm/src/pages/auth/Login.tsx) | Login + first-run setup screen |
| [Dashboard](app/crm/src/pages/Dashboard.tsx) | 6 stat tiles, status bar chart, today's calls, recent leads |
| [LeadsList](app/crm/src/pages/leads/LeadsList.tsx) | filters, pagination, create, CSV import, export |
| [LeadDetail](app/crm/src/pages/leads/LeadDetail.tsx) (519 LOC) | timeline, notes, status/assign, **composer for WhatsApp/SMS/Email**, convert wizard, documents card, call actions |
| [ContactsList](app/crm/src/pages/contacts/ContactsList.tsx) / [ContactDetail](app/crm/src/pages/contacts/ContactDetail.tsx) | list + detail w/ consent toggles, timeline, new-deal modal, documents |
| [CompaniesList](app/crm/src/pages/companies/CompaniesList.tsx) | list + inline create/edit |
| [DealsBoard](app/crm/src/pages/deals/DealsBoard.tsx) | kanban columns, stage move via dropdown, lost-reason modal |
| [CallsPage](app/crm/src/pages/calls/CallsPage.tsx) (650 LOC) | schedule, history, stats, live call widget, log/reschedule/cancel/retry, recordings, **campaigns + script builder** |
| [InboxPage](app/crm/src/pages/inbox/InboxPage.tsx) (382 LOC) | threaded inbox, **live via socket**, typing indicator, read receipts, infinite scroll, delivery ticks |
| [TasksPage](app/crm/src/pages/tasks/TasksPage.tsx) · [FollowUpsPage](app/crm/src/pages/followups/FollowUpsPage.tsx) | list/create/status, snooze/done |
| [CalendarPage](app/crm/src/pages/calendar/CalendarPage.tsx) | day/week/month/agenda, Google sync trigger |
| [TemplatesPage](app/crm/src/pages/templates/TemplatesPage.tsx) | CRUD + live preview |
| [AutomationsPage](app/crm/src/pages/automations/AutomationsPage.tsx) (279 LOC) | full rule builder: trigger, conditions, all action configs, toggle, run history |
| [ReportsPage](app/crm/src/pages/reports/ReportsPage.tsx) | 6 reports, chart + table, CSV export, date range |
| [SettingsPage](app/crm/src/pages/settings/SettingsPage.tsx) | general/users/roles/system tabs, provider status, scheduler + audit viewer |

**Shared:** [components/ui](app/crm/src/components/ui/index.tsx) (Spinner, Badge, Modal, Pagination, PageHeader, Empty, formatters) · [components/calls](app/crm/src/components/calls/index.tsx) (488 LOC — dialer, live-call widget, post-call modal) · [services/api.ts](app/crm/src/services/api.ts) (axios + Bearer + 401 → `auth:logout` event) · [services/socket.ts](app/crm/src/services/socket.ts) + [hooks/useRealtime.ts](app/crm/src/hooks/useRealtime.ts) · notification bell (30s poll)

---

## 3. NOT IMPLEMENTED — prioritised backlog

### P0 — blocks correct operation

| # | Gap | Evidence | Impact |
|---|---|---|---|
| 1 | **No default pipeline is ever created.** `DealsBoard` tells the user to run `npm run seed:crm`, which does not exist ([package.json](app/api/package.json) has only `seed` → `src/database/seed.js`, which contains zero CRM references). | [DealsBoard.tsx:54](app/crm/src/pages/deals/DealsBoard.tsx#L54) | Deals module is dead on a fresh install until someone `POST`s a pipeline by hand |
| 2 | **No pipeline-management UI.** `GET/POST/PUT /deals/pipelines` exist; nothing in the frontend calls them. | grep of `app/crm/src` | Stages can never be edited by a non-developer |
| 3 | **No token refresh.** Single 7-day JWT, no `/auth/refresh`, no httpOnly refresh cookie, no rotation/reuse detection. | [auth.js](app/api/src/crm/routes/auth.js), [crmAuth.js:18](app/api/src/crm/middleware/crmAuth.js#L18) | Guide §15 checklist item unmet; a leaked token is valid for a week |
| 4 | **No forgot/reset-password flow.** Only `change-password` while logged in. | [auth.js:92](app/api/src/crm/routes/auth.js#L92) | Locked-out agents need an admin to reset via user edit |
| 5 | **CRM routes are not rate-limited.** The global limiter is `app.use('/api/', limiter)`; the CRM mounts at `/crm/api`. Only `/webhooks` and `/voice` have their own limiters. | [server.js:123](app/api/src/server.js#L123) | `/crm/api/auth/login` is unthrottled — brute-forceable |

### P1 — missing product surface

| # | Gap | Spec ref |
|---|---|---|
| 6 | **Deal detail page** — API has `GET /deals/:id` + `/timeline`; no route or page exists. Deals can only be viewed as kanban cards. | §8.3, §12.1 |
| 7 | **Company detail page** — `GET /companies/:id` unused; no contacts-at-company view. | §8.2 |
| 8 | **Kanban drag-and-drop** — stage moves use a `<select>`, not drag. No optimistic update. | §12.3 |
| 9 | **Lead kanban view** — guide specifies "list ⇄ kanban"; only list exists. | §12.1 |
| 10 | **Global search (⌘K)** — no `/search` endpoint, no topbar search. | §12.1 |
| 11 | **Quick-create (+) in topbar** — absent. | §12.1 |
| 12 | **Bulk lead actions** — no multi-select → assign/tag/delete/message in the list. | §8.1 |
| 13 | **Documents module page** — upload works inside lead/contact detail only; no standalone browser, no download/preview route. | §8.12 |
| 14 | **7th report missing** — 6 of 7 built; no *response/SLA time* or equivalent report. | §8.13 |
| 15 | **Automation run detail** — `GET /automations/:id/runs` returns the list; no `/runs/:runId` step-by-step view. | §11 |
| 16 | **Deal/contact-triggered automations partially unreachable** — condition field catalog only exposes `lead.*` and `event.*`; no `deal.*` or `contact.*` fields. | [automations.js:24-27](app/api/src/crm/routes/automations.js#L24-L27) |
| 17 | **Notification preferences UI** — `PUT /users/me/notification-prefs` exists; no profile page to set it. | §8.10 |
| 18 | **Profile / change-password UI** — endpoint exists, no screen. | §7.1 |

### P2 — infrastructure & compliance

| # | Gap | Spec ref |
|---|---|---|
| 19 | **Time-based automation triggers** — no `schedule.cron` trigger event; the `automations:cron` job from §13 is not registered. | §9.1, §13 |
| 20 | **Housekeeping job** — `AutomationRun > 180d` archive and S3 lifecycle audit never run. Notification TTL index covers only notifications. | §13 |
| 21 | **Email inbound / bounce webhook** — `/webhooks/email` (Resend/SES) absent. Email replies never reach the inbox; bounces are never recorded. | §11 |
| 22 | **Email click tracking** — `/t/click/:msgId` absent (only the open pixel is built). | §11 |
| 23 | **Web push (VAPID)** — zero references in the codebase. Bell is a 30-second poll even though socket.io is already connected. | §8.10, §14 |
| 24 | **S3 documents are not private/presigned** — reuses the existing public-read uploader; guide called for a private bucket + presigned URLs. | §15 |
| 25 | **`express-validator` not used** — all write routes hand-validate. Inconsistent error shapes, easy to miss a field. | §15 |
| 26 | **Outlook calendar sync** — `POST /calendar/sync/outlook` is routed but `calendarSync.js` implements Google only; MS_* env vars are read for status but never used to sync. | [calendarSync.js:63-77](app/api/src/crm/services/calendarSync.js#L63-L77) |
| 27 | **Calendar sync is push-only** — CRM → Google. Nothing reads external events back into the CRM. | §8.4 |
| 28 | **Multi-instance unsafe** — in-process scheduler with no cross-instance locking beyond `lockedAt`, and socket.io has no Redis adapter. Running 2 PM2 workers will double-fire jobs and split socket rooms. | §16 |
| 29 | **`GET /settings/sync-status` + `POST /settings/sync-run/:sourceKey`** — not applicable as built (push ingestion), but there is also **no backfill tool** for historic website enquiries submitted before the CRM existed. | §10.2 |
| 30 | **Zero automated tests.** No test file anywhere in `app/api` or `app/crm`, and no test runner in either `package.json`. Note that the `test:voice` / `test:messaging` / `check:twilio` / `check:whatsapp` / `dryrun:whatsapp` scripts in [app/api/package.json](app/api/package.json) are **manual diagnostic CLIs that hit live providers**, not a test suite — nothing runs in CI and nothing asserts. | §17 phase 6 |

### P3 — polish

| # | Gap |
|---|---|
| 31 | No react-query — every page refetches on mount, no cache, no cross-page invalidation on socket events. Inbox is live; nothing else is. |
| 32 | Realtime is used only by Inbox and the live-call widget. `emitCall` fires but Dashboard/Calls list don't subscribe; the bell still polls. |
| 33 | No mobile/responsive sidebar (`ml-56` fixed layout). |
| 34 | No dark mode, no empty-state illustrations, no skeleton loaders (spinner only). |
| 35 | No `.env.example` coverage audit — [app/crm/.env.example](app/crm/.env.example) exists; the API's CRM-specific vars (`CRM_PUBLIC_PATH`, `API_PUBLIC_URL`, `TWILIO_WHATSAPP_CONTENT_SID`, `VOICE_PROBE_MS`, `WHATSAPP_RECONCILE_MS`, `MS_*`) are documented only in prose guides. |
| 36 | Audit log has no UI filter (userId/entity/date) — `GET /settings/audit-logs` returns the last N only. |
| 37 | Lead `doNotCall` / contact `doNotCall` fields exist and are enforced server-side, but there is no UI toggle to set them. |

---

## 4. Suggested order of work

1. **Fix the fresh-install path (P0 #1, #2)** — add a `seed:crm` script (default pipeline + starter automation pack) *and* a pipeline editor under Settings. Without this the Deals module is unusable out of the box.
2. **Close the auth gaps (P0 #3, #4, #5)** — refresh tokens, password reset, rate-limit the CRM mount. All three are §15 checklist items and all three are cheap.
3. **Fill the navigation holes (P1 #6, #7, #10, #11)** — deal detail, company detail, global search, quick-create. These are the four things a user will look for first and not find.
4. **Compliance & delivery (P2 #21, #22, #24)** — email inbound/bounce handling, click tracking, private documents. Needed before real customer email volume.
5. **Ops hardening (P2 #19, #20, #28, #30)** — cron triggers, housekeeping, multi-instance safety, a test suite.

---

## 5. Notable strengths worth preserving

- **Twilio/WhatsApp integration is unusually robust** — reachability probing, credential verification, webhook reconciliation, orphaned-call cleanup, 24h-window detection that asks Twilio rather than guessing, and graceful degradation to `tel:`/`wa.me` links when nothing is configured.
- **Consent is enforced at one choke point** in `messaging.deliver()`, not scattered across callers — including the separate `doNotCall` (voice) vs `dnd` (all channels) distinction and Meta-grade opt-in evidence.
- **The automation engine is complete** — all 12 actions, persisted `wait`, daily caps, recursion guards, and a full run audit trail.
- **Code comments explain *why*, not *what*** — the reasoning behind `childReportedAt`, `autoDial`, `mountPaths()`, and the reconcile jobs is documented in place. Keep this convention.
