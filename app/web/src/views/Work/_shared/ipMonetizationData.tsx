// @ts-nocheck
/**
 * Page content for /work/ip-monetization
 *
 * Plug-in data for <WorkCategoryPage />. Same shape gets
 * reused for the other three /work/* category pages
 * (content-created, smm-management, marketing-campaigns).
 *
 * Renamed from socialMonetizationData → ipMonetizationData
 * because "IP monetization" more accurately captures the
 * scope: monetizing content IP, channel networks, and brand
 * assets across YouTube + OTT + music platforms — not just
 * "social media". Public route also moved from
 * /work/social-monetization → /work/ip-monetization with a
 * client-side redirect from the old slug for safety.
 *
 * Anil: every value here is meant to be edited by you. Stats
 * are seeded with VERIFIED Cocoma facts (60 team, 7+ years,
 * 70% recurring, 35K+ videos) so nothing here is fabricated.
 * Case-study metrics are intentionally generic until you have
 * real numbers — once you do, swap the metrics array for each
 * project and the cards re-render with no code change.
 *
 * Case-study images are optional. When `image` is omitted, the
 * card renders a yellow sticker placeholder with the client
 * name centred — designed to look intentional, not broken, so
 * the page ships clean today and gets richer as imagery lands.
 */
import {
  /* Audience-card + methodology-pillar icons. Sticker yellow
     chips, applied as small visual anchors so each text block
     gets a glanceable category cue instead of reading as a
     wall of text. FaSyncAlt/FaTv/FaChartLine were used by the
     credentials strip's pills array (now dropped — see comment
     on `credentials` below). FaSearchDollar + FaHandshake
     stayed because methodology pillars 01 and 03 still need
     them. */
  FaCoins,
  FaLayerGroup,
  FaPlay,
  FaBullhorn,
  FaSearchDollar,
  FaSlidersH,
  FaHandshake,
  FaInfinity,
} from "react-icons/fa";

