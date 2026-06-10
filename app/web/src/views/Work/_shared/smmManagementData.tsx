// @ts-nocheck
/**
 * Page content for /work/smm-management
 *
 * Plug-in data for <WorkCategoryPage />. Same shape as
 * ipMonetizationData; second of the four /work/* category
 * pages. Anil: every value here is meant to be edited — stats
 * marked with PLACEHOLDER comments need real numbers from you.
 */
import {
  FaCalendarAlt,
  FaComments,
  FaRocket,
  FaChartLine,
  FaUserTie,
  /* Audience + methodology icons added — sticker yellow chips
     on each text block. Reused playbook from
     /work/ip-monetization. All FA5-set (react-icons/fa) so
     they live in the same import. */
  FaPuzzlePiece,
  FaCompass,
  FaChartBar,
  FaFlag,
  FaPenNib,
  FaShareAlt,
  FaSearchPlus,
} from "react-icons/fa";

export const smmManagementData = {
  meta: {
    title: "SMM Management — Our Work · Cocoma Digital",
    description:
      "How Cocoma runs daily social media operations for entertainment brands. 60-person Mumbai studio managing channels across YouTube, Instagram, X, TikTok, and LinkedIn. 70% recurring partnerships.",
    path: "/work/smm-management",
  },

  schema: {
    name: "SMM Management",
    description:
      "Daily social media operations for entertainment brands — content calendar, brand voice, community management, cross-platform posting, performance reporting.",
    serviceType:
      "Social media management, community management, content calendar operations, multi-platform posting",
  },

  hero: {
    eyebrow: "Our Work · SMM Management",
    /* 360° framing — Cocoma owns the FULL social pipeline:
       brand vision → ideas → scripts → content → publishing
       → analytics → scaling. Hero pact reflects that scope:
       you set the mission, Cocoma runs every step. Closing
       CTA at the bottom echoes the same line. */
    title: {
      prefix: "You set the mission.",
      highlighted: "We run every step of social.",
      suffix: "",
    },
    subtitle:
      "End-to-end social media operations for entertainment brands. Ideas → scripts → content → publishing → analytics → scaling — every step inside your brand vision. 60-person Mumbai studio. 70% recurring partnerships.",
    stats: [
      // PLACEHOLDER — Anil: swap in your real monthly post
      // throughput. "5K+" is a guess that reads big without
      // being absurd; replace with verified ops volume.
      { value: "5K+", label: "posts shipped per month" },
      { value: "70%", label: "recurring partnerships" },
      { value: "7+", label: "years managing brand social" },
      { value: "60", label: "specialists in-house" },
    ],
  },

  /* "Who benefits from this" — situations that map to the
     360° gap. Each card surfaces a different point in the
     pipeline where brands typically break down (patchwork
     teams, ideation gap, dead dashboards, can't scale wins)
     and answers with the corresponding Cocoma capability. */
  audience: {
    heading: "Who benefits from this",
    items: [
      {
        icon: FaPuzzlePiece,
        title: "Your social team is a patchwork of contractors",
        description:
          "One studio, one brand voice, end-to-end ops. Ideation, scripting, production, publishing, and growth all under one roof — your brand mission stays intact at every step.",
      },
      {
        icon: FaCompass,
        title: "You have the brand vision but no execution engine",
        description:
          "Hand us the brief. We translate it into daily ideation, scripting, production, publishing — and the analytics + scaling layer that compounds over months.",
      },
      {
        icon: FaChartBar,
        title: "Your data lives in 5 dashboards no one acts on",
        description:
          "Monthly performance reviews tied to your brand mission. The metrics that change next month's calendar — not vanity, not screenshots in a deck.",
      },
      {
        icon: FaChartLine,
        title: "You're shipping content but not scaling what works",
        description:
          "We measure post-by-post, identify the patterns that drove the wins, and double down on the formats + topics + cadences that compound. Dead weight gets retired fast.",
      },
    ],
  },

  /* Case studies — clients per Anil: IMDb (featured), Amazon
     MX Player, Fatafat, MX Player, Sunit Morarjee, plus one
     placeholder slot for the next brand partner. To
     promote / demote a case study, just reorder the array. */
  caseStudies: [
    /* ────────────── 1. FEATURED CASE STUDY ────────────── */
    {
      slug: "imdb-social",
      client: "IMDb",
      category: "Media Platform",
      image: null,
      imageAlt: "IMDb social media management case study",
      oneliner:
        "End-to-end social ops for one of the world's largest media platforms",
      story:
        "Cocoma owns the full social pipeline for IMDb — ideation tied to the brand mission, scripting and production in-house, publishing daily across platforms, monthly performance reviews that feed back into next month's calendar. One team, one voice, every step.",
      metrics: [
        { value: "End-to-end", label: "pipeline" },
        { value: "Daily", label: "ideation → publishing" },
        { value: "Monthly", label: "performance reviews" },
      ],
    },
    /* ────────────── 2-6. GRID CASE STUDIES ────────────── */
    {
      slug: "amazon-mx-player-social",
      client: "Amazon MX Player",
      category: "Streaming Platform",
      image: null,
      imageAlt: "Amazon MX Player social management",
      oneliner: "Daily social ops across the content slate",
      story: "",
      metrics: [{ value: "Multi-property", label: "ops" }],
    },
    {
      slug: "fatafat-social",
      client: "Fatafat",
      category: "Bollywood Entertainment",
      image: null,
      imageAlt: "Fatafat social media operations",
      oneliner: "Daily-content social calendar at entertainment scale",
      story: "",
      metrics: [{ value: "Daily", label: "calendar" }],
    },
    {
      slug: "mx-player-social",
      client: "MX Player",
      category: "OTT Platform",
      image: null,
      imageAlt: "MX Player social media operations",
      oneliner: "Channel ops + community management at scale",
      story: "",
      metrics: [{ value: "Daily", label: "ops + community" }],
    },
    {
      slug: "sunit-morarjee-social",
      client: "Sunit Morarjee",
      category: "Personal Brand",
      image: null,
      imageAlt: "Sunit Morarjee personal brand social ops",
      oneliner: "Founder-led personal brand ops across platforms",
      story: "",
      metrics: [{ value: "Personal brand", label: "ops" }],
    },
    /* "[Next brand partner]" placeholder card removed — same
       anti-pattern as the streaming-partner placeholder dropped
       from /work/ip-monetization. Real partners append here. */
  ],

  /* Methodology pillars — explicit walkthrough of the 360°
     pipeline. Each step is one stop on the journey from brand
     vision in → scaled wins out. Reads like a process map so
     prospects know exactly what they're handing over. */
  methodology: [
    {
      number: "01",
      icon: FaFlag,
      title: "We start with your brand vision",
      description:
        "Mission statement, audience definition, brand voice doc. Everything downstream — every idea, script, post, reply — anchors here. Drift gets caught early because the source of truth is shared.",
    },
    {
      number: "02",
      icon: FaPenNib,
      title: "We turn ideas into scripts and content",
      description:
        "Weekly ideation tied to your release schedule. Scripts written for each platform's native format. Content production in-house — editors, designers, motion artists, captions, thumbnails — all under one team.",
    },
    {
      number: "03",
      icon: FaShareAlt,
      title: "We publish daily across every platform",
      description:
        "60-person team running the channels in shifts. Posts go out on time, formatted native to each platform. Community management 24/7 — comments answered, DMs triaged, escalations flagged.",
    },
    {
      number: "04",
      icon: FaSearchPlus,
      title: "We measure, learn, and scale the winners",
      description:
        "Post-by-post performance tracking. Monthly review surfaces the patterns that worked, retires the dead weight, and feeds insights back into next month's ideation. Compounding wins, not random spikes.",
    },
  ],

  /* CredentialsStrip dropped — stats duplicated hero numbers
     (70% / 7+ / 60), pills overlapped with audience +
     methodology messaging. credentials: null tells
     WorkCategoryPage to skip the strip entirely. */
  credentials: null,

  /* "Inside the studio" trust band — sits between methodology
     and credentials so the reader, having just absorbed the
     four-pillar 360° pipeline, sees the actual humans + room
     behind it. Photos pulled from shared /gallery data
     (getFeaturedPhotos), capped at 4 in the shell. */
  studioLife: {
    heading: "Where the social ops happen",
    description:
      "60 specialists, one Mumbai studio. The team behind every post, every comment reply, every monthly review you see above.",
    ctaText: "See more from the studio",
    ctaTo: "/gallery",
  },

  /* Partner testimonial removed — "[Major OTT platform]"
     anonymised attribution reads as fabricated. Returns when
     a real named partner approves a quote. */

  /* Closing CTA — hero "You set the mission. We run every step
     of social." stays as brand promise. Closing rewritten
     action-led to match /work/* pattern. */
  closingCta: {
    heading: "Let's audit your social pipeline.",
    description:
      "15-minute discovery call with Anil + a senior strategist. We'll map where your pipeline breaks down — ideation, scripting, publishing, analytics, scaling — and show you what end-to-end social looks like.",
    buttonText: "Book a discovery call",
    buttonTo: "/ScheduleMeeting",
  },
};
