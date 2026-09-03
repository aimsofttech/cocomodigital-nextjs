# Media taxonomy — why nine categories became five stored fields

**Author:** Anil (with Claude) · **Reviewer:** Anshu · **Date:** 2026-09-03
**Extends:** `MEDIA_ASSET_INDEX.md`, already merged

Schema only. Nothing here changes existing behaviour, no route is added,
and every new field defaults to a value that keeps current queries working.

---

## What was asked for

Nine categories to organise the library: People, Technology, Service,
Industry, Genre, Client type, Culture, Department, Infrastructure.

They are the right vocabulary — that genuinely is how the team asks for
media. The question was whether they should be nine stored tag sets.

## Why they are not nine stored tag sets

Designed out in full, the nine came to roughly **110 segments**. Measured
against the library they were meant to organise:

| | |
|---|---|
| rows in the vault | 973 |
| distinct files (duplicates collapsed) | 661 |
| unique images actually described | 178 |
| of those, `rights: own` | 78 |
| own **and** usable | **61** |

Roughly two chips per publishable photograph. At least eight segments
resolved to zero assets. A filter row where most options return nothing is
not a taxonomy — it is a reason to go back to scrolling, which is the Box
problem we are trying to leave.

Three collisions decided the shape:

**Headcount is not identity.** `solo / pair / small-group / whole-team` sat
in the same facet as `founder` and `on-camera-talent`. Two orthogonal axes
in one list. `people` is already an integer column — it wants a range
filter, not four chips.

**One pixel cue fired five chips in five facets.** A legible video timeline
on a monitor meant `edit-bay` **and** `video-editing` **and** `edit`
department **and** `crew-at-work` **and** `editing-timeline`. The described
library contains three unique edit-floor photographs.

**Department was Service relabelled.** Six of eleven segments had 1:1 twins
firing on identical triggers. `mediaSearches.js` now returns the identical
filter for both, which makes the duplication explicit instead of hiding it
in two vocabularies that drift.

---

## What this adds

### `MediaJob` — new collection

Three of the nine cannot be seen in a photograph. A frame of an editor at a
timeline says nothing about the show's genre, the client's type, or the
vertical. That knowledge lives in the job, and the asset inherits it.

Without this collection those three filters can never be populated by
anyone — not a model, not a reviewer looking at the image. **A permanently
empty filter is worse than no filter,** because results that are missing
everything still look complete.

`client` and `clientType` are separate on purpose: a credentials deck needs
"MX Player", a capability page needs "streaming platform". Collapsing them
loses one of those queries.

`nda` is the flag that keeps unreleased title artwork off a Cocoma page.

### `MediaAsset` — five added fields

| field | filled by | why |
|---|---|---|
| `shows` | vision model, unaided | The only classification readable from the frame. Everything else is a query over it. |
| `assetType` | vision model | Separates a photograph from a logo, a deck slide or a blank template. ~40% of the library is vector art no scene-based facet fits. |
| `job` | set at upload | Carries industry, genre, client, clientType. |
| `consent` | a person | `rights` is who owns the file; `consent` is who is *in* it. Not the same question — we own the copyright in a photograph of a stranger. |
| `setBy` | write path | Which fields a human decided, so a later describe run cannot silently overwrite review. |

`consent` has `minors` as its own value rather than folding into
`sensitive`, because it needs a different decision, not a stricter one.
The describe worker already flagged one such photograph in this library by
noticing a child in frame; there was nowhere to record what was decided.

### `lib/mediaSearches.js`

The nine categories as queries. Adding a tenth way to ask is a function
here, not a migration.

---

## Three questions for you

**1. Is `setBy` as a Map right, or should provenance be its own collection?**
A Map is cheap and keeps the decision next to the value. An audit
collection would tell you *when* and *who*, which a Map does not. I went
with the cheap version because nothing currently writes it at all — but you
are the one who will maintain it.

**2. Should `shows` be an enum?**
It is a free `[String]` right now, which lets the describe worker emit a
value nobody planned for. That is either useful discovery or the start of
the 631-value free-text tag sprawl the current vault already has. An enum
is safer and less forgiving.

**3. Where should the human write path live?**
This is the real blocker and it is not schema. `vault.py` has seven
commands and every one is read-only. Seven of the nine categories need "a
person confirms this" and there is currently no way for a person to do so.
The admin panel is the obvious home, but that is your build, not mine.

---

## Not done here, deliberately

- No routes or controllers. Schema first, so the shape can be argued
  before anything depends on it.
- No migration. Every field defaults to `unknown` / `[]` / `null`, so
  existing documents and existing queries behave exactly as they do now.
- No backfill of `shows`. That comes from a describe run, and turning the
  describer on is still a separate decision waiting on a provider choice.
