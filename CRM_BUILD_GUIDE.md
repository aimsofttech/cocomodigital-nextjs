# Cocoma CRM — Complete Build Guide

> A standalone CRM application for Cocoma Digital that integrates with the existing
> `cocoma-admin-api` platform **via APIs only** — zero changes to the current codebase.

**Version:** 1.0 · **Date:** 2026-07-20 · **Status:** Design / Build specification

---

## Table of Contents

1. [Analysis of the Existing Application](#1-analysis-of-the-existing-application)
2. [CRM Goals & Scope](#2-crm-goals--scope)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Recommended Technology Stack](#4-recommended-technology-stack)
5. [Project Structure](#5-project-structure)
6. [Database Design (Full Schema)](#6-database-design-full-schema)
7. [Authentication & Role-Based Access Control](#7-authentication--role-based-access-control)
8. [Module Specifications](#8-module-specifications)
   - 8.1 [Lead Management](#81-lead-management)
   - 8.2 [Customer (Contact & Company) Management](#82-customer-contact--company-management)
   - 8.3 [Deal / Pipeline Management](#83-deal--pipeline-management)
   - 8.4 [Call Scheduling & Call Logging](#84-call-scheduling--call-logging)
   - 8.5 [WhatsApp Automation](#85-whatsapp-automation)
   - 8.6 [SMS Automation](#86-sms-automation)
   - 8.7 [Email Automation](#87-email-automation)
   - 8.8 [Follow-up Reminders](#88-follow-up-reminders)
   - 8.9 [Task Management](#89-task-management)
   - 8.10 [Notifications](#810-notifications)
   - 8.11 [Activity Timeline](#811-activity-timeline)
   - 8.12 [File / Document Management](#812-file--document-management)
   - 8.13 [Dashboard & Reporting](#813-dashboard--reporting)
9. [Automation Engine (Workflows)](#9-automation-engine-workflows)
10. [Integration with the Existing Application](#10-integration-with-the-existing-application)
11. [Complete API Reference](#11-complete-api-reference)
12. [UI / Frontend Workflow](#12-ui--frontend-workflow)
13. [Background Jobs & Schedulers](#13-background-jobs--schedulers)
14. [Environment Variables](#14-environment-variables)
15. [Security Checklist](#15-security-checklist)
16. [Deployment Architecture](#16-deployment-architecture)
17. [Phased Delivery Roadmap](#17-phased-delivery-roadmap)

---

## 1. Analysis of the Existing Application

The current platform is an npm-workspaces monorepo with three apps:

| App | Package | Stack | Port |
|---|---|---|---|
| `app/api` | `@cocoma/api` | Node.js + Express 4, Mongoose 8 (MongoDB), JWT auth, Nodemailer, AWS S3, Google Calendar/Meet | 5000 |
| `app/admin` | `@cocoma/admin` | React 18 + TypeScript + Vite, Redux Toolkit, Tailwind, axios | 5173 |
| `app/web` | `comoma-digital` | Next.js 16 (App Router) + React 19, marketing site | 3000 |

### 1.1 What already exists (relevant to CRM)

The platform is primarily a **CMS** (~75 Mongoose models for banners, houses, portfolios,
blogs, jobs, galleries, FAQs). The **lead-relevant data** lives in five collections:

| Model | Collection | Captured from | Key fields |
|---|---|---|---|
| `ContactUs` | `contact_us` | `POST /api/contact` | name, email, phone, subject, message, isRead |
| `MarketingForm` | `marketing_form` | `POST /api/marketing/form` | name, email, phone, company, message, service_type, marketing_house_item_id |
| `FreeConsultationItem` | `free_consultation_item` | `POST /api/contact/free-consultation` | name, email, phone, company, message, budget, consultationCategoryId |
| `Meeting` | `meetings` | `POST /api/contact/free-consultation` (with `meeting_start_utc`) | userName, email, phone, companyName, meeting slot, status (`pending/confirmed/rejected/completed`), Google Meet link, assignedTo |
| `JobApplicant` | `job_applicants` | `POST /api/job/applicants` | name, email, resume (S3 URL), applicationStatus |

### 1.2 Existing auth & API conventions

- **Auth:** JWT bearer (`Authorization: Bearer <token>`), payload `{ id }`, 7-day expiry.
  Login: `POST /admin/api/auth/login`. Roles: `admin`, `editor` (coarse — no permission matrix).
- **Response envelope:** `{ status: 'success'|'error', message?, data? }`.
- **Public routes** are un-authenticated but rate-limited (500 req/15 min/IP) and CORS-guarded
  (`CORS_ORIGINS` allow-list).
- **Files:** AWS S3, public URLs (`AWS_URL` prefix).
- **Email:** Nodemailer SMTP (owner notifications for bookings).
- **No** SMS, WhatsApp sending, payments, cron jobs, queues, or outbound webhooks exist today.
  The `WhatsappTemplate` model only stores template text — nothing sends it.

### 1.3 Integration implications (why the CRM must poll)

Because the existing app emits **no webhooks or events**, and the constraint is
**do not modify the existing codebase**, the CRM will integrate by:

1. **Polling** the existing admin GET endpoints with a dedicated service-account JWT
   (all lead models carry `createdAt` / `updatedAt` timestamps → clean incremental sync).
2. Optionally, **read-only MongoDB access** (a second Mongo user restricted to the lead
   collections) as a faster alternative to HTTP polling — still zero code change.
3. Exposing its own inbound webhook endpoint so that, *if in the future* the main app
   wants push-based sync, it only needs a one-line HTTP call (out of scope for now).

---

## 2. CRM Goals & Scope

Build a **completely separate application** ("Cocoma CRM") that:

- Automatically ingests every lead the marketing site captures (contact forms, marketing
  forms, consultations, meeting bookings, job applicants) — no manual re-entry.
- Manages the full lifecycle: **Lead → Qualified → Customer → Repeat business**.
- Automates outreach: **calls, WhatsApp, SMS, email** — both scheduled and trigger-based.
- Gives the team **tasks, follow-up reminders, notifications, dashboards, reports,
  a unified activity timeline, and document storage** per lead/customer.
- Enforces **role-based access control** (Admin, Manager, Sales Agent, Viewer).
- Runs on its **own database and own servers** — the existing app keeps working untouched.

Out of scope (phase 1): billing/invoicing, inventory, telephony hardware (we use cloud
telephony), multi-tenancy.

---

## 3. High-Level Architecture

```
┌────────────────────────────  EXISTING (untouched)  ───────────────────────────┐
│                                                                               │
│  app/web (Next.js, :3000) ──► app/api (Express, :5000) ◄── app/admin (:5173)  │
│      public forms                    │                                        │
│                              MongoDB "cocoma" DB                              │
└───────────────────────────────────────┬───────────────────────────────────────┘
                                        │  ① Poll admin API with service JWT
                                        │     (or read-only Mongo connection)
                                        ▼
┌───────────────────────────────  NEW: COCOMA CRM  ─────────────────────────────┐
│                                                                               │
│   crm-web (React+Vite, :5174)                                                 │
│        │  REST + WebSocket                                                    │
│        ▼                                                                      │
│   crm-api (Node/Express or NestJS, :6000)                                     │
│        │            │                │                                        │
│        │            │                └──► Socket.io (real-time notifications) │
│        │            ▼                                                         │
│        │      BullMQ queues (Redis :6379)                                     │
│        │        ├─ sync-queue        (lead ingestion from existing app)       │
│        │        ├─ email-queue       (Nodemailer / Resend)                    │
│        │        ├─ whatsapp-queue    (WhatsApp Cloud API)                     │
│        │        ├─ sms-queue         (Twilio / MSG91)                         │
│        │        ├─ call-queue        (Twilio Voice / Exotel click-to-call)    │
│        │        ├─ reminder-queue    (follow-ups, delayed jobs)               │
│        │        └─ automation-queue  (workflow engine executor)               │
│        ▼                                                                      │
│   MongoDB "cocoma_crm" (separate DB / cluster)      AWS S3 (crm/ prefix)      │
│                                                                               │
│   External: WhatsApp Cloud API · Twilio/Exotel/MSG91 · SMTP/Resend ·          │
│             Google Calendar (own OAuth app) · FCM/Web-Push                    │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Key architectural decisions**

| Decision | Choice | Reason |
|---|---|---|
| Separation | New repo, new DB, new ports | Hard requirement: existing app untouched |
| Sync direction | CRM **pulls** from existing app | No webhooks exist there; polling on timestamps is safe and idempotent |
| Async work | Redis + BullMQ | Every automation (send, retry, schedule, delay) is a queued job — survives restarts, has retries/backoff, and gives a visible dead-letter queue |
| Real-time | Socket.io | In-app notification bell, live activity feed |
| Data model | MongoDB | Team already knows Mongoose; flexible activity/timeline documents |

---

## 4. Recommended Technology Stack

Chosen to **match the team's existing skills** (same stack family as the current app):

### Backend (`crm-api`)
- **Node.js 20 LTS + Express 4** (or NestJS 10 if you want stricter structure — everything
  in this document maps 1:1 to either). Plain Express keeps parity with the current API.
- **Mongoose 8** on **MongoDB 7** — new database `cocoma_crm`.
- **BullMQ 5 + Redis 7** — queues, delayed jobs, repeatable (cron) jobs.
- **jsonwebtoken + bcryptjs** — same auth pattern as existing app (access + refresh tokens).
- **Socket.io 4** — real-time notifications.
- **express-validator, helmet, express-rate-limit, cors** — same hardening as existing API.
- **winston + morgan** — logging (same convention).
- **multer + @aws-sdk/client-s3** — file uploads to the same S3 bucket under a `crm/` prefix
  (or a dedicated bucket).
- **node-cron** only for tiny local ticks; all real scheduling goes through BullMQ
  repeatable jobs (single source of truth, works across multiple instances).

### Communication providers
| Channel | Primary recommendation | Alternative (India-focused) |
|---|---|---|
| Email | **Nodemailer over SMTP** (reuse existing SMTP creds) | Resend (already used in `app/web`) or SES |
| WhatsApp | **Meta WhatsApp Cloud API** (official, template-based, webhook delivery receipts) | Twilio WhatsApp, Gupshup, AiSensy |
| SMS | **Twilio** | MSG91 / Fast2SMS (DLT-compliant for India) |
| Voice calls | **Twilio Programmable Voice** (click-to-call + recording) | Exotel / Knowlarity (India cloud telephony) |
| Push | Web Push (VAPID) + optional FCM | — |

### Frontend (`crm-web`)
- **React 18 + TypeScript + Vite** — identical toolchain to `app/admin` so the team can
  copy layout components, the axios service pattern, and Tailwind config.
- **Tailwind CSS + Headless UI + Heroicons**, **react-hook-form**, **react-hot-toast**,
  **recharts** (dashboards), **@tanstack/react-query** (server state — recommended upgrade
  over plain Redux for CRM's data-heavy screens), **Redux Toolkit** for auth slice only.
- **socket.io-client** for the notification bell / live feed.
- **react-big-calendar** or **FullCalendar** for the call-schedule calendar view.

### Infra
- Docker Compose (crm-api, crm-web, redis, mongo) for dev; PM2 or Docker in prod.
- Nginx reverse proxy; CRM served at e.g. `crm.cocomadigital.com`.

---

## 5. Project Structure

New repository `cocoma-crm` (npm workspaces, mirroring the existing repo's shape):

```
cocoma-crm/
├── package.json                  # workspaces: ["apps/api", "apps/web"]
├── docker-compose.yml            # mongo, redis, api, web
├── apps/
│   ├── api/                      # @cocoma-crm/api  (Express, :6000)
│   │   └── src/
│   │       ├── server.js         # bootstrap: express + socket.io + queues
│   │       ├── config/
│   │       │   ├── db.js         # mongoose connect (CRM_MONGO_URI)
│   │       │   ├── redis.js      # ioredis connection
│   │       │   └── queues.js     # BullMQ queue registry
│   │       ├── models/           # all schemas from §6
│   │       ├── middleware/
│   │       │   ├── auth.js       # protect, requirePermission('leads:update')
│   │       │   ├── validate.js
│   │       │   └── audit.js      # writes AuditLog on mutating requests
│   │       ├── routes/
│   │       │   ├── auth.js  leads.js  contacts.js  companies.js  deals.js
│   │       │   ├── calls.js  tasks.js  followups.js  notifications.js
│   │       │   ├── messages.js  templates.js  automations.js  documents.js
│   │       │   ├── dashboard.js  reports.js  users.js  roles.js  settings.js
│   │       │   └── webhooks/     # provider callbacks (twilio, whatsapp, email)
│   │       ├── controllers/      # one per route module
│   │       ├── services/
│   │       │   ├── syncService.js        # pulls leads from existing app (§10)
│   │       │   ├── automationEngine.js   # trigger→condition→action (§9)
│   │       │   ├── emailService.js  whatsappService.js  smsService.js
│   │       │   ├── callService.js        # Twilio click-to-call, recordings
│   │       │   ├── notificationService.js# in-app + socket + push fan-out
│   │       │   ├── timelineService.js    # single writer for Activity docs
│   │       │   └── reportService.js      # aggregation pipelines
│   │       ├── workers/          # BullMQ processors (one file per queue)
│   │       │   ├── sync.worker.js  email.worker.js  whatsapp.worker.js
│   │       │   ├── sms.worker.js  call.worker.js  reminder.worker.js
│   │       │   └── automation.worker.js
│   │       ├── sockets/          # socket.io auth + rooms (user:<id>)
│   │       └── utils/            # s3, logger, phone normalizer, template renderer
│   └── web/                      # @cocoma-crm/web (React+Vite+TS, :5174)
│       └── src/
│           ├── app/              # store, router, providers (query client, socket)
│           ├── services/         # axios instance (same 401→logout pattern)
│           ├── features/         # auth, leads, contacts, deals, calls, tasks,
│           │                     # inbox, automations, reports, settings
│           ├── components/       # ui/ (copy from app/admin), layout/, timeline/
│           └── pages/
└── docs/
```

---

## 6. Database Design (Full Schema)

Database: **`cocoma_crm`** (MongoDB). Conventions: `{ timestamps: true }` on every schema,
`snake_case` collection names (matches existing app style), soft-delete via `deletedAt`
where noted. All `ObjectId` refs are within the CRM DB — links to the *existing* app's
records are stored as `source.externalId` strings, never as cross-DB refs.

### 6.1 Users, Roles, Permissions

```js
// collection: crm_users
CrmUser {
  name: String, required
  email: String, required, unique, lowercase
  password: String, bcrypt, select:false
  phone: String
  avatarUrl: String
  roleId: ObjectId -> crm_roles, required
  isActive: Boolean, default true
  lastLoginAt: Date
  notificationPrefs: { inApp:Boolean, email:Boolean, push:Boolean }  // defaults true
  refreshTokenHash: String, select:false     // rotating refresh token
  deletedAt: Date
}

// collection: crm_roles
Role {
  name: String, unique            // 'Admin' | 'Manager' | 'Sales Agent' | 'Viewer' | custom
  isSystem: Boolean               // system roles cannot be deleted
  permissions: [String]           // flat permission keys, see §7.2
}
```

### 6.2 Leads

```js
// collection: leads
Lead {
  // identity
  name: String, required
  email: String, lowercase, index
  phone: String, index            // normalized E.164 ("+91...")
  company: String
  designation: String

  // classification
  source: {
    channel: String,              // 'contact_form'|'marketing_form'|'consultation'|
                                  // 'meeting'|'job_applicant'|'manual'|'import'|'referral'
    externalId: String,           // _id of the record in the EXISTING app's DB
    externalCollection: String,   // 'contact_us'|'marketing_form'|...
    sourcePage: String,           // landing page / campaign
    raw: Mixed                    // full original payload (audit / no data loss)
  },
  serviceInterest: String,        // maps from service_type / consultation category
  budget: String,
  message: String,

  // pipeline
  status: String, enum ['new','contacted','qualified','proposal','negotiation',
                        'won','lost','junk'], default 'new', index
  lostReason: String,
  score: Number, default 0,       // lead scoring (see business logic §8.1)
  rating: String, enum ['hot','warm','cold'], default 'warm'

  // ownership
  ownerId: ObjectId -> crm_users, index      // assigned agent
  assignedAt: Date,
  assignedBy: ObjectId -> crm_users

  // conversion
  convertedContactId: ObjectId -> contacts
  convertedDealId: ObjectId -> deals
  convertedAt: Date

  // bookkeeping
  tags: [String], index
  lastActivityAt: Date, index     // denormalized for "idle lead" automations
  nextFollowUpAt: Date, index     // denormalized from earliest open FollowUp
  deletedAt: Date
}
// Indexes: {email:1, phone:1} for dedup; {status:1, ownerId:1}; {source.externalId:1, source.externalCollection:1} unique sparse (sync idempotency)
```

### 6.3 Contacts & Companies (Customers)

```js
// collection: companies
Company {
  name: String, required, index
  website: String, industry: String, size: String
  gstin: String                   // optional, India
  address: { line1, line2, city, state, country, pincode }
  ownerId: ObjectId -> crm_users
  tags: [String]
  deletedAt: Date
}

// collection: contacts    (a "customer" = contact with lifecycle 'customer')
Contact {
  firstName: String, required
  lastName: String
  email: String, lowercase, index
  phone: String, index
  altPhone: String
  companyId: ObjectId -> companies, index
  designation: String
  lifecycle: String, enum ['lead','customer','past_customer'], default 'customer'
  originLeadId: ObjectId -> leads       // provenance
  ownerId: ObjectId -> crm_users, index
  whatsappOptIn: Boolean, default false // consent flags (compliance)
  smsOptIn: Boolean, default false
  emailOptIn: Boolean, default true
  dnd: Boolean, default false           // hard do-not-disturb override
  address: {...}, tags: [String], notes: String
  lastActivityAt: Date
  deletedAt: Date
}
```

### 6.4 Deals (Pipeline)

```js
// collection: pipelines
Pipeline {
  name: String,                         // 'Sales', 'Consulting'
  stages: [{ key:String, label:String, order:Number, probability:Number }]
  // default: new(10) → contacted(25) → proposal(50) → negotiation(75) → won(100) / lost(0)
  isDefault: Boolean
}

// collection: deals
Deal {
  title: String, required
  contactId: ObjectId -> contacts, index
  companyId: ObjectId -> companies
  leadId: ObjectId -> leads             // if converted from a lead
  pipelineId: ObjectId -> pipelines
  stageKey: String, index
  value: Number, currency: String, default 'INR'
  expectedCloseDate: Date
  wonAt: Date, lostAt: Date, lostReason: String
  ownerId: ObjectId -> crm_users, index
  stageHistory: [{ stageKey, enteredAt, byUserId }]   // for stage-duration reports
  tags: [String]
  deletedAt: Date
}
```

### 6.5 Calls

```js
// collection: calls
Call {
  // linkage (exactly one of leadId/contactId required)
  leadId: ObjectId -> leads, index
  contactId: ObjectId -> contacts, index
  dealId: ObjectId -> deals
  ownerId: ObjectId -> crm_users, required, index    // agent responsible

  direction: String, enum ['outbound','inbound']
  purpose: String, enum ['intro','follow_up','demo','support','other']

  // scheduling
  scheduledAt: Date, index
  durationPlannedMin: Number, default 15
  reminderMinutesBefore: Number, default 15
  googleEventId: String                 // optional Calendar sync (CRM's own OAuth app)

  // execution / logging
  status: String, enum ['scheduled','completed','no_answer','busy','cancelled',
                        'rescheduled','missed'], default 'scheduled', index
  startedAt: Date, endedAt: Date, durationSec: Number
  outcome: String, enum ['interested','not_interested','callback_requested',
                         'converted','wrong_number','voicemail']
  notes: String
  recordingUrl: String                  // S3 copy of provider recording

  // telephony provider linkage
  provider: String, enum ['manual','twilio','exotel'], default 'manual'
  providerCallSid: String, index        // idempotency for status webhooks
  fromNumber: String, toNumber: String

  rescheduledFromId: ObjectId -> calls  // chain of reschedules
}
```

### 6.6 Messages (unified WhatsApp / SMS / Email log)

```js
// collection: messages
Message {
  channel: String, enum ['whatsapp','sms','email'], required, index
  direction: String, enum ['outbound','inbound'], default 'outbound'
  leadId / contactId / dealId: ObjectId, index
  toAddress: String, required           // phone (E.164) or email
  fromAddress: String

  templateId: ObjectId -> message_templates
  subject: String                       // email only
  body: String                          // rendered content actually sent
  mediaUrls: [String]                   // WhatsApp media / email attachments (S3)

  status: String, enum ['queued','sent','delivered','read','failed','bounced',
                        'replied'], default 'queued', index
  statusHistory: [{ status, at, providerRaw: Mixed }]
  failReason: String

  provider: String                      // 'whatsapp_cloud'|'twilio'|'msg91'|'smtp'|'resend'
  providerMessageId: String, index      // dedup key for delivery webhooks

  sentBy: ObjectId -> crm_users         // null when sent by automation
  automationRunId: ObjectId -> automation_runs
  scheduledFor: Date                    // null = immediate
}

// collection: message_templates
MessageTemplate {
  name: String, required
  channel: String, enum ['whatsapp','sms','email']
  subject: String                       // email
  body: String, required                // with {{placeholders}}: {{name}}, {{company}},
                                        // {{agent_name}}, {{meeting_link}}, {{service}}...
  variables: [String]                   // declared placeholders (validated at send time)
  // WhatsApp Cloud API specifics:
  waTemplateName: String                // approved template name at Meta
  waLanguageCode: String, default 'en'
  waStatus: String, enum ['draft','pending','approved','rejected']
  category: String                      // 'welcome'|'follow_up'|'meeting'|'promo'...
  isActive: Boolean, default true
  createdBy: ObjectId -> crm_users
}
```

### 6.7 Tasks & Follow-ups

```js
// collection: tasks
Task {
  title: String, required
  description: String
  type: String, enum ['todo','call','email','whatsapp','meeting','document'], default 'todo'
  leadId / contactId / dealId: ObjectId, index      // optional linkage
  assigneeId: ObjectId -> crm_users, required, index
  createdBy: ObjectId -> crm_users
  dueAt: Date, index
  priority: String, enum ['low','medium','high','urgent'], default 'medium'
  status: String, enum ['open','in_progress','done','cancelled'], default 'open', index
  completedAt: Date, completedBy: ObjectId
  reminderAt: Date                      // when to fire the reminder job
  automationRunId: ObjectId             // if auto-created
}

// collection: follow_ups   (lightweight "ping me about this lead" objects)
FollowUp {
  leadId / contactId / dealId: ObjectId, index
  ownerId: ObjectId -> crm_users, required, index
  dueAt: Date, required, index
  note: String
  channelHint: String, enum ['call','whatsapp','sms','email','any']
  status: String, enum ['pending','done','snoozed','cancelled'], default 'pending'
  snoozedUntil: Date
  recurrence: String                    // optional RRULE-lite: 'FREQ=WEEKLY;COUNT=4'
  reminderJobId: String                 // BullMQ delayed-job id (for cancel on done)
}
```

### 6.8 Notifications, Activities, Documents

```js
// collection: notifications
Notification {
  userId: ObjectId -> crm_users, required, index
  type: String,        // 'lead.assigned'|'followup.due'|'call.reminder'|'message.failed'
                       // 'task.assigned'|'deal.stage_changed'|'lead.new'|'mention'...
  title: String, body: String
  entity: { kind:String, id:ObjectId }  // deep-link target ('lead', 'call', ...)
  isRead: Boolean, default false, index
  channels: [String]                    // where it was fanned out: ['in_app','email','push']
  createdAt (timestamps)
}
// TTL index on createdAt (e.g. expire after 90 days) keeps the collection lean.

// collection: activities   — THE timeline. Append-only, written ONLY by timelineService.
Activity {
  entity: { kind: String, id: ObjectId },   // primary anchor: 'lead'|'contact'|'deal'|'company'
  also: [{ kind, id }],                     // mirror on related entities
  type: String, index
  // 'lead.created'|'lead.status_changed'|'lead.assigned'|'lead.converted'
  // 'note.added'|'call.scheduled'|'call.logged'|'message.sent'|'message.received'
  // 'message.status'|'task.created'|'task.completed'|'followup.created'|'followup.done'
  // 'document.uploaded'|'deal.stage_changed'|'automation.executed'|'sync.imported'
  title: String,                            // human line: "Call logged — no answer (2m 10s)"
  meta: Mixed,                              // structured payload (old/new status, messageId…)
  actor: { kind: String,                    // 'user' | 'automation' | 'system' | 'sync'
           userId: ObjectId, label: String }
  createdAt (timestamps)
}
// Indexes: {entity.kind:1, entity.id:1, createdAt:-1}

// collection: documents
Document {
  name: String, required
  s3Key: String, required               // crm/<entity>/<id>/<uuid>-<filename>
  url: String, mimeType: String, sizeBytes: Number
  entity: { kind, id },                 // lead / contact / deal / company
  category: String, enum ['proposal','contract','id_proof','invoice','media','other']
  uploadedBy: ObjectId -> crm_users
  deletedAt: Date
}
```

### 6.9 Automation & System

```js
// collection: automation_rules      (see engine spec in §9)
AutomationRule {
  name: String, required
  isActive: Boolean, default true, index
  trigger: {
    event: String,      // 'lead.created'|'lead.status_changed'|'lead.idle'|
                        // 'call.completed'|'call.no_answer'|'deal.stage_changed'|
                        // 'message.replied'|'followup.due'|'schedule.cron'
    config: Mixed       // e.g. { from:'new', to:'contacted' } or { cron:'0 9 * * *' }
  },
  conditions: [{ field:String, op:String, value:Mixed }],   // AND list
        // op: eq|ne|in|nin|gt|lt|gte|lte|contains|exists
        // field: 'lead.source.channel', 'lead.score', 'lead.serviceInterest', 'hoursSince.lastActivityAt'...
  actions: [{
    type: String,       // 'send_email'|'send_whatsapp'|'send_sms'|'schedule_call'|
                        // 'create_task'|'create_followup'|'assign_owner'|'update_field'|
                        // 'add_tag'|'notify_user'|'wait'
    config: Mixed,      // { templateId, delayMinutes, assigneeStrategy:'round_robin', ... }
  }],
  quietHours: { start:'21:00', end:'09:00', timezone:'Asia/Kolkata' },  // messages queued past this window
  createdBy: ObjectId, lastRunAt: Date, runCount: Number
}

// collection: automation_runs       (execution audit)
AutomationRun {
  ruleId: ObjectId -> automation_rules, index
  triggerEvent: Mixed
  entity: { kind, id }
  status: String, enum ['running','completed','failed','skipped'],
  steps: [{ actionType, status, output: Mixed, error: String, at: Date }]
}

// collection: sync_state             (integration cursor, §10)
SyncState {
  sourceKey: String, unique,   // 'contact_us'|'marketing_form'|'free_consultation'|'meetings'|'job_applicants'
  lastSyncedAt: Date,          // high-water mark (source updatedAt)
  lastRunAt: Date, lastRunStatus: String, lastError: String,
  totalImported: Number
}

// collection: audit_logs             (who did what — compliance)
AuditLog {
  userId: ObjectId, action: String,    // 'lead.update', 'role.change', 'export'...
  entity: { kind, id }, before: Mixed, after: Mixed,
  ip: String, userAgent: String
}
```

### 6.10 Entity-Relationship overview

```
CrmUser ──< Lead (owner)          Lead ──? Contact (converted)  ──< Deal
Role ───< CrmUser                 Contact >── Company
Lead/Contact/Deal ──< Call        Lead/Contact/Deal ──< Message >── MessageTemplate
Lead/Contact/Deal ──< Task        Lead/Contact/Deal ──< FollowUp
Lead/Contact/Deal ──< Document    Lead/Contact/Deal ──< Activity (timeline)
AutomationRule ──< AutomationRun  CrmUser ──< Notification
SyncState (one row per source collection in the existing app)
```

---

## 7. Authentication & Role-Based Access Control

### 7.1 Auth flow

- **Login:** `POST /crm/api/auth/login` `{email, password}` → verify bcrypt →
  return **access token** (JWT, 15 min, payload `{ id, roleId }`) +
  **refresh token** (JWT, 7 d, rotating; hash stored on user, sent as httpOnly cookie).
- **Refresh:** `POST /crm/api/auth/refresh` — rotate refresh token, issue new access token.
- **Middleware:** `protect` (verify access token, load user + role, reject if `!isActive`),
  then `requirePermission('<key>')` per route.
- Frontend mirrors `app/admin`'s pattern: axios interceptor attaches Bearer token,
  a 401 triggers silent refresh, and a failed refresh dispatches logout.

### 7.2 Permission matrix

Permissions are flat strings checked by `requirePermission`. Default roles:

| Permission key | Admin | Manager | Sales Agent | Viewer |
|---|:-:|:-:|:-:|:-:|
| `leads:read` (all) / `leads:read_own` | ✅ / — | ✅ / — | — / ✅ | ✅ / — |
| `leads:create`, `leads:update` | ✅ | ✅ | ✅ (own) | — |
| `leads:delete`, `leads:import`, `leads:export` | ✅ | ✅ | — | — |
| `leads:assign` | ✅ | ✅ | — | — |
| `contacts:*`, `companies:*`, `deals:*` | ✅ | ✅ | own-scope | read |
| `calls:*`, `tasks:*`, `followups:*` | ✅ | ✅ | own-scope | read |
| `messages:send`, `messages:read` | ✅ | ✅ | ✅ | read |
| `templates:manage` | ✅ | ✅ | — | — |
| `automations:manage` | ✅ | ✅ | — | — |
| `reports:view` | ✅ | ✅ | own only | ✅ |
| `users:manage`, `roles:manage`, `settings:manage` | ✅ | — | — | — |
| `integrations:manage` (sync, providers) | ✅ | — | — | — |

**Own-scope rule:** for Sales Agents every list/detail query is silently filtered by
`ownerId = req.user._id` (implemented once as a query-scoping helper, not per controller).

---

## 8. Module Specifications

Each module below documents: purpose, DB entities, API, UI workflow, and business logic.

---

### 8.1 Lead Management

**Purpose:** single funnel for every enquiry the business receives — auto-ingested from
the existing app plus manual/imported leads — with assignment, scoring, status pipeline,
and conversion to Contact + Deal.

**Entities:** `Lead` (§6.2), `Activity`, `SyncState`.

**How leads enter the CRM**

1. **Auto-sync (primary):** the sync worker (§10) polls the existing app every 2 minutes
   and creates Leads from `contact_us`, `marketing_form`, `free_consultation_item`,
   `meetings`, and (optionally, toggleable) `job_applicants`.
2. **Manual:** "New Lead" form in the CRM UI.
3. **Bulk import:** CSV/XLSX upload → column mapping screen → validation report → import
   (skips/flags duplicates by email/phone).
4. **Inbound messages:** an unknown WhatsApp/SMS sender auto-creates a Lead with
   `source.channel = 'whatsapp_inbound'`.

**Deduplication logic (runs on every insert path):**
```
match = Lead or Contact where (email equals, case-insensitive) OR (normalized phone equals)
if match is Lead   → do NOT create; append Activity 'sync.imported' ("Duplicate enquiry
                     received from <channel>") on existing lead, bump lastActivityAt,
                     re-fire 'lead.re_enquired' automation event
if match is Contact→ create Activity on the contact + notify owner ("existing customer
                     submitted a new enquiry"), create Task instead of Lead
else               → create Lead, fire 'lead.created'
```

**Lead scoring (recomputed on relevant events; simple additive model):**
| Signal | Points |
|---|---|
| Source = meeting booking | +30 |
| Source = free consultation | +20 |
| Budget provided | +15 |
| Phone provided | +10 |
| Replied to any message | +20 |
| Email opened (if tracking pixel enabled) | +5 |
| No activity 14 days | −15 |
Rating derives from score: `hot ≥ 50`, `warm 20–49`, `cold < 20`.

**Assignment strategies (setting-driven, used by manual assign and automations):**
- `round_robin` — cycle through active Sales Agents.
- `load_balanced` — agent with fewest open leads.
- `rule_based` — e.g. `serviceInterest = 'development'` → dev-team agent (configured as
  automation rules with `assign_owner` action).

**Status flow & guardrails:**
```
new → contacted → qualified → proposal → negotiation → won
  └────────────────────────────────────────────────→ lost / junk (any time, reason required)
```
- Moving to `won` requires conversion (below) — enforced in controller.
- Every transition writes `lead.status_changed` Activity and fires the automation event.

**Conversion (`POST /crm/api/leads/:id/convert`):** transaction that
1. creates/attaches a `Company` (if company name present),
2. creates a `Contact` (lifecycle `customer`, `originLeadId` set),
3. optionally creates a `Deal` (title, value, pipeline stage from request body),
4. sets lead `status='won'`, links `convertedContactId/DealId`,
5. re-parents open Tasks/FollowUps/Documents to the contact,
6. Activity `lead.converted` on both lead and contact; fires automation event.

**API** (all under `/crm/api`, all `protect`ed; permissions per §7.2):

| Method & path | Description |
|---|---|
| `GET /leads` | List. Query: `status, ownerId, source, rating, tag, q (name/email/phone), from, to, sort, page, limit` |
| `POST /leads` | Create manual lead |
| `GET /leads/:id` | Detail (+embedded counts: openTasks, lastMessageAt…) |
| `PUT /leads/:id` | Update fields |
| `PATCH /leads/:id/status` | `{status, lostReason?}` |
| `PATCH /leads/:id/assign` | `{ownerId}` — fires `lead.assigned` |
| `POST /leads/:id/convert` | Convert (payload: company?, deal?) |
| `POST /leads/import` | multipart CSV/XLSX + mapping JSON |
| `GET /leads/export` | CSV export of current filter (`leads:export`) |
| `DELETE /leads/:id` | Soft delete |
| `GET /leads/:id/timeline` | Paginated Activities for the lead |
| `POST /leads/:id/notes` | Adds `note.added` Activity |

**UI workflow:**
- **Leads list:** table + saved filter chips (`My new leads`, `Hot`, `Idle 7d+`),
  bulk actions (assign, tag, export), Kanban toggle grouped by status with drag-drop
  (drop = `PATCH /status`).
- **Lead detail (the core screen):** 3-column layout —
  left: profile fields + score/rating + tags + owner;
  center: **Activity timeline** with composer tabs `Note | Email | WhatsApp | SMS | Log call`;
  right: upcoming (next follow-up, scheduled calls, open tasks) + documents + quick actions
  (Schedule call, Set follow-up, Convert).

---

### 8.2 Customer (Contact & Company) Management

**Purpose:** the post-conversion book of record — customers, their companies, full history.

**Entities:** `Contact`, `Company` (§6.3).

**Business logic:**
- A Contact is created only via lead conversion, manual add, or import — keeping the
  customer book clean (raw enquiries stay Leads).
- **Consent management:** `whatsappOptIn`, `smsOptIn`, `emailOptIn`, `dnd`. Every send
  path checks these — `dnd=true` blocks all channels; per-channel opt-outs block that
  channel. Inbound `STOP` (SMS) or WhatsApp opt-out webhook flips the flag automatically.
- 360° view: timeline merges the contact's own activities plus its origin lead's history
  (`also` mirroring in Activity makes this a single indexed query).

**API:** standard CRUD `GET/POST/PUT/DELETE /contacts`, `/companies`
(+ `GET /contacts/:id/timeline`, `GET /companies/:id/contacts`,
`PATCH /contacts/:id/consent`). Same filter conventions as leads.

**UI:** Customers list (lifecycle filter), Contact detail mirroring the Lead detail layout,
Company page with contact roster and aggregate deal value.

---

### 8.3 Deal / Pipeline Management

**Purpose:** track revenue opportunities per customer through configurable stages.

**Entities:** `Pipeline`, `Deal` (§6.4).

**Business logic:**
- Stage change appends to `stageHistory` (drives *time-in-stage* report) and fires
  `deal.stage_changed` automation event (e.g. stage → `proposal` ⇒ auto-task
  "Send proposal document" + proposal email template).
- `won` sets `wonAt` and prompts for final `value`; `lost` requires `lostReason`.
- Weighted forecast = Σ `value × stage.probability` (report §8.13).

**API:** `GET/POST/PUT/DELETE /deals`, `PATCH /deals/:id/stage`,
`GET /pipelines`, `POST/PUT /pipelines` (admin).
**UI:** Kanban board per pipeline (drag-drop stage change, column totals),
deal detail with timeline; win/lose confirmation modals.

---

### 8.4 Call Scheduling & Call Logging

**Purpose:** schedule calls (with automatic reminders), place them via click-to-call,
and log every attempt with outcome — automatically where the provider supports it.

**Entities:** `Call` (§6.5).

**Scheduling flow:**
1. Agent (or automation `schedule_call` action) creates a Call:
   `POST /crm/api/calls` `{leadId, scheduledAt, purpose, reminderMinutesBefore}`.
2. API enqueues a **delayed BullMQ job** in `reminder-queue` for
   `scheduledAt − reminderMinutesBefore`.
3. Job fires → `notificationService` sends in-app + push (+ email if enabled) to the owner:
   *"Call with Rahul (Acme) in 15 min"* with a deep link.
4. Optional: create an event on the agent's Google Calendar (CRM registers its **own**
   Google OAuth app — completely separate from the existing app's calendar integration).

**Automatic call scheduling (automation examples, built with §9 rules):**
- `lead.created` where `source.channel='meeting'` → schedule call at the meeting's slot.
- `lead.created` (any) → `wait 10 min` → if still unassigned, assign round-robin →
  `schedule_call` +2 h within working hours.
- `call.no_answer` → `schedule_call` +1 day (max 3 retries — rule condition
  `lead.callAttempts < 3`), and send WhatsApp "we tried to reach you" template.

**Click-to-call (Twilio flow):**
```
UI "Call now" → POST /calls/:id/dial
  → callService: Twilio creates call: from=CRM_TWILIO_NUMBER, to=agent phone,
    on answer bridges to lead's phone (agent-first bridging), record=true
  → Twilio status webhooks → POST /crm/api/webhooks/twilio/call-status
      initiated/ringing/answered/completed  → update Call.status, startedAt/endedAt,
      durationSec; on completed: fetch recording → copy to S3 → recordingUrl
  → Activity 'call.logged' auto-written; automation event 'call.completed' or
    'call.no_answer' fired from final status
```

**Manual logging:** `POST /calls/log` `{leadId, direction, status:'completed'|'no_answer',
durationSec?, outcome, notes}` — for calls made from personal phones. Same downstream
events fire, so automations behave identically.

**API:**

| Method & path | Description |
|---|---|
| `GET /calls` | Filters: `ownerId, status, from, to, leadId/contactId`; `view=calendar` returns range-bucketed events |
| `POST /calls` | Schedule |
| `POST /calls/log` | Log an already-made call |
| `PUT /calls/:id` | Edit notes/outcome |
| `PATCH /calls/:id/reschedule` | `{scheduledAt}` — links via `rescheduledFromId`, re-queues reminder |
| `PATCH /calls/:id/cancel` | Cancels + removes reminder job |
| `POST /calls/:id/dial` | Click-to-call via provider |
| `POST /webhooks/twilio/call-status` | Provider webhook (signature-validated, no JWT) |

**UI:** "Calls" section with **Day/Week calendar** (react-big-calendar) + list view;
"My calls today" widget on dashboard; post-call modal (auto-opens when a dialed call
completes) capturing outcome + notes + "schedule next follow-up?" shortcut.

---

### 8.5 WhatsApp Automation

**Purpose:** template-based automated & manual WhatsApp messaging with delivery tracking
and a shared inbox for replies.

**Provider:** **Meta WhatsApp Cloud API** (official). Requirements: Meta Business account,
verified WABA, phone number ID, permanent access token, and **pre-approved message
templates** (business-initiated messages outside the 24 h window MUST use approved
templates — this is a hard platform rule, and why `MessageTemplate` carries
`waTemplateName/waLanguageCode/waStatus`).

**Send flow:**
```
trigger (automation action | UI composer | bulk)
  → messages doc created status='queued'
  → whatsapp-queue job
  → whatsapp.worker:
      1. consent check (whatsappOptIn && !dnd) — else mark 'failed' reason 'no_consent'
      2. quiet-hours check — if inside quiet hours, re-delay job to window start
      3. inside 24h session (last inbound < 24h ago)? → free-form text allowed
         else → must use approved template; render variables into template components
      4. POST graph.facebook.com/v19/<phoneNumberId>/messages
      5. save providerMessageId, status='sent'
  → Meta webhook POST /crm/api/webhooks/whatsapp
      - statuses: sent/delivered/read/failed → statusHistory + Message.status
      - inbound messages → create Message(direction:'inbound'), match sender phone to
        Lead/Contact (or create Lead), Activity 'message.received', notify owner,
        fire 'message.replied' automation event, open 24h session window
```

**Automation examples:**
- Lead created from any web form → instant WhatsApp welcome template
  (`hello_lead`: "Hi {{1}}, thanks for contacting Cocoma Digital — {{2}} will reach out shortly").
- Meeting confirmed (synced from existing app) → template with Meet link + time.
- 24 h before a scheduled call → reminder template.
- No reply to welcome in 48 h → nudge template (rule condition checks `message.replied`
  event absence via `hoursSince.lastActivityAt`).

**API:** uses unified messages API (§8.6/8.7 share it):
`POST /messages/send` `{channel:'whatsapp', leadId|contactId, templateId, variables?, body?, scheduledFor?}`,
`GET /messages?channel=whatsapp&leadId=…`, `GET /inbox?channel=whatsapp` (conversation
threads grouped by counterpart), `POST /webhooks/whatsapp` (+ `GET` for Meta verify token).

**UI:** WhatsApp tab in lead/contact composer (template picker with live variable preview),
**Team Inbox** page (threaded conversations, unassigned/mine filters, reply box — free
text if inside 24 h window, else template-only with a visual "session expired" banner),
delivery ticks (✓ sent, ✓✓ delivered, blue ✓✓ read) on each message bubble.

---

### 8.6 SMS Automation

**Purpose:** transactional/notification SMS fallback (India: DLT-registered templates).

**Provider:** Twilio (global) or MSG91 (India — requires DLT entity ID, sender ID and
per-template DLT template IDs; store the DLT ID in `MessageTemplate.meta`).

**Flow:** identical shape to WhatsApp: `messages` doc → `sms-queue` → worker (consent +
quiet hours + render) → provider API → status webhook `POST /webhooks/sms/status` →
`statusHistory`. Inbound SMS (`POST /webhooks/sms/inbound`): `STOP` keyword flips
`smsOptIn=false` (compliance), otherwise logged as inbound message + notification.

**Typical automations:** call reminder 30 min before scheduled call when WhatsApp
undelivered; OTP-style meeting confirmations; failed-WhatsApp fallback
(rule: `message.failed` where `channel='whatsapp'` → `send_sms` same content).

**API:** unified — `POST /messages/send` with `channel:'sms'`; webhooks as above.
**UI:** SMS tab in composer; per-message delivery status; templates screen filtered by channel.

---

### 8.7 Email Automation

**Purpose:** individual + automated emails with templates, scheduling, and open/click
tracking; every email logged to the timeline.

**Provider:** Nodemailer over the same SMTP account the existing API uses (reuse
credentials — separate `MAIL_FROM` like `crm@cocomadigital.com`), or Resend for better
deliverability + built-in webhooks. Abstract behind `emailService` so switching is config.

**Flow:**
```
composer/automation → messages doc (channel 'email', subject+body rendered from template,
attachments = S3 urls) → email-queue → email.worker:
  consent check (emailOptIn && !dnd) → inject tracking pixel <img src=.../t/open/:msgId>
  and wrap links via /t/click/:msgId?u=… (optional, setting-toggled) → send → status 'sent'
Tracking endpoints (public, unauthenticated): GET /t/open/:msgId (1×1 gif, sets
status 'read' once), GET /t/click/:msgId (302 redirect + statusHistory entry)
Bounces: provider webhook (Resend) or SMTP failure → status 'bounced' → notify owner.
```

**Sequences (drip):** modeled as automation rules chained with `wait` actions —
e.g. `lead.created` → welcome email → wait 2 d → case-study email (condition:
no reply) → wait 3 d → "book a call" email with scheduling link. Any inbound reply
(`message.replied`) sets `sequenceStopped` via a companion rule that adds tag
`sequence:stopped`, which sequence steps check in conditions.

**API:** unified `POST /messages/send` `{channel:'email', subject?, templateId…,
scheduledFor?}`; `GET /messages?channel=email`; template CRUD `GET/POST/PUT/DELETE
/templates` (channel-aware, `templates:manage`).

**UI:** rich-text composer (TipTap editor) with template insert + placeholder chips,
"Send later" datetime picker, per-email opened/clicked badges on the timeline.

---

### 8.8 Follow-up Reminders

**Purpose:** never lose a lead — every lead/contact/deal can carry lightweight follow-ups
that remind the owner at the right moment through in-app, push, and email.

**Entities:** `FollowUp` (§6.7); denormalized `Lead.nextFollowUpAt`.

**Flow:**
1. Created manually ("Follow up Friday 11:00 — discuss budget") or by automation
   (`create_followup` action, e.g. on `call.completed` outcome `callback_requested`).
2. API stores it + enqueues delayed reminder job (`reminderJobId` saved for cancellation).
3. At `dueAt`: notification fan-out to owner; follow-up stays `pending` until actioned.
4. **Overdue escalation:** repeatable job every 30 min finds `pending` follow-ups older
   than X hours → re-notifies owner; older than 24 h → notifies the Manager role
   (setting-controlled).
5. Actions: **Done** (writes Activity, cancels recurrence step), **Snooze** (+1h/+1d/pick —
   re-queues job), **Cancel**.
6. Recurring follow-ups re-instantiate the next occurrence on completion.

**API:** `GET /followups` (`?due=today|overdue|upcoming&ownerId=`), `POST /followups`,
`PATCH /followups/:id/done|snooze|cancel`, `PUT /followups/:id`.

**UI:** "Today" home widget (due + overdue, one-click done/snooze), follow-up chips on
lead cards (red = overdue), quick-add from any timeline ("⏰ Follow up" button with
natural presets: tomorrow 10am, in 3 days, next week).

---

### 8.9 Task Management

**Purpose:** structured work items (beyond quick follow-ups) assignable across the team.

**Entities:** `Task` (§6.7).

**Business logic:**
- Tasks may be standalone or linked to lead/contact/deal (linked tasks appear in that
  entity's timeline and right-rail).
- Assignment fires `task.assigned` notification; due-soon reminder job at `reminderAt`;
  overdue tasks surface in dashboard and daily digest email (§13).
- Automations create tasks (`create_task` action): e.g. deal → proposal stage ⇒
  "Prepare proposal for {{deal.title}}", due +2 days, assigned to deal owner.
- Completing a `type:'call'` task offers "log the call now?" shortcut (opens call-log modal).

**API:** `GET /tasks` (`?assigneeId=me&status=open&due=today|overdue&entity=lead:<id>`),
`POST /tasks`, `PUT /tasks/:id`, `PATCH /tasks/:id/status`, `DELETE /tasks/:id`.

**UI:** My Tasks (list grouped by due bucket: Overdue / Today / This week / Later),
board view by status, task quick-create from anywhere (⌘K palette), Manager view of
team workload (tasks per assignee).

---

### 8.10 Notifications

**Purpose:** one fan-out service delivering every event to the right user via
in-app (always), browser push, and email — respecting per-user preferences.

**Entities:** `Notification` (§6.8); `CrmUser.notificationPrefs`.

**Fan-out logic (`notificationService.notify(userIds, payload)`):**
1. Persist `Notification` doc per user (in-app source of truth).
2. Emit `socket.io` event to room `user:<id>` → bell badge updates live.
3. If user pref `push` and subscription exists → Web Push (VAPID).
4. If pref `email` and severity ≥ threshold (assignment, overdue escalation, message
   failures) → templated email via email-queue.

**Standard events:** `lead.new` (to managers/unassigned pool), `lead.assigned`,
`followup.due`, `call.reminder`, `task.assigned`, `task.overdue`, `message.received`
(reply in inbox), `message.failed`, `deal.stage_changed` (owner + manager),
`automation.failed` (admins), `sync.error` (admins).

**API:** `GET /notifications?unread=1&page=`, `PATCH /notifications/:id/read`,
`PATCH /notifications/read-all`, `POST /notifications/subscribe-push` (save VAPID sub),
`PUT /users/me/notification-prefs`.

**UI:** bell with unread count (live), dropdown of latest 15 with deep links, full
notifications page, per-user preference toggles in Settings.

---

### 8.11 Activity Timeline

**Purpose:** the single chronological story of every lead/contact/deal — the heart of the
lead-detail screen and the audit trail for the whole CRM.

**Entities:** `Activity` (§6.8) — **append-only**; only `timelineService.record()` writes it.
Every service (sync, calls, messages, tasks, automations, conversions, notes) calls this
one function, guaranteeing consistency.

**Design rules:**
- `entity` = primary anchor; `also[]` mirrors the entry onto related entities (a call on a
  lead also shows on its deal) without duplicating documents — queries use
  `$or: [{entity}, {'also': …}]` on the compound index.
- `actor.kind` distinguishes `user` / `automation` / `system` / `sync` — the UI renders
  automation entries with a ⚡ badge and a link to the `AutomationRun`.
- `meta` keeps structured data (messageId, old/new status, durationSec) so the UI can
  render rich rows (playable recording, delivery ticks, diff chips) without joins.

**API:** `GET /leads/:id/timeline`, `/contacts/:id/timeline`, `/deals/:id/timeline`
— cursor-paginated (by `createdAt`), filter `?types=call.*,message.*&actor=user`.

**UI:** vertical feed, grouped by day, type icons, inline expanders (full email body,
call notes, recording player), filter chips (All / Calls / Messages / Notes / System),
composer pinned on top.

---

### 8.12 File / Document Management

**Purpose:** proposals, contracts, briefs, media — attached to any entity, stored in S3.

**Entities:** `Document` (§6.8).

**Flow:** UI requests `POST /documents/presign` `{fileName, mimeType, entity}` → API
returns S3 pre-signed PUT URL (key `crm/<entityKind>/<entityId>/<uuid>-<name>`) →
browser uploads directly to S3 → `POST /documents/confirm` persists the Document doc +
Activity `document.uploaded`. (Direct-to-S3 keeps large files off the API; matches the
existing app's S3 usage pattern. Bucket can be the same with a `crm/` prefix or dedicated.)

**Rules:** max 25 MB (docs) / 200 MB (media); allow-listed MIME types; version-by-upload
(same name → both kept, newest flagged); soft delete (S3 object retained 30 days via
lifecycle rule); documents on a lead re-parent to the contact at conversion.

**API:** `POST /documents/presign`, `POST /documents/confirm`,
`GET /documents?entity=lead:<id>`, `GET /documents/:id/download` (pre-signed GET —
keeps bucket private, unlike the existing app's public-read objects),
`DELETE /documents/:id`.

**UI:** Documents card on entity right-rail (drag-drop upload, category badge, preview
for pdf/images), global Documents page with entity/category/uploader filters.

---

### 8.13 Dashboard & Reporting

**Purpose:** role-aware operational visibility (agent day-view) + management analytics.

**Agent dashboard (default home):**
- Today: calls scheduled, follow-ups due, tasks due, unread inbox replies.
- My funnel: my leads by status (mini Kanban counts).
- Recent activity on my leads.

**Manager/Admin dashboard:**
- KPI tiles: new leads (period), contacted %, qualified %, won count & value,
  avg. first-response time, conversion rate.
- Charts (recharts): leads by source channel (stacked, weekly), funnel conversion
  (stage-to-stage drop-off), deals won value by month, agent leaderboard
  (leads handled / calls made / messages sent / won), automation health
  (sends, delivery %, failures by channel).
- Sync health widget: last sync per source, imported counts, errors (from `SyncState`).

**Reports (each = one Mongo aggregation in `reportService`, exportable CSV):**
| Report | Core aggregation |
|---|---|
| Lead source performance | group leads by `source.channel` × status; conversion % per source |
| Funnel / stage duration | avg time between `stageHistory` entries; drop-off per stage |
| Agent activity | per owner: calls (by status), messages (by channel), tasks completed, first-response time (lead.createdAt → first outbound activity) |
| Follow-up discipline | due vs completed-on-time vs overdue per agent |
| Message deliverability | per channel/template: sent → delivered → read/opened → replied |
| Revenue forecast | open deals: Σ value × stage probability, by month of expectedCloseDate |
| Idle leads | leads with `lastActivityAt < now − X days`, by owner |

**API:** `GET /dashboard` (role-aware payload), `GET /reports/:key?from&to&ownerId&format=json|csv`.

**UI:** dashboard grid (widgets conditional on role), Reports page with date-range picker,
per-report table + chart, export button. Follow the existing admin's recharts patterns.

---

## 9. Automation Engine (Workflows)

The engine that powers *all* "automatic" behavior — one generic mechanism instead of
hard-coded features.

### 9.1 Model: Trigger → Conditions → Actions

Stored as `AutomationRule` (§6.9), executed by `automation.worker`.

**Trigger events** (emitted by services via a tiny internal event bus that enqueues to
`automation-queue`):
`lead.created`, `lead.re_enquired`, `lead.status_changed`, `lead.assigned`,
`lead.converted`, `lead.idle` (emitted by a scheduled scanner), `call.completed`,
`call.no_answer`, `call.missed`, `deal.stage_changed`, `deal.won`, `deal.lost`,
`message.replied`, `message.failed`, `followup.due`, `task.overdue`,
`schedule.cron` (time-based rules).

**Condition evaluation:** flat AND list over a resolved context object
(`lead.*`, `contact.*`, `deal.*`, `event.*`, `hoursSince.lastActivityAt`,
`counts.callAttempts` …). Ops: `eq ne in nin gt gte lt lte contains exists`.

**Actions** (executed sequentially; each records a step in `AutomationRun`):

| Action | Config | Implementation |
|---|---|---|
| `send_email` / `send_whatsapp` / `send_sms` | `templateId`, variable overrides | enqueue to channel queue (all consent/quiet-hour checks live in the channel worker — single enforcement point) |
| `schedule_call` | `offsetMinutes` or `at`, `purpose`, `assignee` | create Call + reminder job |
| `create_task` | title tpl, `dueOffsetHours`, `assigneeStrategy` | create Task + notify |
| `create_followup` | `dueOffsetHours`, note tpl, `channelHint` | create FollowUp + reminder job |
| `assign_owner` | `strategy: round_robin \| load_balanced \| fixed:<userId>` | set ownerId, fire `lead.assigned` |
| `update_field` | `{field, value}` (allow-listed fields) | patch entity |
| `add_tag` / `remove_tag` | tag | patch tags |
| `notify_user` | `who: owner \| manager \| user:<id>`, message tpl | notificationService |
| `wait` | `minutes` / `hours` / `days` | re-enqueue remaining actions as a delayed job (this is how drip sequences work) |

### 9.2 Execution semantics & safety

- **Idempotency:** `AutomationRun` unique on `(ruleId, entityId, triggerEventHash)` for
  non-cron triggers — a re-delivered event never double-fires.
- **Loop guard:** actions performed by automations are flagged (`actor:'automation'`) and
  do **not** re-emit the same trigger class for the same rule (max chain depth 3).
- **Rate cap:** per-entity cap (default 10 automation actions/day) — a misconfigured rule
  can't spam a lead.
- **Quiet hours:** message actions delayed to window start (rule-level override of the
  global setting).
- **Kill switch:** `isActive:false` stops new runs instantly; in-flight `wait` chains
  check `isActive` before resuming.
- **Observability:** Automations screen shows per-rule run count, last run, failure rate;
  each run expandable to its step log. `automation.failed` notifies admins.

### 9.3 Starter rule pack (seed data)

1. **New lead welcome:** `lead.created` → assign round-robin → WhatsApp welcome template →
   email welcome → create follow-up +1 day "First call".
2. **Speed-to-lead call:** `lead.created` where `source.channel in [consultation, meeting]`
   → schedule_call +30 min → notify owner.
3. **No-answer retry:** `call.no_answer` where `counts.callAttempts < 3` → schedule_call
   +1 day → WhatsApp "we tried reaching you".
4. **Idle lead re-engage:** `lead.idle` (7 days) where `status in [contacted, qualified]`
   → email case-study template → create_followup +2 days.
5. **Meeting reminder:** `schedule.cron` hourly → condition: call/meeting in next 24 h
   window → WhatsApp reminder template (dedup by tag).
6. **Proposal stage:** `deal.stage_changed` to `proposal` → create_task "Prepare & send
   proposal" due +48 h → email proposal-intro template.
7. **Won → onboarding:** `deal.won` → notify manager → create_task "Kick-off call" →
   email thank-you/onboarding.
8. **Reply triage:** `message.replied` → add_tag `replied` → notify owner →
   update_field `rating='hot'`.

### 9.4 UI: rule builder

Settings → Automations: list (toggle, run stats) → builder wizard:
**Step 1 Trigger** (event picker + event config) → **Step 2 Conditions** (field/op/value
rows with entity-field autocomplete) → **Step 3 Actions** (ordered cards, add/reorder,
per-action config incl. template picker with preview, `wait` steps rendered as timeline
gaps) → **Review & activate** (plain-English summary: *"When a lead is created from
Free Consultation, wait 10 minutes, then assign round-robin and send the Welcome
WhatsApp template"*). A "Test with sample lead" dry-run mode executes conditions and
logs would-be actions without sending.

---

## 10. Integration with the Existing Application

**Constraint honored:** the existing codebase is not modified. The CRM connects using
what the platform already exposes.

### 10.1 Service account (one-time manual step, no code change)

Create a dedicated user in the existing admin panel: `crm-service@cocomadigital.com`,
role `editor` (read access is all the sync needs). The CRM stores these credentials and
logs in via `POST /admin/api/auth/login`; the JWT (7-day expiry) is cached and refreshed
on 401 by re-logging in — handled inside `syncService`'s HTTP client.

### 10.2 Sync design (pull, incremental, idempotent)

`sync.worker` runs as a BullMQ **repeatable job every 2 minutes** per source:

| sourceKey | Existing endpoint polled | Maps to Lead |
|---|---|---|
| `contact_us` | `GET /admin/api/contact-us` | channel `contact_form`; message=subject+message |
| `marketing_form` | `GET /admin/api/marketing-house/form` | channel `marketing_form`; serviceInterest=service_type |
| `free_consultation` | `GET /admin/api/free-consultation/submissions` | channel `consultation`; budget mapped |
| `meetings` | `GET /admin/api/meetings` | channel `meeting`; **also** auto-creates a scheduled Call at `meeting_start_utc` and mirrors meeting status changes (confirmed → Call confirmed w/ Meet link in notes; rejected → Call cancelled) |
| `job_applicants` (optional toggle) | `GET /admin/api/job/applicant` | channel `job_applicant` — usually routed to a separate "Recruitment" tag/owner, not sales |

**Algorithm per source:**
```
1. cursor = SyncState[sourceKey].lastSyncedAt (default: epoch or configured backfill date)
2. fetch pages sorted by updatedAt asc, filtering client-side where the endpoint lacks
   a date filter (list endpoints return timestamped docs; over-fetch window = cursor − 5 min
   to absorb clock skew, dedup makes overlap harmless)
3. for each record:
     upsert key = { source.externalCollection, source.externalId }   // unique index
     if exists → diff relevant fields (e.g. Meeting.status) → apply updates + Activity
     else → run dedup logic (§8.1) → create Lead (or merge) → Activity 'sync.imported'
            → fire 'lead.created' (automations take over: welcome msg, assignment…)
4. SyncState.lastSyncedAt = max(updatedAt seen); record run status/counters
5. on error: exponential backoff (BullMQ), SyncState.lastError, notify admins after
   3 consecutive failures ('sync.error')
```

**Why polling is the right call here:** the existing API has no webhooks/queues; 2-minute
latency is fine for sales follow-up; timestamps + unique upsert index make it exactly-once
in effect; total load is ~5 small GETs/2 min — negligible against the existing rate limit.

**Alternative (optional accelerator):** a read-only MongoDB user on the existing DB
scoped to the five lead collections lets the sync worker query
`{updatedAt: {$gt: cursor}}` directly (faster, filterable). Same mapper code; pick per
environment via `SYNC_MODE=api|mongo`. Still zero code change to the existing app.

### 10.3 Data the CRM writes back — none

The CRM never writes to the existing app's DB or admin API (meeting confirmation etc.
remains in the existing admin panel — the sync mirrors those state changes into the CRM).
This keeps the integration one-directional and risk-free. If two-way sync is wanted later
(e.g. mark `isRead` on synced enquiries), the existing `PUT /admin/api/marketing-house/
form/:id/mark-read` endpoint can be called by the sync worker — an additive, reversible
setting.

### 10.4 Operational notes

- Ask ops to add the CRM's origin (e.g. `https://crm.cocomadigital.com`) to the existing
  API's `CORS_ORIGINS` env **only if** the CRM frontend ever calls it directly — with the
  server-side sync design it does **not**, so even this env change is unnecessary.
- Backfill: first run imports history (configurable `SYNC_BACKFILL_FROM` date) with
  automations **suppressed** for records older than 24 h (flag on the sync job) so a
  backfill doesn't blast old leads with welcome messages.

---

## 11. Complete API Reference

Base: `https://crm-api.cocomadigital.com/crm/api` · JSON envelope
`{ status:'success'|'error', message?, data?, meta?{page,limit,total} }` (same convention
as the existing API). All routes `protect`ed unless marked public.

```
AUTH
  POST   /auth/login                 public   {email,password} → {accessToken, user}; sets refresh cookie
  POST   /auth/refresh               public   rotate refresh → new access token
  POST   /auth/logout                         invalidate refresh token
  GET    /auth/me                             current user + role + permissions
  POST   /auth/change-password

USERS & ROLES (admin)
  GET/POST /users        GET/PUT/DELETE /users/:id     PATCH /users/:id/activate
  PUT    /users/me/notification-prefs
  GET/POST /roles        PUT/DELETE /roles/:id         GET /permissions (catalog)

LEADS                    §8.1 table (list/create/detail/update/status/assign/convert/
                         import/export/delete/timeline/notes)
CONTACTS & COMPANIES     §8.2 (CRUD + timeline + consent)
DEALS & PIPELINES        §8.3 (CRUD + stage + pipelines)
CALLS                    §8.4 table (+ /calls/:id/dial, webhooks)
MESSAGES & TEMPLATES
  POST   /messages/send              {channel, leadId|contactId, templateId?, body?, subject?, variables?, scheduledFor?}
  POST   /messages/bulk              {channel, templateId, filter|ids[], scheduledFor?}  (messages:send + leads:read)
  GET    /messages                   ?channel&status&leadId&contactId&from&to
  GET    /inbox                      ?channel&assigned=me|unassigned  (threaded)
  GET/POST /templates    PUT/DELETE /templates/:id     POST /templates/:id/preview {sampleEntityId}
TASKS                    §8.9        FOLLOW-UPS §8.8   NOTIFICATIONS §8.10
DOCUMENTS                §8.12 (presign/confirm/list/download/delete)
AUTOMATIONS
  GET/POST /automations  GET/PUT/DELETE /automations/:id   PATCH /automations/:id/toggle
  POST   /automations/:id/test       dry-run against a sample entity
  GET    /automations/:id/runs       run history (+ /runs/:runId detail)
DASHBOARD & REPORTS      GET /dashboard · GET /reports/:key?from&to&ownerId&format
SETTINGS (admin)
  GET/PUT /settings                  working hours, quiet hours, assignment strategy,
                                     provider configs (masked), sync toggles
  GET    /settings/sync-status       SyncState rows        POST /settings/sync-run/:sourceKey (manual trigger)
AUDIT    GET /audit-logs?userId&entity&from&to   (admin)

PUBLIC (no JWT — signature/token validated per provider)
  POST/GET /webhooks/whatsapp        Meta verify + events
  POST   /webhooks/twilio/call-status
  POST   /webhooks/sms/status  /webhooks/sms/inbound
  POST   /webhooks/email             Resend/SES events (if used)
  GET    /t/open/:msgId   /t/click/:msgId          email tracking
  GET    /health
```

---

## 12. UI / Frontend Workflow

### 12.1 Navigation map

```
┌ Sidebar ─────────────────────────────────────────────────────────┐
│ 🏠 Dashboard        (role-aware widgets)                          │
│ 👤 Leads            (list ⇄ kanban · detail w/ timeline)          │
│ 🏢 Customers        (contacts · companies)                        │
│ 💼 Deals            (pipeline kanban · detail)                    │
│ 📞 Calls            (calendar · list · post-call modal)           │
│ 💬 Inbox            (WhatsApp/SMS/Email threads)                  │
│ ✅ Tasks            (my tasks · team view)                        │
│ ⏰ Follow-ups       (today · overdue · upcoming)                  │
│ 📊 Reports          (7 reports + export)                          │
│ ⚙️ Settings         (users/roles · templates · automations ·      │
│                      providers · sync status · working hours)     │
└──────────────────────────────────────────────────────────────────┘
Topbar: global search (⌘K: leads/contacts/deals) · quick-create (+) · 🔔 bell (live)
```

### 12.2 Golden-path workflows

**A. New lead → first contact (mostly automatic)**
1. Visitor submits the free-consultation form on the existing website.
2. ≤2 min later the sync imports it; automation #1 assigns an agent, sends the WhatsApp
   welcome, and creates a next-day follow-up. Agent's bell rings: *"New lead assigned:
   Priya (SEO, budget 50k)"*.
3. Agent opens the lead detail — the timeline already shows form payload, assignment,
   and the delivered welcome message. Agent clicks **Call now** (click-to-call) or
   **Schedule call**.
4. Post-call modal captures outcome; `callback_requested` auto-creates the follow-up.

**B. Lead → customer**
1. After a successful proposal call, agent clicks **Convert** → wizard confirms
   company/contact fields, creates a Deal (`proposal`, value, expected close).
2. Automation #6 creates the proposal task + sends the intro email.
3. Deal drags through the pipeline; **Won** fires onboarding automation #7.

**C. Reply handling**
1. Lead replies on WhatsApp → webhook logs it, timeline updates live, owner notified,
   lead auto-tagged `replied` and rated `hot` (automation #8).
2. Agent answers from the **Inbox** (free text — inside 24 h session window).

### 12.3 Frontend implementation notes

- Reuse `app/admin` patterns wholesale: axios service with Bearer + 401 handling, Tailwind
  config, layout shell, table/form components, react-hook-form usage.
- **react-query** for all server state (list caching, optimistic Kanban drag, invalidation
  on socket events); Redux only for the auth slice.
- Socket connection authenticated with the access token; on `notification` event →
  toast + bell badge + targeted query invalidation (e.g. `['lead', id, 'timeline']`).
- Route guards read the permission list from `/auth/me`; sidebar items and action buttons
  hidden per permission (server remains the enforcement point).

---

## 13. Background Jobs & Schedulers

All via **BullMQ repeatable jobs** (survive restarts; safe with multiple API instances):

| Job | Schedule | Does |
|---|---|---|
| `sync:<sourceKey>` ×5 | every 2 min | §10.2 incremental import |
| `reminders:dispatch` | delayed jobs (not cron) | call reminders, follow-up reminders, task reminders — one delayed job each, cancelled on completion/reschedule |
| `followups:escalate` | every 30 min | overdue follow-up re-notify + manager escalation |
| `leads:idle-scan` | hourly | emit `lead.idle` events for automation rules |
| `automations:cron` | per-rule cron | time-based rules (`schedule.cron` triggers) |
| `digest:daily` | 08:30 IST | per-agent email: today's calls, due follow-ups, overdue tasks, yesterday's new leads |
| `messages:scheduled` | delayed jobs | `scheduledFor` sends |
| `housekeeping` | daily 02:00 | purge read notifications >90 d (TTL backup), S3 lifecycle audit, `AutomationRun` >180 d archive |

Retry policy: channel sends 3 attempts (exponential backoff 1 m/5 m/25 m) → `failed` +
owner notification; sync 5 attempts; everything visible in a Bull Board dashboard mounted
at `/crm/api/admin/queues` (admin-only, behind `protect`).

---

## 14. Environment Variables

```bash
# --- core ---
NODE_ENV=production
CRM_PORT=6000
CRM_MONGO_URI=mongodb://.../cocoma_crm
REDIS_URL=redis://localhost:6379
CRM_JWT_SECRET=...            CRM_JWT_ACCESS_TTL=15m
CRM_REFRESH_SECRET=...        CRM_REFRESH_TTL=7d
CRM_WEB_ORIGIN=https://crm.cocomadigital.com          # CORS allow-list

# --- integration with existing app (§10) ---
LEGACY_API_BASE=https://api.cocomadigital.com          # existing Express API
LEGACY_ADMIN_EMAIL=crm-service@cocomadigital.com       # service account
LEGACY_ADMIN_PASSWORD=...
SYNC_MODE=api                  # api | mongo
LEGACY_MONGO_URI_RO=           # only if SYNC_MODE=mongo (read-only user)
SYNC_INTERVAL_SECONDS=120
SYNC_BACKFILL_FROM=2025-01-01
SYNC_JOB_APPLICANTS=false

# --- email ---
SMTP_HOST=  SMTP_PORT=  SMTP_USER=  SMTP_PASS=  SMTP_SECURE=true
CRM_MAIL_FROM="Cocoma CRM <crm@cocomadigital.com>"
EMAIL_TRACKING_ENABLED=true

# --- whatsapp cloud api ---
WA_PHONE_NUMBER_ID=   WA_BUSINESS_ACCOUNT_ID=
WA_ACCESS_TOKEN=      WA_WEBHOOK_VERIFY_TOKEN=

# --- sms / voice (twilio or msg91) ---
TWILIO_ACCOUNT_SID=   TWILIO_AUTH_TOKEN=
TWILIO_SMS_FROM=      TWILIO_VOICE_FROM=
MSG91_AUTH_KEY=       MSG91_SENDER_ID=      MSG91_DLT_ENTITY_ID=

# --- storage ---
AWS_ACCESS_KEY_ID=  AWS_SECRET_ACCESS_KEY=  AWS_DEFAULT_REGION=
CRM_S3_BUCKET=      CRM_S3_PREFIX=crm/

# --- misc ---
VAPID_PUBLIC_KEY=   VAPID_PRIVATE_KEY=       # web push
GOOGLE_CLIENT_ID=   GOOGLE_CLIENT_SECRET=    # CRM's OWN calendar OAuth app (optional)
QUIET_HOURS_START=21:00  QUIET_HOURS_END=09:00  BUSINESS_TIMEZONE=Asia/Kolkata

# frontend (apps/web/.env)
VITE_CRM_API_URL=https://crm-api.cocomadigital.com/crm/api
VITE_SOCKET_URL=https://crm-api.cocomadigital.com
```

---

## 15. Security Checklist

- [ ] Access/refresh JWT split; refresh in httpOnly + Secure + SameSite cookie; rotation with reuse detection.
- [ ] `helmet`, strict CORS (CRM origin only), rate limiting (auth routes: 10/15 min; API: 500/15 min — mirror existing app).
- [ ] `express-validator` on every write route; central error handler that never leaks stack traces.
- [ ] Permission middleware on **every** route + own-scope query filter for agents; UI hiding is cosmetic only.
- [ ] Provider webhooks verified: Twilio signature (`X-Twilio-Signature`), Meta `X-Hub-Signature-256` HMAC, verify-token on WhatsApp GET.
- [ ] S3 bucket **private**; access only via pre-signed URLs (improvement over existing app's public-read).
- [ ] Secrets only in env; provider tokens masked in settings API responses.
- [ ] Consent enforcement in channel workers (single choke point) + STOP/opt-out handling — DND/DLT/WhatsApp policy compliance.
- [ ] `AuditLog` on all mutating requests (middleware) — who/what/before/after/IP.
- [ ] MongoDB auth enabled; CRM DB user scoped to `cocoma_crm`; optional legacy read-only user scoped to 5 collections.
- [ ] Backups: nightly `mongodump` of `cocoma_crm`; Redis AOF for queue durability.
- [ ] Dependency audit in CI (`npm audit`), lockfiles committed.

---

## 16. Deployment Architecture

```
                    ┌─────────────── Nginx (TLS) ───────────────┐
  crm.cocomadigital.com  → crm-web  (static Vite build)         │
  crm-api.cocomadigital.com → crm-api :6000  (2× PM2/Docker)    │
                    └────────────┬──────────────────────────────┘
                                 │
        ┌──────────┬─────────────┼──────────────┬───────────────┐
        ▼          ▼             ▼              ▼               ▼
   MongoDB      Redis 7     worker process   AWS S3        Providers
  cocoma_crm   (queues +   (BullMQ workers,  (crm/ prefix) (Meta, Twilio,
  (replica set  socket.io   separate PM2                    SMTP, Push)
   or Atlas)    adapter)    app: `node src/workers/index.js`)
```

- **API and workers run as separate processes** (same codebase, different entrypoints) —
  a heavy send burst never blocks HTTP; scale workers independently.
- Multi-instance API needs the socket.io **Redis adapter** (already have Redis).
- Webhook endpoints must be publicly reachable over HTTPS (Meta/Twilio requirement) —
  expose only `/crm/api/webhooks/*` and `/t/*` paths if you firewall aggressively.
- Zero infra contact with the existing app besides outbound HTTPS calls to its admin API
  (or a read-only Mongo connection).
- Docker Compose for dev: `mongo`, `redis`, `api` (nodemon), `worker`, `web` (vite).

---

## 17. Phased Delivery Roadmap

| Phase | Duration (est.) | Scope | Exit criteria |
|---|---|---|---|
| **0 — Foundation** | 1 wk | Repo, Docker, Express skeleton, Mongo/Redis config, auth (login/refresh), users+roles+permissions, audit middleware, frontend shell (login, layout, guards) | Team can log in with RBAC enforced |
| **1 — Leads + Sync** | 2 wk | Lead model/CRUD/list/detail, timeline service, notes, **sync worker for all 5 sources**, dedup, manual + CSV import, assignment | Website enquiries appear in CRM ≤2 min, deduped, assignable |
| **2 — Comms core** | 2 wk | Message model, templates CRUD, email service (+tracking), WhatsApp Cloud API (send + webhooks + inbox), SMS service, consent & quiet hours | Agent can send/receive on all 3 channels from lead detail; delivery statuses live |
| **3 — Calls, Tasks, Follow-ups** | 2 wk | Call schedule/log/calendar, click-to-call + recording webhooks, tasks, follow-ups + reminder jobs, notifications (socket + push + email), daily digest | Full agent day-loop works end-to-end |
| **4 — Automation engine** | 2 wk | Rule model, event bus, worker, all 10 actions, run audit, rule-builder UI, starter rule pack, dry-run | Welcome/retry/idle automations run unattended with visible run logs |
| **5 — Customers, Deals, Reports** | 2 wk | Convert flow, contacts/companies, pipelines/deals kanban, dashboard, 7 reports + export, documents module | Lead→customer→won journey + management reporting complete |
| **6 — Hardening & launch** | 1 wk | Security checklist pass, load test sends, backfill import with automations suppressed, provider production approvals (WhatsApp templates, DLT), UAT, go-live | Production cut-over |

**Total: ~12 weeks** for a 2-dev team (1 backend-lean, 1 frontend-lean), thanks to heavy
reuse of the existing admin's frontend patterns and API conventions.

---

*End of document.*
