/**
 * Content model for /services/podcast-editing-and-growth-services.
 *
 * Hand-authored, not API-driven. This page is the canonical money page
 * for podcast production + growth, so the copy is version-controlled and
 * reviewed rather than editable from the admin — a static route segment
 * takes precedence over /services/[slug], which is what overrides the
 * older database-authored version of this page.
 *
 * SOURCING RULE (do not relax): every number on this page must be
 * traceable to something Cocoma already publishes. The studio-wide
 * figures below are the ones on the homepage and about page. They are
 * deliberately labelled as studio-wide — they are channel and video
 * numbers, NOT podcast-specific numbers, and must never be presented as
 * podcast results.
 */

export interface TrustStat {
  value: string;
  label: string;
}

export interface Stage {
  id: string;
  step: string;
  name: string;
  promise: string;
  detail: string;
  capabilities: string[];
}

export interface ServiceCard {
  title: string;
  body: string;
}

export interface AudienceCard {
  title: string;
  body: string;
}

export interface MonthRow {
  deliverable: string;
  volume: string;
  detail: string;
}

export interface ProcessStep {
  step: string;
  name: string;
  body: string;
}

export interface Faq {
  q: string;
  a: string;
}

/* Studio-wide credentials. Source: cocomadigital.com homepage hero and
   footer tagline, already public. Framed on-page as studio-wide so no
   reader can mistake them for podcast metrics. */
export const TRUST_STATS: TrustStat[] = [
  { value: "12B+", label: "Organic views driven" },
  { value: "35,000+", label: "Videos produced" },
  { value: "45M+", label: "Subscribers built" },
  { value: "7 years", label: "Operating from Mumbai" },
];

export const SIGNATURE_LINE =
  "Most podcast companies produce episodes. Cocoma builds the operating system behind a successful podcast.";

export const HERO = {
  eyebrow: "Podcast production & growth",
  h1: "Podcast Editing & Growth Services",
  sub:
    "We turn one recording into a multi-platform growth engine: YouTube episodes, platform-native clips, thumbnails, publishing and analytics — operated as one system.",
  primaryCta: { label: "Get a free podcast audit", href: "#podcast-audit" },
  secondaryCta: { label: "See how it works", href: "#signal-to-scale" },
};

/* Production math, presented as Cocoma's own estimate rather than as a
   cited industry statistic — we have no source we can attribute. */
export const PROBLEM_STATS = [
  {
    value: "4–8 hrs",
    label: "of post-production hide inside every 30 minutes you record",
    body:
      "Cutting, cleaning, colour, captions, clip selection, thumbnails, notes, uploads. The recording is the cheapest part of a podcast.",
  },
  {
    value: "60+",
    label: "pieces of content a week is what serious shows now ship",
    body:
      "An episode is no longer the unit of output. Episodes, cutdowns, vertical clips, carousels and a newsletter all come from the same session.",
  },
  {
    value: "1",
    label: "editor cannot carry that load — a system can",
    body:
      "Hiring one more editor buys you throughput for a month. A production system with defined roles, templates and SLAs is what holds at volume.",
  },
];

