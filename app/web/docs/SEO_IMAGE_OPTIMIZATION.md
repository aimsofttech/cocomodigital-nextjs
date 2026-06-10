# Image optimization roadmap

Status: **deferred / scoped**. The four-step SEO arc that landed in
late April 2026 (helmet/per-route metadata → sitemap+robots+org JSON-LD
→ per-page Service/BreadcrumbList/FAQPage schemas → react-snap
prerendering) intentionally did NOT touch images. This file captures
what's left so it doesn't get lost between commits.

## Current state — frontend grep audit

| Metric | Value |
|---|---|
| Total `<img>` tags across `src/` | **147** |
| Tags with explicit `loading=` attr | **0** |
| Files with `<img>` but no `loading=` anywhere | **45** |
| Heaviest static asset (`/public/Images/`) | **2.1 MB** (`home/coming-soon.png`) |
| Static assets >500 KB | **3** (coming-soon.png, cocoma-banner.jpg, section-01.png) |
| Static assets >100 KB | **8** |

## Current state — S3 audit (REAL numbers, 2026-05-02)

Grounded in the one-off S3 bucket audit captured on 2026-05-02.

| Metric | Value |
|---|---|
| **Total objects in bucket** | **12,509** |
| **Total bucket size** | **3.99 GB** |
| Average object size | 334.9 KB |
| Heaviest individual object | **42.1 MB** (`service-image/1752155058_06.jpg` — yes, a JPG) |
| Top-3 heaviest are all JPGs at 42.1 MB | Same image uploaded 3× under different timestamps |

**Format breakdown** — where the bytes actually live:

| Extension | Count | Total size | Avg |
|---|---:|---:|---:|
| `.jpg` | 10,043 | **1.54 GB** | 161 KB |
| `.mp4` | 675 | **1.41 GB** | 2.1 MB |
| `.png` | 1,420 | **748.8 MB** | 540 KB ← heavy |
| `.gif` | 29 | **245.2 MB** | **8.5 MB avg** ← egregious |
| `.webp` | 106 | 11.2 MB | 108 KB ← properly compressed |
| `.avif` | 1 | 40.5 KB | — |

Modern formats (WebP / AVIF) are **<1% of objects**. Converting
the JPG/PNG/GIF mass to WebP would shrink bandwidth dramatically.

**Heaviest folders** (top 5):

| Prefix | Count | Total size |
|---|---:|---:|
| `marketing-house-content-items` | 7,624 | 809.3 MB |
| `single-service-video` | 85 | **520.0 MB** |
| `group-service-item-image` | 1,128 | **498.2 MB** |
| `service-image` | 309 | **428.5 MB** |
| `service-portfolio-video` | 131 | 224.7 MB |

`group-service-item-image` averages **452 KB per image** —
on /services/:slug pages with 6 cards each, that's ~2.7 MB
per page from card thumbnails alone. Card images don't need
to be 452 KB; CDN-served WebP at width 400 would be ~30 KB.

## Three high-impact, low-effort wins (data confirms)

1. **The 29 GIFs averaging 8.5 MB each.** Converting them to MP4
   (or animated WebP) saves ~200 MB instantly with no quality loss
   for users. GIFs are the wrong format for 2026; MP4 plays
   identically and weighs ~1/10th.
2. **Duplicate file detection.** Multiple identical filenames
   uploaded under different timestamps (e.g.
   `1752494699_Promo-Trailer-1.mp4`, `1752494770_Promo-Trailer-1.mp4`,
   `1752494945_Promo-Trailer-1.mp4` — three copies × 16.4 MB =
   49 MB wasted on one file). The full audit report lists more.
   Likely 200-500 MB recoverable from dedupe alone.
3. **Three 42 MB JPGs in `service-image/`.** Same image uploaded
   3× under different timestamps. These are NOT legitimate file
   sizes for a JPG — they should be ~500 KB each. Either
   uncompressed source files leaked through admin upload, or no
   compression pass. ~125 MB recoverable just by re-encoding.

## Why this matters for SEO + LLM discoverability

1. **Core Web Vitals (LCP/CLS) are a ranking signal.** Largest
   Contentful Paint above 2.5s drops Google's quality score. A 2.1 MB
   hero PNG on a Mumbai 4G connection blows past that single-handedly.
2. **Lighthouse / PageSpeed Insights** is what most agency-shopping
   prospects (and our own competitors) check. A score below 70 reads
   as "amateur" before they even scroll.
3. **AI engines that DO crawl** (PerplexityBot, ClaudeBot) time out on
   slow pages and fall back to whatever they cached weeks ago. Fast =
   fresh in their index.
4. **Below-the-fold images load eagerly today.** Every page ships
   every image on first paint, even ones the user never scrolls to.

## The four parallel workstreams

These don't have to ship together. Any one of them moves the needle.

### 1. `loading="lazy"` sweep (low effort, high coverage)

