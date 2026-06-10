// @ts-nocheck
/**
 * Page content for /work/content-created (mounted via the
 * ContentCreated component, NOT WorkCategoryPage — because the
 * page's centerpiece is the existing 125+ item creative-house
 * grid pulled from the admin API at runtime, not a fixed list
 * of case-study cards).
 *
 * Same data shape as ipMonetizationData / smmManagementData
 * MINUS the `caseStudies` block, which is rendered by the
 * existing <CreativeHouseProject /> grid instead. Hero +
 * audience + methodology + credentials + partnerQuote +
 * closingCta wrap the grid with the polished WorkCategoryPage
 * visual language.
 */
import {
  FaPenNib,
  FaUsers,
  FaPalette,
  FaMicrophone,
  FaLanguage,
} from "react-icons/fa";

export const contentCreatedData = {
  meta: {
    title: "Content Created — Our Work · Cocoma Digital",
    description:
      "How Cocoma turns briefs into shipped content at scale. 60-person Mumbai studio. 35,000+ videos delivered. Editors, designers, motion artists, scriptwriters — all in-house, all under one roof.",
    path: "/work/content-created",
  },

  schema: {
    name: "Content Created",
    description:
      "Full-stack content production for entertainment brands — scripting, editing, motion graphics, sound, multilingual delivery — all in-house.",
    serviceType:
      "Content production, video editing, motion graphics, scriptwriting, multilingual content delivery",
  },

  hero: {
    eyebrow: "Our Work · Content Created",
    /* Bookend pact — "you bring the brief, we make the content"
       is the inverse of the IP Monetization page (where the
       client makes content). Here the client provides the
       brand brief, Cocoma owns every step of creative
       production. Closing CTA at the bottom echoes the same
       sentence so the page reads as a single arc. */
    title: {
      prefix: "You bring the brief.",
      highlighted: "We make the content.",
      suffix: "",
    },
    subtitle:
      "60-person Mumbai studio shipping 35,000+ videos for entertainment brands. Editors, designers, motion artists, scriptwriters, sound — all in-house, all on the same project. From script to delivered cut, every step under one roof.",
    stats: [
      { value: "35K+", label: "videos delivered" },
      { value: "60", label: "specialists in-house" },
      { value: "70%", label: "recurring partnerships" },
      { value: "7+", label: "years shipping content" },
    ],
  },

  /* "Who benefits from this" — situations that map to the
     content-production gap. Each card surfaces a creator-side
     pain (no team, contractor juggling, can't scale, can't
     hold quality at volume) and answers with the in-house
     full-stack capability that solves it. */
  audience: {
    heading: "Who benefits from this",
    items: [
      {
        title:
          "Your in-house creative team is one person plus freelancers",
        description:
          "60-person studio under one roof: editors, designers, motion artists, scriptwriters, sound — all on payroll, all on the same project, all in your brand voice.",
      },
      {
        title: "You're juggling five contractors per project",
        description:
          "One team handles every step from brief to delivered cut. One project manager, one editorial standard, one Slack channel — not five.",
      },
      {
        title: "You need creative volume, not one-offs",
        description:
          "35,000+ videos shipped. Proof we can run an engine at sustained pace, not just hit a single great creative and miss the next ten.",
      },
      {
        title: "You need pace AND polish",
        description:
          "Most studios that scale on quantity drop on quality. Cocoma's been delivering both for 7+ years — daily volume with the polish your brand actually deserves.",
      },
    ],
  },

  methodology: [
    {
      number: "01",
      title: "We start with your brief, not our template",
      description:
        "Every project begins with your brand mission. No reused decks, no recycled scripts, no off-the-shelf creative. The work is built for you, from your brand outward.",
    },
    {
      number: "02",
      title: "We bring the full creative team",
      description:
        "Scriptwriters, editors, designers, motion artists, sound engineers — all in-house, all on the same project, all on payroll. No contractor handoffs, no quality drift between roles.",
    },
    {
      number: "03",
      title: "We ship at the pace you set",
      description:
        "Daily, weekly, or campaign-mode. We adapt to your release schedule, not the other way around. Capacity scales on demand without dropping the editorial bar.",
    },
    {
      number: "04",
      title: "We tune the next cut from the last one",
      description:
        "Every deliverable gets reviewed against the brief and the data. The next cut bakes in what worked. Continuous improvement, not set-and-forget.",
    },
  ],

  /* CredentialsStrip override — content-production framing.
     Lead stat is the verified Cocoma number (35K+ videos)
     since it's the proof point most relevant to a content-
     production page. Pills cover the full creative stack
     under one roof. */
  /* CredentialsStrip — stats dropped since they repeat the hero
     stats (35K+ / 60 / 70% / 7+) and read as filler. Pills
     retained — they describe the full creative stack which
     isn't in the hero. */
  credentials: {
    heading: "Inside the creative stack",
    stats: null,
    pills: [
      { icon: FaPenNib, text: "Scripting + concept" },
      { icon: FaUsers, text: "Editing + post-production" },
      { icon: FaPalette, text: "Motion + animation" },
      { icon: FaMicrophone, text: "Sound + voiceover" },
      { icon: FaLanguage, text: "Multilingual delivery" },
    ],
  },

  /* Partner testimonial removed per CONTENT_BRIEF rule —
     "[Major OTT platform]" anonymised attribution reads as
     fabricated. Section returns when a real named partner
     approves a quote. */

  /* Closing CTA — hero "You bring the brief. We make the content."
     stays as brand promise. Closing was an exact verbatim
     repeat, reads as filler. Action-led replacement matches
     the pattern across /work/* family. */
  closingCta: {
    heading: "Let's audit your creative pipeline.",
    description:
      "15-minute discovery call with Anil + a senior strategist. We'll review your current creative ops, find the gaps, and show you what 60 specialists in-house can do.",
    buttonText: "Book a discovery call",
    buttonTo: "/ScheduleMeeting",
  },
};
