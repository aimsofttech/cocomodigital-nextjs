# cocomadigital.com — working agreement

## Branch policy (non-negotiable)

- **Never push to `main`.** Only Anshu merges to `main`.
- Anil + Claude work on **`anil-dev`** (or short-lived `anil-dev/<topic>` branches off it).
- Every change reaches `main` as a **pull request**, reviewed and merged by Anshu.
- Every PR gets a description explaining what changed, why, and how to verify it.

`main` is wired to auto-deploy production: a push to `main` triggers
`.github/workflows/deploy-main.yml` → SSH to the VPS → `.scripts/deploy.sh`
under `/www/wwwroot/cocomadigital.com`. A bad merge is live immediately.
That is why merges are Anshu's call, not ours.

## Repo layout

npm workspaces monorepo, three apps:

| Path | Package | Stack | Port |
|---|---|---|---|
| `app/api` | `@cocoma/api` | Express + Mongoose (MongoDB), JWT auth, S3 uploads, nodemailer | 5000 |
| `app/admin` | `@cocoma/admin` | React + Vite + Redux Toolkit + Tailwind (admin SPA) | vite default |
| `app/web` | `comoma-digital` | Next.js App Router (public site) | 3000 |

`app/web` is a **pure frontend** — no database, no CMS. All content comes from
`app/api` over REST (`NEXT_PUBLIC_API_URL`).

Run everything: `npm run dev` at the root (concurrently spins up API + admin + web;
web waits on `http://localhost:5000/health`).

## Environment

Each app has its own `.env.example`. Copy to `.env` / `.env.local` locally.

**Secrets never go in git** — not in `.env`, not "temporarily", not to fix a key
mismatch. Share via 1Password / Signal / the server env config. This has been
asked for before and the answer is the same.

## Docs

Planning docs live in `app/web/docs/`:
- `PLATFORM_ROADMAP.md` — deferred/queued work and target-stack decisions
- `CONTENT_BRIEF.md` — voice rules + content templates
- `CONTENT_PIPELINE.md` — how content actually lands
- `SEO_IMAGE_OPTIMIZATION.md` — image performance plan

## Not this repo

`github.com/aimsofttech/cocomadigital-nextjs` (spelled with an **a**) is a
**different, superseded repo** — the abandoned Payload CMS + Postgres attempt
from May 2026, last touched 2026-06-10. Don't confuse the two. This repo
(`cocom**o**digital-nextjs`) is the live one.