Add `loading="lazy"` + `decoding="async"` to every `<img>` that isn't
above-the-fold on first paint. Above-the-fold images (hero banners,
header logo, first card grid) should get `loading="eager"` and
`fetchpriority="high"` instead — explicit eager beats implicit eager
because it signals priority to the browser preloader.

Rule of thumb:
- Header logo, top-of-page hero, first visible card row → `eager` + `fetchpriority="high"`
- Everything else → `lazy` + `decoding="async"`

Files needing the sweep (45 files, see audit grep). Mechanical change,
safe to do in one PR. Should be done by a person, not codemod, because
the eager/lazy decision is per-component.

**Effort:** half a day.
**Wins:** ~40-60% reduction in initial bytes on most pages.

### 2. CDN + auto-format for admin S3 images

The admin panel uploads to S3 at whatever resolution the editor used
(often 4000×3000 phone photos). The `<img>` tag renders at 200×150.
That's ~50× more bytes than needed.

Two options, in order of preference:

**Option A: Cloudflare Images** (recommended)
- $5/mo for 100k images stored, $1 per 100k delivered
- Drop-in: replace `<img src={s3Url}>` with
  `<img src={`https://imagedelivery.net/<account>/${s3Url}/w=400`}>`
- Auto-converts to WebP/AVIF based on `Accept` header
- Auto-resizes via URL params (no preset variants needed)
- One env var (`REACT_APP_CLOUDFLARE_IMAGES_HASH`) + a small wrapper component

**Option B: AWS CloudFront + Lambda@Edge**
- Native to existing AWS account, no new vendor
- More setup (Lambda function to resize on the fly + cache rules)
- Anshu/Satyam own this; needs DevOps coordination

Either way, the React-side change is a single `<CDNImage src={apiUrl} width={400}/>` wrapper used in place of every `<img>` that takes an admin URL. 30-ish components touch admin images; the wrapper localizes the change.

**Effort:** 1-2 days infra + 1 day component sweep.
**Wins:** 70-90% reduction on admin-image bytes; automatic WebP for
all browsers that support it (every modern browser does).

### 3. Static `/public/Images/` WebP conversion

The static images we ship in the repo (logos, illustrations,
section banners) should exist as WebP next to the PNG/JPG, with a
`<picture>` element or build-time replacement.

The four heavyweights:
- `home/coming-soon.png` (2.1 MB) → ~150 KB WebP
- `service/cocoma-banner.jpg` (820 KB) → ~120 KB WebP
- `section-01.png` (612 KB) → ~80 KB WebP
- `singleServiceImage.png` (380 KB) → ~50 KB WebP

Two paths:
- **Build-time:** add `imagemin-webp` as a postbuild step that walks
  `build/Images/` and emits `.webp` siblings. Then a `<picture>` with
  `<source type="image/webp" srcset="...">` falls back to the PNG.
- **One-time manual:** run `cwebp -q 80 input.png -o input.webp`
  locally, commit both, swap to `<picture>`. Simpler but requires
  re-running every time someone updates an image.

Recommend build-time. Effort: half a day to wire, automatic from
then on.

**Effort:** half a day.
**Wins:** ~90% byte reduction on those 8 heaviest static assets.

### 4. `srcset` for hero / banner images

After Workstream 3, the hero images are WebP but still ship at their
upload resolution to every device — same 2000px-wide image to a 320px
phone screen.

`<picture>` with multiple `<source srcset="img-400w.webp 400w, img-800w.webp 800w, img-1600w.webp 1600w" sizes="...">` lets the browser pick the right size.

Realistically only worth doing for the ~10 hero/banner images that
appear above the fold on key pages (Home Section01, About hero, each
Solutions hero, each Single Service hero). For everything else,
loading="lazy" + WebP is enough.

**Effort:** 1 day for the 10 heroes.
**Wins:** another 30-50% on hero LCP for mobile.

## Recommended sequencing

1. **Workstream 1 first** — purely mechanical, no infra dependency,
   ships in one PR. Visible improvement to PageSpeed score the same
   day. Do this when there's a quiet half-day.
2. **Workstream 3 second** — also no infra dependency, half-day of
   build-config work. Hits the 8 biggest static assets.
3. **Workstream 2 third** — biggest absolute win but needs infra
   call (Cloudflare account or CloudFront/Lambda). Loop in Anshu +
   Satyam before starting.
4. **Workstream 4 last** — diminishing returns, only worth it after
   1-3 are in place.

## What this is NOT in scope for

- Replacing the React Image components themselves (e.g. moving to
  next/image). We're on CRA, not Next, and a framework migration is
  a quarter-long project not a weekend hack.
- Hand-cropping every existing admin upload. Workstream 2's CDN
  resizing handles this automatically without touching the originals.
- Re-encoding videos. Out of scope for image optimization; covered
  separately if/when we look at the homepage hero video.

---

Last updated: 2026-04-30, alongside the parent-category Service
schema landing on `/services/:slug`.
