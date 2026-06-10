# Content pipeline — handoff guide

This is how Pearl + Anil get content onto cocomadigital.com without
writing code.

## The mental model

> **Pearl drafts → Anil refines → Anil hands the final to me (Claude in chat) → I commit + push → Anshu reviews + merges → live.**

Until we migrate to Next.js + a proper CMS, I'm the automation
layer between your drafts and the codebase. You don't touch git;
you just describe what should be on the site, in what shape, and
I handle the technical handoff.

## What kinds of content can land via this pipeline today

| Content type | Where it lives | How to update |
|---|---|---|
| **Blog posts / founder essays** | `src/content/blog/*.md` | Send me markdown (or a Notion/Doc link) → I drop the .md file |
| **Case studies (long-form)** | `src/content/blog/*.md` | Same as blog (same pipeline, just a different category tag) |
| **Work hero copy** (`/work/ip-monetization` etc.) | `src/Pages/Work/_shared/*Data.js` | Tell me which page + which field; I edit the data file |
| **Solutions audience pages** (`/solutions/youtube-creators` etc.) | `src/Pages/Solutions/<slug>/` | Tell me which page + what to change; I edit |
| **Footer / header copy** | `src/components/Footer/CocomaFooter.jsx` + `src/components/header/header.jsx` | Tell me the new copy; I edit |
| **Service items, marketing items, creative items** | Laravel admin (`admin.cocomadigital.com`) | Pearl uses the existing admin form |
| **Schedule meeting / cart copy** | React components | Tell me what to change |

The split is: **editorial content** (essays, copy) → me. **Catalog
content** (services, marketing items with images + slugs) → Pearl
uses the Laravel admin directly.

## How to hand me content

Three formats work. Pick whichever's easiest for the moment.

### Format A — markdown in chat (best for blog/essays)

Paste the full post into chat, frontmatter included. I drop it
straight into `src/content/blog/<slug>.md`.

```markdown
---
title: "Why our monetization compounds"
date: "2026-05-15"
author: "Anil Mahato"
image: "/Images/blog/monetization-hero.jpg"
excerpt: "Seven years of partnerships taught us this..."
tags: ["monetization", "founder-pov"]
---

## Body of the essay starts here

Real prose with **bold**, *italic*, [links](https://example.com),
> blockquotes,
- bullets,

…and so on. Standard markdown.
```

**Required fields:** `title`, `date`. Everything else is optional.

### Format B — share a Doc / Notion link

Send me the link. I'll read it, convert to markdown, ask any
clarifying questions about title/slug/image, then drop the .md
file.

### Format C — describe the change in plain English

Best for non-blog edits. Examples:
- *"Change the IP Monetization hero subtitle to: '[new copy]'"*
- *"Update the SMM Management methodology pillar 2 description to: '[new text]'"*
- *"Add a 5th audience card on Marketing Campaigns: 'You're shipping content but not seeing the dashboards'"*
- *"Footer 'Our Work' subheading should read: '[new line]'"*

I confirm the file/field, edit, and ship.

## Where each content type actually lives (cheat sheet)

For Anil's reference — knowing where each thing lives helps you
describe edits precisely:

```
src/Pages/Work/_shared/
  ├── ipMonetizationData.js          ← /work/ip-monetization page
  ├── smmManagementData.js           ← /work/smm-management page
  ├── contentCreatedData.js          ← /work/content-created page
  └── marketingCampaignsData.js      ← /work/marketing-campaigns page

src/Pages/Solutions/<slug>/<Slug>.jsx
  ├── YouTubeCreators                ← /solutions/youtube-creators
  ├── OttPlatforms                   ← /solutions/ott-platforms
  ├── MusicLabels                    ← /solutions/music-labels
  └── ... 7 more

src/content/blog/*.md                ← all markdown blog posts

src/components/Footer/CocomaFooter.jsx   ← footer copy
src/components/header/header.jsx          ← header menu structure

src/components/SingleVideo/CredentialsStrip/CredentialsStrip.jsx
  ← "Why teams keep coming back" credentials block (defaults; can
     be overridden per-page via props in the data files above)

src/components/SingleVideo/HireOrJoin/HireOrJoin.jsx
  ← "Hire Cocoma / Join Cocoma" closing-CTA fork (legacy;
     replaced on /work/* pages by per-page closingCta data)
```