export const STAGES: Stage[] = [
  {
    id: "align",
    step: "01",
    name: "Align",
    promise: "Decide what the show is actually for before a single cut is made.",
    detail:
      "Most shows are formatted before anyone decides what they are for, which is why they drift. Align happens once, before production, and it is the stage that makes every later decision cheap: when the goal, the audience and the pillars are written down, choosing a title or cutting a segment stops being a matter of opinion. Shows that skip this stage usually end up with an archive rather than an asset.",
    capabilities: [
      "Business goal — leads, authority, sponsorship, product pull-through",
      "Audience definition and competitive positioning",
      "Show architecture: format, length, cadence, segment structure",
      "Content pillars that map to what the business needs to be known for",
    ],
  },
  {
    id: "engineer",
    step: "02",
    name: "Engineer",
    promise: "Build the craft layer that decides whether anyone watches.",
    detail:
      "Two shows can record identical conversations and perform completely differently, and the gap is almost always craft. Packaging decides whether anyone clicks; the first thirty seconds decide whether they stay; pacing decides whether they finish. Engineer turns those into repeatable systems — template-driven edits, hook structures, thumbnail-and-title pairs — so quality stops depending on which editor happened to pick up the file.",
    capabilities: [
      "Retention-first editing — pacing, dead-air removal, visual rhythm",
      "Hooks and cold opens built from the strongest moment in the session",
      "Thumbnail and title systems, tested as matched pairs",
      "A visual language that stays consistent across every surface",
    ],
  },
  {
    id: "amplify",
    step: "03",
    name: "Amplify",
    promise: "One recording becomes everything the week needs.",
    detail:
      "A single recording contains far more usable content than one episode. Amplify is the production factory that extracts it: the full episode for YouTube and audio platforms, roughly a dozen vertical clips cut and captioned for the platform each one is going to, plus notes, transcript, chapters and a newsletter draft. Everything ships from one session, on one calendar, with one team accountable for it.",
    capabilities: [
      "Full episode, edited for YouTube and audio platforms",
      "Around 12 platform-native clips cut for Shorts, Reels and TikTok",
      "Show notes, transcript, chapters and a newsletter draft",
      "Publishing to YouTube, Instagram, TikTok, LinkedIn, Facebook and X",
    ],
  },
  {
    id: "optimize",
    step: "04",
    name: "Optimize",
    promise: "Measure in four layers, then change something specific.",
    detail:
      "Reporting that stops at a screenshot changes nothing. We separate the funnel into four layers because each one fails differently and each has a different fix: weak impressions is a discovery problem, weak click-through is a packaging problem, early drop-off is an editing problem, and traffic that never converts is a positioning problem. Reading them separately is what turns a monthly report into a decision.",
    capabilities: [
      "Discovery — impressions, traffic sources, suggested-video pickup",
      "Packaging — click-through rate on thumbnail and title pairs",
      "Consumption — retention curves, average view duration, drop-off points",
      "Business — subscribers, enquiries, sponsor conversations",
    ],
  },
];

export const SERVICES: ServiceCard[] = [
  {
    title: "Video podcast editing",
    body:
      "Multicam editing with speaker-aware cutting, colour and sound balanced across angles. Captions, lower thirds and branded elements applied from a template system so every episode looks like the same show.",
  },
  {
    title: "Audio editing & mastering",
    body:
      "Noise, room tone, plosives and filler words removed. Levels matched across speakers and mastered to platform loudness targets so the episode sounds right on headphones, car speakers and phone alike.",
  },
  {
    title: "Short-form clipping",
    body:
      "Moments chosen for a reason, not scrubbed at random. Each clip is reframed vertically, captioned, hooked in the first second and cut to what Shorts, Reels and TikTok each reward.",
  },
  {
    title: "Thumbnails & packaging",
    body:
      "Thumbnail and title designed together as one decision. Variants built for A/B testing so packaging becomes a measured experiment rather than a matter of taste.",
  },
  {
    title: "Show notes, SEO & transcripts",
    body:
      "Episode titles, descriptions, chapters and timestamps written for search as well as for listeners. Full transcripts for accessibility, for repurposing, and because search engines and AI assistants read text.",
  },
  {
    title: "Publishing & channel management",
    body:
      "Scheduling, uploads, metadata, playlists, end screens and community posts handled across YouTube and the social ring. Podcast channel management as an ongoing operation, not a hand-off.",
  },
  {
    title: "Dubbing & localization",
    body:
      "Podcast repurposing across languages, drawing on the transcreation work Cocoma already runs in 20+ languages — so a show built for one market can open in several.",
  },
  {
    title: "Analytics & growth reporting",
    body:
      "A monthly scorecard across discovery, packaging, consumption and business outcomes. Every report ends in decisions for the next month, not a wall of screenshots.",
  },
];

export const AUDIENCES: AudienceCard[] = [
  {
    title: "Founders & creators with a show",
    body:
      "You record consistently and the back end is the bottleneck. You want the episode, the clips and the packaging handled to a standard, on a schedule you can plan a business around.",
  },
  {
    title: "Brands running podcasts as marketing",
    body:
      "The podcast has to earn its budget. That means it is measured against pipeline and brand search, given a real content calendar, and treated as a distribution channel rather than a side project.",
  },
  {
    title: "OTT platforms & media networks",
    body:
      "Multi-show operations, large back catalogues and localization across markets. This is the work Cocoma has done longest — the studio's channel and catalogue operations were built for entertainment platforms at exactly this scale.",
  },
];

