# Podcast page — content edits that only the admin panel can make

**Page:** `/podcast-video-editing-marketing-services`
**Where:** Admin → Podcast
**Updated:** 2026-09-03

---

## Read this first

This page's copy lives in the **database**, not the repo. `podcastFallback.ts`
is served only when the API is unreachable, so **a code change cannot alter a
single word of the live page.**

Verified rather than assumed: after setting the floor to `$2,500` in the
fallback, the rendered page still showed `$2,000` four times and `$2,500`
zero times.

Everything below is therefore a panel edit. The fallback file has already been
updated in code to match, so the two agree during an outage.

---

## 1. Studio figures — now five stats

Anil's numbers. **Two edits, one new row.**

| Row | Now | Change to |
|---|---|---|
| Organic views driven | 12B+ | *(unchanged)* |
| Videos produced | 35,000+ | **50,000+** |
| Subscribers built | 45M+ | **40M+** |
| — | — | **NEW ROW:** `750+` / `Shows promoted` |
| Studio operating | 7 yrs | **7+ yrs** |

> **Two things to settle before entering these.**
>
> **40M+ is lower than the 45M+ currently published.** Anil confirmed it, so
> it goes in as given — but a public number moving *down* is the kind of thing
> worth being sure about, because someone will screenshot both.
>
> **750+ shows promoted is a new claim** and nothing else on the site
> supports it. Every other figure here is one Cocoma already publishes. Anil
> said it can be dropped if awkward — the honest default is to leave it out
> until there's something to point at, since this page's whole argument rests
> on not inflating anything. Five stats also crowd the row; four sit better.

Three prose fields repeat the old figures and need updating too:

- `founder.lines[0]` — "…produced **50,000+** videos and built **40M+** subscribers…"
- `proof.paragraphs[1]` — "…12B+ organic views, **50,000+** videos, **40M+** subscribers…"
- `audienceCards[2].body` — "…**50,000+** videos produced and 12B+ organic views driven"

---

## 2. Price floor — $2,000 → $2,500

**Four fields.**

| Field | Change to |
|---|---|
| `hero.priceBadge` | Engagements start at **$2,500**/month |
| `pricing.floor` | **$2,500** |
| `ogCard.badgeOne` | From **$2,500**/month |
| `faqs[0].answer` | both mentions → **$2,500** |

---

## 3. `problem.lead` — 87 words → 34

The diagram under it now makes this argument visually, so the paragraph only
has to set it up.

> Almost every show that stalls has the same problem. The conversation is
> good. Everything after the record button is not built to keep up — and it
> compounds quietly, until the show feels like a cost centre rather than a
> channel.

---

## 4. Stage descriptions — 209 words → 104

The promise line and the bullets already carry these. Plain, spoken, short.

**`stages[0].description` — Align**
> Most shows get formatted before anyone decides what they're for. That's why they drift. Write the goal down once and every later argument settles itself.

**`stages[1].description` — Engineer**
> Two shows can record the same conversation and land completely differently. That gap is craft — packaging decides who clicks, the first thirty seconds decide who stays.

**`stages[2].description` — Amplify**
> One recording holds far more than one episode. We pull all of it out: the episode, a dozen captioned clips, notes, transcript and a newsletter draft.

**`stages[3].description` — Optimize**
> Reporting that stops at a screenshot changes nothing. We split the funnel four ways, because each part fails differently and each has a different fix.

---

## 5. `audience.title` — plainer

"Built for shows that have to earn their budget" is doing too much work.

> **Who this is for**

---

## 6. `proof.paragraphs` — 128 words → 52, and less written-by-a-robot

The band now has a "Go and look" panel beside it with arrowed links, so the
prose only needs to be honest and get out of the way.

**`[0]`**
> We don't have podcast case studies yet. We could pretend otherwise, but you'd find out.

**`[1]`**
> What we do have is seven years of channel work — the figures at the top of this page. Those are catalog numbers, not podcast numbers, and we won't dress them up as podcast numbers. What carries over is the machinery: editing at volume, packaging that gets tested, publishing across platforms, and 20+ languages.

**`[2]`**
> Get on a call and we'll show you the work, and exactly what we'd run on your show.

---

## 7. Not a content edit — two collections are no longer rendered

`scaleStats` (60 people / 60+ channels / $600K+ / 20+ languages) and
`problemStats` (4–8 hrs / 60+ / 1 editor) still arrive from the API and are
deliberately not rendered — both had become repetition of other bands.

**Do not delete these rows.** Removing the markup is one uncommented block;
deleting the rows throws the content away.

---

## 8. Before you review this page, check your OS accessibility settings

Three times during this work the page looked broken and was behaving
correctly, because **Reduce Motion** and **Reduce Transparency** are on:

| Setting | What it suppresses |
|---|---|
| `prefers-reduced-motion` | The wrong-call video's autoplay; card hover and scroll reveals |
| `prefers-reduced-transparency` | **All eight service-card photographs** |

There was one genuine bug of this shape, now fixed: a stray
`@media (prefers-reduced-motion: reduce)` rule pinned the Problem backdrop to
`opacity: 0.16`. Motion preferences should never control a static image.

macOS: System Settings → Accessibility → Display.
