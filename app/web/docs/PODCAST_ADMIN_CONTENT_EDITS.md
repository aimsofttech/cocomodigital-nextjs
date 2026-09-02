# Podcast page — content edits that must be made in the admin panel

**Page:** `/podcast-video-editing-marketing-services`
**Where:** Admin → Podcast → the page's own module
**Date:** 2026-09-03

---

## Why this file exists

Since the page became API-driven, **its copy lives in the database, not in
the repo.** `podcastFallback.ts` is served only when the API is unreachable.

That means a code change cannot alter a single word of the live page.
Verified rather than assumed: after changing the floor to `$2,500` in the
fallback, the rendered page still showed `$2,000` four times and `$2,500`
zero times, because the number came from the database.

So everything below is a **panel edit**. The matching values in
`podcastFallback.ts` have already been updated in code, so the two agree
during an outage — but that file is the safety net, not the source.

Field paths are from `GET /api/podcast-pages/podcast-video-editing-marketing-services`.

---

## 1. Price floor — $2,000 → $2,500

Anil's call: $2,500/month is the new minimum. **Four fields.**

| Field | From | To |
|---|---|---|
| `hero.priceBadge` | Engagements start at $2,000/month | Engagements start at **$2,500**/month |
| `pricing.floor` | $2,000 | **$2,500** |
| `ogCard.badgeOne` | From $2,000/month | From **$2,500**/month |
| `faqs[0].answer` | two mentions inside the answer | see below |

`faqs[0].answer` — replace both occurrences:

> Engagements start at **$2,500** per month, quoted and invoiced in USD (GBP and CAD on request). Where a show lands above that depends on episodes per month, how many camera angles, clip volume per episode, and whether publishing, back-catalog work and localization are included. We publish the floor deliberately. Below **$2,500** a month a freelance editor will serve you better than a production system, and we'd rather say so than sell you something that doesn't fit. The free audit comes back with the scope and the number together.

---

## 2. Studio figures — 50,000+ videos, 40M+ subscribers

12B+ organic views is unchanged. **Five fields.**

| Field | From | To |
|---|---|---|
| `trustStats[1].value` | 35,000+ | **50,000+** |
| `trustStats[2].value` | 45M+ | **40M+** |
| `founder.lines[0]` | …produced 35,000+ videos and 45M+ subscribers… | …produced **50,000+** videos and **40M+** subscribers… |
| `proof.paragraphs[1]` | …12B+ organic views, 35,000+ videos… | …12B+ organic views, **50,000+** videos… |
| `audienceCards[2].body` | …35,000+ videos produced and 12B+ organic views driven | …**50,000+** videos produced and 12B+ organic views driven |

> **Worth a second look before entering:** 45M+ → 40M+ is a *decrease*.
> Subscriber counts don't normally go down, so if this was meant to be
> 50M+ it should be caught here rather than after it ships.

**These figures are also hardcoded in 13 places elsewhere on the site**
(footer, About, Work, Solutions ×4, credentials strip, a blog post).
Those are already updated in code and ship with this branch — no panel
edit needed for them.

---

## 3. Signal-to-Scale — shorter stage paragraphs

Anil: the stages read as photo + line + paragraph + bullets, and the
paragraph is the part carrying too much. The promise line and the
capability bullets already make the argument, so these are cut roughly in
half. **209 words → 115.** Nothing factual is dropped.

**`stages[0].description` — Align** *(51 → 26 words)*

> Most shows get formatted before anyone decides what they're for. That's why they drift. Written down once, the goal and the pillars settle every later argument.

**`stages[1].description` — Engineer** *(52 → 27 words)*

> Two shows can record the same conversation and perform completely differently. The gap is craft — packaging decides who clicks, and the first thirty seconds decide who stays.

**`stages[2].description` — Amplify** *(54 → 30 words)*

> One recording holds far more than one episode. Amplify pulls it all out: the episode, a dozen captioned vertical clips, notes, transcript, chapters and a newsletter draft — from one session.

**`stages[3].description` — Optimize** *(52 → 32 words)*

> Reporting that stops at a screenshot changes nothing. We split the funnel into four layers because each fails differently: impressions is discovery, click-through is packaging, drop-off is editing, no conversion is positioning.

---

## 4. Americanization — already done, no action

Audited the live payload for British spellings: **none found.** The
earlier Americanization pass went in with the merged PR and was loaded
into the database, so `color`, `catalog`, `localization`, `the other way
around` are all correct as published.

Geography reads well too — US 3, Canada 4, Canadian, North American,
Eastern, Pacific, USD, CAD. No change needed.

---

## 5. Not a content edit — `scaleStats` is now unrendered

The 60 people / 60+ partner channels / $600K+ / 20+ languages strip was
removed from the studio band in code, because the credentials band near
the top already carries the studio's scale.

**Do not delete these rows in the admin.** They still arrive from the API
and are simply not rendered, so the strip can be restored by uncommenting
one block. Deleting them would throw the content away.

---

## 6. Before reviewing this page, check your OS accessibility settings

Three separate times during this work, the page looked broken to Anil and
was in fact behaving correctly — his machine has **Reduce Motion** and
**Reduce Transparency** switched on, and both change what this page shows:

| Setting | What it suppresses | Correct? |
|---|---|---|
| `prefers-reduced-motion` | The wrong-call video's autoplay | **Yes.** Controls now appear only when autoplay can't happen, so it's never a dead frame. |
| `prefers-reduced-motion` | Service card hover and scroll reveals | **Yes.** Motion is opt-out by design. |
| `prefers-reduced-transparency` | **All 8 service-card photographs** | **Yes** — but it means that band renders with no imagery at all on his screen. |

There was also one genuine bug of this shape, now fixed: a stray
`@media (prefers-reduced-motion: reduce)` rule pinned the Problem band's
backdrop to `opacity: 0.16`, which is why it read as almost black no
matter what the base rule said. Motion preferences should never control a
static image's opacity.

**So:** when judging how this page looks, either turn both settings off
temporarily, or check on a second machine. Otherwise the version being
reviewed is not the version most visitors get.

macOS: System Settings → Accessibility → Display → Reduce motion /
Reduce transparency.