## Admin patches workflow — Anil previews, Satyam ships

Pearl uses Satyam's Laravel admin (`admin.cocomadigital.com`) for
routine catalog content + blog posts. The admin works out of the
box but lacks five small conveniences: auto-slug from title,
preview button, paste-as-plain-text, required-field guard, and
one-click sticker visual blocks. Rather than ask each admin user
to install something, we patch the admin server-side once — Pearl
logs in and the helpers are just there.

**The flow mirrors how Anshu reviews React changes:**

```
1. Anil + Claude write a patch in this repo (admin-patches/*.js)
2. Anil opens admin-patches/preview.html locally → tests → approves
3. Push the branch
4. Anil sends Satyam admin-patches/INSTALL.md
5. Satyam reviews + drops the file into the Laravel admin
6. Pearl's next admin login = helpers visible. Zero install for her.
```

**Where each thing lives:**

| File | Purpose |
|---|---|
| `admin-patches/cocoma-admin-helpers.js` | The actual patch — single JS file Satyam adds via `<script>` tag |
| `admin-patches/preview.html` | Local preview Anil opens (file://) to see the helpers running against a mock form |
| `admin-patches/INSTALL.md` | Two-step install brief for Satyam |

**For Anil — how to preview locally:**

Just double-click `admin-patches/preview.html` in Finder, or paste
this URL into Chrome:

```
file:///Users/anilmahato/Codes/cocomadigital.com/admin-patches/preview.html
```

The page mirrors the admin form (same field names, same Summernote
WYSIWYG) and auto-loads the helper JS. Click around, try the
snippet buttons, type a title and tab out to watch the slug
auto-fill. If it looks good, push the branch and forward
`INSTALL.md` to Satyam.

**What the helpers do:**

| Helper | What it solves |
|---|---|
| Auto-slug from title | Pearl doesn't have to hand-kebab-case every title. Won't overwrite a slug she typed manually. |
| Preview on site button | One click opens `cocomadigital.com/blog/<slug>` in a new tab. No more save → switch tabs → paste URL. |
| Paste-as-plain-text | Pastes from Word / Google Docs / Notion lose their messy HTML. Editor stays clean. |
| Required-field guard | If title / slug / category are empty at save, a confirm prompt appears. Pearl can still override. |
| Sticker snippet buttons | Six one-click buttons drop the visual blocks documented in `docs/CONTENT_BRIEF.md` straight into the editor. |

**No data leaves the browser.** Pure client-side enhancement.
No database changes. Reverting = deleting one `<script>` tag.

## Status tracking

We don't have a board today. Track in chat or send me a "what's
in flight?" message and I'll list:
- Drafts you've sent me but haven't asked me to ship yet
- Posts shipped this week
- Anything blocked on you (review pending)

When the cadence picks up (>3 posts/week) we'll add a
`docs/CONTENT_STATUS.md` file with a simple in-flight / shipped
table.

## Cadence target

Pick what's realistic. Suggested baselines:

| Type | Suggested cadence | Why |
|---|---|---|
| Founder POV essay | 1/week | What AI engines (ChatGPT, Claude, Perplexity) cite when prospects ask "leading YouTube studio in India" |
| SEO long-tail article | 2/week | Catches search intent for "how to monetize Bollywood music on YouTube" type queries |
| Case study | 1/2 weeks | Each /work/* category gets one detailed case per month |
| Hero copy edits | as needed | When you spot something off |

You don't need to hit cadence on day one. The pipeline scales
with whatever pace Pearl + you set.

## Migration plan to Next.js + CMS

When the Next.js migration happens (separately planned), this
pipeline migrates cleanly:
- Markdown blog posts port natively to Next's MDX support
- Work / Solutions data files become Sanity (or whatever CMS
  is picked) schemas
- The "describe-the-change-and-Claude-edits" pattern stays
  useful for ad-hoc copy tweaks even after the CMS is live

So whatever we ship now isn't throwaway.

---

**Last updated:** 2026-05-02 (when this doc landed)
