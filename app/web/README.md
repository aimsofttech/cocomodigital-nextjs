# Cocoma Digital

Production Next.js frontend for cocomadigital.com.

The site is a **pure frontend**: all content is served by the
standalone **Express + MongoDB API** (`cocoma-admin-api`). There is
no CMS, database, or server secret embedded in this app.

## Stack

- **Next.js 16** App Router + RSC
- **React 19** + **TypeScript** + **Tailwind 4**
- Data from the standalone **Express + MongoDB API** over HTTP
  (`NEXT_PUBLIC_API_URL`)
- **PM2** for prod process management

## Commands

```bash
npm run dev        # dev server on http://localhost:3000
npm run build      # regenerates blog manifest + sitemap, then next build
npm run start
npm run typecheck
npm run lint
npm run format
```

## Environment

Local env files are gitignored. Copy the example and adjust:

```bash
cp .env.example .env.local
```

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SERVER_URL` | Public site URL (OG tags, canonical, redirects) |
| `NEXT_PUBLIC_API_URL` | Base URL of the Express + MongoDB content API (e.g. `http://localhost:5000/api`) |

## Architecture

- `src/app` — Next App Router pages (RSC where possible)
- `src/lib/apiClient.ts` — typed fetch client for the content API
- `src/lib/content.ts` — server-side content fetchers used by RSC
  pages; adapts API responses to the shapes the views expect
- `src/app/content-api/[...slug]` — thin server route that re-exposes
  the content API to client components in the list/`{ docs }` shape
  they consume (also proxies lead-form POSTs to the API)
- `src/Service/redux` — legacy Redux store (phasing out)
- `ecosystem.config.js` — PM2 config for prod

## Running with the API + Admin

The web app, API, and admin panel run together from the
`cocoma-admin-api` repo root:

```bash
npm run dev   # WEB :3000 · API :5000 · ADMIN :5173
```