export const ipMonetizationData = {
  meta: {
    title:
      "IP Monetization — Our Work · Cocoma Digital",
    description:
      "How Cocoma turns entertainment IP into recurring revenue. 60-person Mumbai studio, 7+ years monetizing content across YouTube, OTT, and music platforms. 70% recurring partnerships.",
    path: "/work/ip-monetization",
  },

  /* Schema.org Service description for this category page.
     Plugged into a block inside WorkCategoryPage so
     AI engines + search crawlers see one consistent entity
     across all four /work/* pages. */
  schema: {
    name: "IP Monetization",
    description:
      "Recurring revenue infrastructure for entertainment IP — channel ops, ad revenue optimization, brand partnerships, label syncs.",
    serviceType:
      "IP monetization, content monetization, ad revenue optimization, channel management",
  },

  hero: {
    eyebrow: "Our Work · IP Monetization",
    /* Title is split into prefix + highlighted + suffix so the
       second sentence gets the brand-yellow swatch behind it.
       Two-clause format reads as a partnership pact: "you do
       what you're good at, we do what we're good at". Much
       sharper than "we turn audiences into revenue streams". */
    title: {
      prefix: "You make content.",
      highlighted: "We bring the money.",
      suffix: "",
    },
    subtitle:
      "60-person Mumbai studio. $600K+ generated for partners on YouTube alone in 2025. We handle monetization end-to-end — your channels stay focused on creative, we run the business layer underneath.",
    /* $600K leads as the strongest social-proof number on the
       page. Other stats follow: recurring %, years, team size.
       "videos delivered" dropped from this slot — IP monetization
       is about revenue produced, not video count. */
    stats: [
      { value: "$600K+", label: "generated on YouTube (2025)" },
      { value: "70%", label: "recurring partnerships" },
      { value: "7+", label: "years monetizing IP" },
      { value: "60", label: "in-house team" },
    ],
  },

  /* "Who benefits from this" — situation-based filter that
     answers the prospect's "is this for me?" question early,
     before they read deep into case studies. Each card pairs
     a recognisable creator-side pain point (title) with the
     Cocoma-side outcome (description). 2-up grid desktop,
     1-up mobile. Reuses the data shape across the other 3
     /work/* pages — each one swaps in its own audience copy. */
  audience: {
    heading: "Who benefits from this",
    items: [
      {
        icon: FaCoins,
        title:
          "You make great content but the money doesn't follow",
        description:
          "We build the monetization infrastructure underneath your audience — ad ops, channel management, and the partnership pipeline that turns views into recurring revenue.",
      },
      {
        icon: FaLayerGroup,
        title:
          "Your IP lives across platforms with scattered revenue",
        description:
          "YouTube + OTT + music + sync — we unify the operational layer across every platform your IP runs on, so revenue lands in one pipeline instead of four.",
      },
      {
        icon: FaPlay,
        title: "Your channels are maxed on ad revenue",
        description:
          "Brand integrations, sync deals, sponsor placements, premium-tier strategy — the full revenue stack on top of platform ads, not instead of them.",
      },
      {
        icon: FaBullhorn,
        title:
          "Your audience trusts you but no brands have called",
        description:
          "We open Cocoma's 7-year network of labels, brands, sponsors, and sync partners. The pipeline you don't have to build alone.",
      },
    ],
  },

  /* Case studies — first entry renders as the FEATURED hero
     card, subsequent entries fill the 3-up grid below. To
     promote / demote a case study, just reorder the array.
     Adding more entries scales the grid automatically.

     Theme is OTT / streaming / content-discovery platforms,
     reflecting where Cocoma has actually monetized work. The
     last entry is a placeholder — Anil to swap with the next
     real partner story. */
  caseStudies: [
    /* ────────────── 1. FEATURED CASE STUDY ────────────── */
    {
      slug: "amazon-mx-player",
      client: "Amazon MX Player",
      category: "Streaming Platform",
      image: null, // sticker placeholder until real imagery lands
      imageAlt: "Amazon MX Player monetization case study",
      oneliner:
        "Audience-to-revenue infrastructure for one of India's largest streaming platforms",
      story:
        "Channel ops, ad revenue optimisation, and brand-partnership pipeline across the Amazon MX Player content network. The brief was structural, not tactical: build infrastructure that monetizes consistently month over month — not one-off spikes from viral titles.",
      metrics: [
        { value: "Multi-property", label: "operations" },
        { value: "Recurring", label: "revenue model" },
        { value: "Long-term", label: "partnership" },
      ],
    },
    /* ────────────── 2-N. GRID CASE STUDIES ──────────────
       Amazon's MX Player acquisition (2024) collapsed what
       used to be two separate Cocoma engagements into one
       entity, so the standalone "MX Player" grid card was
       removed to avoid reading like we don't track partner
       changes. The "[Next streaming partner]" placeholder
       card was also dropped — better to ship a tighter grid
       than pad with placeholders. */
    {
      slug: "imdb",
      client: "IMDb",
      category: "Media Platform",
      image: null,
      imageAlt: "IMDb content monetization",
      oneliner: "Content monetization on a global media platform",
      story: "",
      metrics: [{ value: "Global", label: "monetization" }],
    },
    {
      slug: "best-reality-show",
      client: "Best Reality Show",
      category: "Content Franchise",
      image: null,
      imageAlt: "Best Reality Show monetization",
      oneliner: "Show franchise monetization + recurring runway",
      story: "",
      metrics: [{ value: "Franchise", label: "+ runway" }],
    },
    {
      slug: "web-series-analyst",
      client: "Web-Series Analyst",
      category: "Content Series",
      image: null,
      imageAlt: "Web-Series Analyst monetization",
      oneliner: "Niche content monetization at scale",
      story: "",
      metrics: [{ value: "Niche", label: "scale ops" }],
    },
  ],

  /* The four-pillar approach. Title + short body. Numbered
     01-04 to match the visual rhythm of the homepage's
     ExploreServices category numbering. */
  methodology: [
    {
      number: "01",
      icon: FaSearchDollar,
      title: "We figure out what your IP is worth",
      description:
        "Audit + monetization mix + ad placement. What is the channel actually worth, and what's the shortest path to that ceiling?",
    },
    {
      number: "02",
      icon: FaSlidersH,
      title: "We tune what's already paying you better",
      description:
        "RPM and CPM tuning, watch-time science, CTR levers. We measure what improvements actually move revenue, not just views.",
    },
    {
      number: "03",
      icon: FaHandshake,
      title: "We bring the brands and sync deals",
      description:
        "Brand deals, label syncs, sponsor integrations. 7+ years means we know who pays what for what kind of audience.",
    },
    {
      number: "04",
      icon: FaInfinity,
      title: "We compound the recurring revenue",
      description:
        "Subscriber engine plus recurring revenue moats. The goal is monetization that compounds month over month — not one-off spikes.",
    },
  ],

  /* CredentialsStrip dropped from this page entirely.
     Iteration history (Anil's reviews):
       1. Original — 4 stat counters + 5 operational pills.
          3 of 4 stats duplicated the hero (70% / 7+ / 60),
          so the row read as filler.
       2. Pills-only — stats: null + heading "How we operate".
          Tighter, but the operational claims overlapped with
          what audience cards (Cocoma's network, partnership
          pipeline) and methodology pillars (audit, tune,
          brands+sync, compound) already said.
       3. Dropped entirely — hero stats + studio-life band +
          trusted-by marquee + closing CTA already do the
          credibility crescendo. The strip became redundant.
     `credentials: null` tells <WorkCategoryPage /> to skip the
     <CredentialsStrip /> render entirely (other /work/* pages
     that don't pass `credentials` still get the component's
     video-production defaults — backwards compatible). */
  credentials: null,

  /* "Inside the studio" trust band — sits between methodology
     and credentials so the reader, having just absorbed the
     four-pillar system, sees the actual humans + room behind
     it. Pulls 4 photos from the shared /gallery data file via
     getFeaturedPhotos() (so a single content update flows to
     /about-us, /gallery, AND every /work/* page that opts in).
     Cap at 4 in the JSX shell so the row stays a tight strip,
     not a feed. Omit this block to skip the section. */
  studioLife: {
    heading: "Where the monetization happens",
    description:
      "60 specialists, one Mumbai studio. The team behind every channel, partnership, and revenue line you see above.",
    ctaText: "See more from the studio",
    ctaTo: "/gallery",
  },

  /* Closing CTA — single decisive card at the bottom of the
     page. Earlier draft echoed the hero line verbatim ("You
     make content. We bring the money.") as a "bookend" — but
     on a page where the reader has just seen that line in the
     hero, the verbatim repeat read as filler, not framing.
     The hero is the brand promise; the closing is the
     decisive ask, so they should do different jobs. Action-
     led heading + map/find/show body matches the founder-
     direct voice and gives the conversion moment its own
     identity. Replaces the previous generic <HireOrJoin />
     fork (whose "Join Cocoma" card was off-topic for a
     portfolio page aimed at content owners, not job seekers). */
  closingCta: {
    heading: "Let's audit your monetization.",
    description:
      "15-minute discovery call with Anil + a senior strategist. We'll map your current revenue, find the gaps, and show you what compounds.",
    buttonText: "Book a discovery call",
    buttonTo: "/ScheduleMeeting",
  },

  /* Partner testimonial intentionally omitted per
     CONTENT_BRIEF.md rule (skip attributed quotes for now —
     anonymised "[Major OTT platform]" placeholders read as
     fabricated to a careful reader). When a real, named
     partner explicitly approves being quoted, add a
     `partnerQuote: { text, attribution }` block here and the
     <WorkCategoryPage /> shell will render it automatically. */
};