export const MONTH_ROWS: MonthRow[] = [
  {
    deliverable: "Full episodes",
    volume: "4",
    detail: "Multicam edit, audio master, captions, chapters and thumbnail",
  },
  {
    deliverable: "Platform-native clips",
    volume: "48",
    detail: "Roughly 12 per episode, reframed and captioned per platform",
  },
  {
    deliverable: "Thumbnails with A/B variants",
    volume: "8",
    detail: "Two packaging routes per episode, tested and reported on",
  },
  {
    deliverable: "Stories & carousels",
    volume: "Per calendar",
    detail: "Episode launch beats and evergreen pulls from the back catalogue",
  },
  {
    deliverable: "Show notes, transcripts & newsletter",
    volume: "4 sets",
    detail: "SEO-written notes, full transcript and a newsletter draft per episode",
  },
  {
    deliverable: "Publishing",
    volume: "Full",
    detail: "YouTube, Instagram, TikTok, LinkedIn, Facebook and X",
  },
  {
    deliverable: "Growth scorecard",
    volume: "1",
    detail: "Four-layer review ending in decisions for the following month",
  },
];

export const PROCESS: ProcessStep[] = [
  {
    step: "01",
    name: "Free podcast audit",
    body:
      "We review the show as it stands — packaging, retention, publishing cadence, back catalogue and where attention is being lost. You get the findings whether or not you work with us.",
  },
  {
    step: "02",
    name: "Engine build",
    body:
      "Strategy, show architecture, edit and thumbnail templates, naming conventions, publishing calendar and the baseline benchmarks we will measure against. This is the part most shows never had.",
  },
  {
    step: "03",
    name: "Operate & grow",
    body:
      "Production runs to an agreed turnaround SLA while the optimization loop runs monthly: read the four layers, change something specific, measure the change.",
  },
];

export const FAQS: Faq[] = [
  {
    q: "What do podcast editing and growth services cost?",
    a:
      "Pricing depends on format and volume — whether the show is video or audio-only, how many camera angles, how many episodes a month, how many clips per episode, and whether publishing and localization are included. Cocoma quotes per show after the free audit, because quoting before seeing the footage and the cadence produces a number that has to be revised later. The audit gives you the scope and the number together.",
  },
  {
    q: "What are your turnaround times?",
    a:
      "Turnaround is agreed as an SLA before work starts and is written into the engagement, so you can plan a publishing calendar around it rather than chasing an update. The SLA depends on format and volume; it is set during the engine-build stage and then held.",
  },
  {
    q: "Do you work on video podcasts, audio-only, or both?",
    a:
      "Both. Audio-only shows get editing, mastering, notes, transcripts and audio-led clips. Video shows get everything audio does, plus multicam editing, thumbnails, packaging tests and the full short-form ring. Most shows we build for are video-first because that is where discovery now happens.",
  },
  {
    q: "Why does YouTube matter so much for podcasts?",
    a:
      "YouTube is a search and recommendation engine, not just a hosting platform. A podcast that lives only in audio apps depends almost entirely on people already knowing it exists. On YouTube, packaging and retention decide whether the platform shows the episode to people who have never heard of the show — which is the difference between a back catalogue that compounds and one that sits still.",
  },
  {
    q: "How do you measure success?",
    a:
      "In four layers. Discovery: impressions and where traffic comes from. Packaging: click-through rate on thumbnail and title. Consumption: retention curve and average view duration. Business: subscribers, enquiries and sponsor conversations. We report on all four monthly and each report ends in specific decisions. We do not promise view counts or subscriber numbers — those are outcomes, not deliverables. What we commit to is output volume, turnaround, and a tested packaging and retention process.",
  },
  {
    q: "Where is the team based, and do you cover US and EU hours?",
    a:
      "The studio is in Andheri West, Mumbai. The team works with international clients and maintains an overlap window with US and European working hours for reviews and live calls; production itself runs on the agreed SLA rather than on your clock.",
  },
  {
    q: "Who owns the channel, the accounts and the project files?",
    a:
      "You do, always. Channels and social accounts stay in your ownership with access granted to us, never the other way round. Project files, templates and assets are yours and are handed over on request. Nothing about the engagement is designed to make leaving difficult.",
  },
  {
    q: "Can you work with our existing editor or in-house team?",
    a:
      "Yes. In several engagements Cocoma runs the parts a small team cannot hold at volume — packaging, clipping, publishing operations, localization — while the in-house editor keeps the main edit. The system matters more than who holds each seat.",
  },
  {
    q: "What happens to our back catalogue?",
    a:
      "It is usually the fastest win available. Existing episodes already contain clip-worthy moments, and old packaging can be re-tested without recording anything new. The audit flags which back-catalogue episodes are worth re-cutting or re-packaging first.",
  },
  {
    q: "How do we start?",
    a:
      "Send the show link through the audit form below. We review it and come back with findings, a recommended shape for the engine, and pricing for the scope that fits. No obligation attached to the audit.",
  },
];
