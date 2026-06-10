# Platform roadmap — what we move where

Single source of truth for "we'll do this when we migrate" — captured
across many decisions during the May 2026 site work, so nothing falls
through the cracks during the Next.js migration.

## Target stack (locked, May 2026)

```
Frontend:       Next.js 15 (App Router)
Content:        MDX for editorial; Sanity Studio for catalog content
Styling:        Tailwind + shadcn/ui (sticker design language ports cleanly)
Hosting:        Vercel
Backend:        Node.js (whatever Anshu's team picks — REST/GraphQL)
```

See related docs:
- `docs/CONTENT_BRIEF.md` — voice rules + templates
- `docs/CONTENT_PIPELINE.md` — how content lands today (markdown / admin / via Claude)
- `docs/SEO_IMAGE_OPTIMIZATION.md` — image performance plan

## Why migrate

1. **AI/LLM citation** — Next.js server-renders by default; ChatGPT /
   Claude / Perplexity see real HTML, not a JS bundle. CRA's
   client-rendering hurts AI discoverability today.
2. **SEO** — proper SSR/SSG = per-page metadata, structured data,
   sitemap + RSS without hacks.
3. **Performance** — edge rendering on Vercel; fewer round trips.
4. **Content scale** — programmatic content (40K+ video pages,
   800+ campaigns) would crush CRA's prerender. Next.js handles
   incrementally via ISR.
5. **Team-platform foundation** — internal tooling (`team.cocomadigital.com`)
   builds on the same stack.

## When to migrate (signal-based, not date-based)

Migrate when 3 of 4 are true:
- ✅ 30+ blog posts shipped on current setup (proves content velocity)
- ✅ Node backend stable for ~2-3 weeks (no more API churn)
- ✅ Anshu's team has bandwidth for a 6-8 week sprint
- ✅ Pearl is hitting limits of the current admin (more than once a week)

Probable timing: ~3-4 months from May 2026.

## Migration-blocked work (queued items that need Next.js + Sanity)

Things we identified during the May 2026 site work that are
deliberately deferred until the migration. Each item lists *why*
deferring is the right call.

### 1. Gallery — tile-based / category-curated layout

**Today**: photos organized by month (chronological). Works at low
volume but feels list-y as the gallery grows.

**Future (Next.js + Sanity)**: tile-based layout with curated
collections — *"Festivals"*, *"Client visits"*, *"Studio life"*,
*"On-set days"* — each as a featured panel. Plus tag-driven filtering,
Pinterest-masonry with section jumps, "Featured collections this month"
hero. Photos in Sanity = drag-drop curation, no code edits.

**Why defer**: current `galleryPhotos.js` data file works for the
~100-photo scale we'll hit by migration. Tile-based UX needs richer
metadata (collection assignments, ordering within collections, hero
crops per photo) that Sanity handles natively but is friction to
hand-author in JS.

### 2. Programmatic content pages (40K videos, 800 campaigns, etc.)

**Today**: per-video / per-campaign pages exist but are sparse
admin-driven entries. CRA's prerender can't handle 40K+ at build time.

**Future**: Next.js ISR (Incremental Static Regeneration) builds + revalidates
per-page on demand. AI-generated descriptions per video pull from the
YouTube Data API. Internal linking + topic clusters automated.

**Why defer**: CRA build time would balloon to 30+ minutes; ISR is the
purpose-built solution.

### 3. Internal team platform — `team.cocomadigital.com`

**Today**: Cocoma uses ClickUp + Slack + Drive. No custom internal portal.

**Future**: thin "Cocoma OS" dashboard that pulls from those SaaS tools
into one screen — studio metrics, internal directory of editors/
designers with availability, deliverable approval flow, brand asset
library tied to client kits.

**Why defer**: needs identity (Google Workspace SSO) wired in;
Next.js + Vercel is the natural home; want the public site stable
first before splitting attention.

### 4. CMS-driven content for non-blog types

**Today**: blog posts are markdown in `src/content/blog/*.md`
(works well). Other content (services, work pages, solutions, case
studies) is split between hardcoded JS data files + Laravel admin.

**Future**: all content types in Sanity. Pearl edits in Sanity Studio
(visual editor with live preview). Public site fetches via Sanity's
GROQ API or static-builds with Next.js + ISR.

**Why defer**: Sanity Studio onboarding for Pearl needs a Next.js
host that talks to Sanity natively. Bolt-on CMS to CRA would be a
half-step.

### 5. Image optimization pipeline (Sharp / WebP / responsive sizes)

**Today**: photos are uploaded at full resolution; browser handles
download. With ~50 photos in the gallery this is fine; at 200+ it
becomes a perf issue.

**Future**: build-time image processing — Sharp generates 3-4
responsive sizes per photo, WebP encoding, blur-up placeholders.
Next.js's `<Image>` component handles all this natively.

**Why defer**: not yet a real problem at current scale.

### 6. Header nav redesign for content surfaces

**Today**: header has SERVICES + WORK dropdowns + a CTA. Content
surfaces (`/about-us`, `/blog`, `/gallery`, `/case-studies`,
`/research`, `/tools`) are findable only via footer.

**Future**: header gets a "Discover" or "Resources" mega-menu
covering all content surfaces. Logged-out vs logged-in nav variants.

**Why defer**: current nav works; redesign is a bigger UX project
worth doing on the Next.js side with a fresh design pass.

### 7. Helmet/SiteMeta dev-mode bug

**Today**: on dev (npm start), `<title>`, `<meta name="description">`,
`<meta property="og:title">`, and canonical link are NOT being set
per page — they stay on the index.html defaults. Production may
be fine via react-snap prerender (worth verifying after deploy).

**Future**: Next.js's built-in metadata API replaces Helmet entirely.
Per-route `export const metadata = { ... }` — no race conditions, no
provider setup, works on SSR + CSR consistently.

**Why defer**: fixing Helmet on CRA is throwaway work; Next.js makes
it a non-issue.

## What we're NOT migrating (intentionally)

- The Laravel admin (admin.cocomadigital.com) → keep for catalog
  content during migration; phase out after Sanity onboarding.
- The S3 media bucket (cocomadigitalmediabucket) → stays as origin;
  Vercel + Next.js consume from it directly.
- ClickUp / Slack / Drive / Keka → SaaS stays. Don't rebuild what
  we can buy.

## Add to this list as decisions get made

When we identify "we'd do X but it's better at Next.js migration,"
note it here. Search `migration-blocked` in commit messages to find
related context.

---

**Last updated:** 2026-05-05 (initial, captured during About / Gallery work)
