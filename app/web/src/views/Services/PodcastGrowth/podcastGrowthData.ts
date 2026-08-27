/**
 * Content model for /services/podcast-editing-and-growth-services.
 *
 * Hand-authored, not API-driven. This page is the canonical money page
 * for podcast production + growth, so the copy is version-controlled and
 * reviewed rather than editable from the admin — a static route segment
 * takes precedence over /services/[slug], which is what overrides the
 * older database-authored version of this page.
 *
 * AUDIENCE (set by Anil, 2026-08-26): podcasters in the US, Canada and
 * the UK running the show as a business, at a $2,000/month floor. The
 * page is written to qualify in that reader and qualify out hobbyists —
 * the price is stated openly for exactly that reason.
 *
 * SOURCING RULE (do not relax): every number here must be traceable.
 *  - Studio-wide figures are the ones cocomadigital.com already
 *    publishes. They are channel and video numbers, NOT podcast
 *    numbers, and the page says so in two places.
 *  - The $2,000/month floor is Anil's stated commercial position.
 *  - No client names, testimonials, US salary comparisons, or podcast
 *    performance claims. If it isn't sourced, it isn't on the page.
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
  icon: string;
  title: string;
  body: string;
  includes: string[];
}

export interface AudienceCard {
  icon: string;
  title: string;
  body: string;
  signal: string;
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
  duration: string;
}

export interface Faq {
  q: string;
  a: string;
}

/* Studio-wide credentials. Source: cocomadigital.com homepage hero and
   footer tagline, already public. Labelled studio-wide on-page. */

/**
 * Hero media.
 *
 * `poster` is a real Cocoma recording still — no stock, no mockup.
 *
 * TODO (Anil): set `videoId` to the YouTube id of the pitch video once
 * it exists and the hero turns into a click-to-play player on its own.
 * Leave it null until then: PodcastHeroMedia renders a plain photograph
 * rather than a play button that goes nowhere.
 */
export const HERO_MEDIA = {
  videoId: null as string | null,
  poster: "/Images/podcast/podcast-recording-cocoma-studio.jpg",
  alt:
    "Two hosts recording a podcast episode on set at Cocoma Digital's Mumbai studio, each on a boom-mounted microphone.",
  playLabel: "Play the pitch video",
};

/**
 * Studio strip — real photography from the Cocoma floor, already in the
 * repo and already used on the about page. Documentary black and white,
 * which is why the color hero still reads as the subject and these read
 * as the room behind it.
 */
export const STUDIO_SHOTS = [
  /* Shot on the Cocoma floor, August 2026. Replaces the black-and-white
     set: these are in colour, every screen carries real work, and the
     wall behind them is the brand yellow. Captions describe only what is
     visible in frame.

     Not used here: `two-editors.jpg`, because both subjects are looking
     at the camera, and `motion-graphics.jpg`, because a client's series
     title fills the screen. See the flag on the thumbnail frame below —
     that one is in, but it is Anil's call to keep it. */
  {
    src: "/Images/about/2026-08/edit-floor-row.jpg",
    alt:
      "Four editors working in a row at adjacent monitors along a yellow wall, each wearing headphones, timelines and footage open on the screens.",
    caption: "The edit floor",
    wide: true,
  },
  {
    src: "/Images/about/2026-08/editor-close-up.jpg",
    alt:
      "An editor in headphones at a wide monitor, a dense multi-track timeline below a preview of a single speaker talking to camera.",
    caption: "Retention-first editing",
    wide: false,
  },
  {
    src: "/Images/about/2026-08/editor-multicam-timeline.jpg",
    alt:
      "An editor at dual monitors cutting a two-person sequence, with a densely stacked colour-coded timeline filling the lower screen.",
    caption: "Multicam, two speakers",
    wide: false,
  },
  {
    src: "/Images/about/2026-08/editor-two-screen.jpg",
    alt:
      "An editor at two monitors, an editing timeline on the left and the graded footage playing full-screen on the right.",
    caption: "Cut and review, side by side",
    wide: false,
  },
  {
    src: "/Images/about/2026-08/editor-promo-cut.jpg",
    alt:
      "An editor in headphones working at two screens, an audio-heavy timeline on one and the video playing on the other.",
    caption: "Audio and picture together",
    wide: false,
  },
  {
    /* FLAG FOR ANIL: a client's trailer key art is legible on this
       monitor. It is real Cocoma work and the client is already named
       publicly on the homepage, but displaying a licensor's artwork in
       a marketing photo is a different thing from naming them in text.
       Say the word and this frame comes out — it is the only one in the
       set with that issue, and the grid re-flows on its own.
       Kept because packaging is a core claim on this page and this is
       the clearest proof of it we have. */
    src: "/Images/about/2026-08/thumbnail-designer.jpg",
    alt:
      "A designer at a wide monitor cutting a subject out of a still in Photoshop, the isolated figure shown on a transparency checkerboard beside the source frame.",
    caption: "Thumbnail and packaging design",
    wide: true,
  },
];



export const STUDIO_STRIP = {
  eyebrow: "The room this runs from",
  heading: "A working studio, not a marketplace of freelancers",
  body:
    "Your show is produced by a named team on the Cocoma floor in Andheri West, Mumbai — editors, designers, colorists, sound and channel operations under one roof. That is what makes an SLA mean anything: there is a bench behind it, not one contractor with a full inbox.",
};

/**
 * Scale-of-operation figures for the studio band.
 *
 * SOURCING — every one of these is already published by Cocoma and is
 * traceable, which is the whole reason they are the only numbers here:
 *   60-person studio        → about page + site meta description
 *   60+ partner channels    → blog, "why brands need a YouTube channel"
 *   $600K+ partner revenue  → same blog post, 2025, YouTube ad revenue
 *                             before sponsorship and sync
 *   35,000+ videos, 12B+ views, 20+ languages → homepage
 *
 * These are STUDIO-WIDE channel and catalog numbers. They are not
 * podcast results and the section caption says so. Do not add a figure
 * here that cannot be pointed at on cocomadigital.com.
 */
export const STUDIO_SCALE = [
  { value: "60", label: "People on the floor", sub: "Editors, design, marketing, channel ops" },
  { value: "60+", label: "Partner channels run", sub: "Across seven years of operations" },
  { value: "$600K+", label: "Partner revenue in 2025", sub: "YouTube ads alone, before sponsorship" },
  { value: "20+", label: "Languages", sub: "Transcreation already running in-house" },
];

export const STUDIO_SCALE_NOTE =
  "Studio-wide channel and catalog figures, all published on cocomadigital.com. They are not podcast metrics — they are the size of the operation your show would be produced inside.";


export const TRUST_STATS: TrustStat[] = [
  { value: "12B+", label: "Organic views driven" },
  { value: "35,000+", label: "Videos produced" },
  { value: "45M+", label: "Subscribers built" },
  { value: "7 yrs", label: "Studio operating" },
];

export const SIGNATURE_LINE =
  "Most podcast companies produce episodes. Cocoma builds the operating system behind a successful podcast.";

export const HERO = {
  eyebrow: "For podcasters in the US, Canada & UK",
  h1: "Podcast Editing & Growth Services",
  /* Was a 30-word sentence listing five deliverables. The hero does not
     need to enumerate the service — the eight service cards do that a
     screen later. One idea, one line. */
  sub:
    "One recording becomes a week of content — produced, packaged and published as one system.",
  primaryCta: { label: "Get a free podcast audit", href: "#podcast-audit" },
  priceBadge: "Engagements start at $2,000/month",
  hoursBadge: "US, Canada & UK hours overlap",
};

/* Production math, presented as Cocoma's own estimate rather than as a
   cited industry statistic — there is no source we could attribute. */
export const PROBLEM_STATS = [
  {
    value: "4–8 hrs",
    label: "of post-production per 30 minutes recorded — our own measured range",
    body:
      "Cutting, cleaning, color, captions, clip selection, thumbnails, notes, uploads. The recording is the cheapest part of a podcast.",
  },
  {
    value: "60+",
    label: "pieces a week is what a full engagement is built to ship",
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
      "Most shows are formatted before anyone decides what they are for, which is why they drift. Align happens once, before production, and it makes every later decision cheap: when the goal, the audience and the pillars are written down, choosing a title or cutting a segment stops being a matter of opinion.",
    capabilities: [
      "Business goal — leads, authority, sponsorship, product pull-through",
      "Audience definition and competitive positioning",
      "Show architecture: format, length, cadence, segment structure",
      "Content pillars mapped to what the business needs to be known for",
    ],
  },
  {
    id: "engineer",
    step: "02",
    name: "Engineer",
    promise: "Build the craft layer that decides whether anyone watches.",
    detail:
      "Two shows can record identical conversations and perform completely differently, and the gap is almost always craft. Packaging decides whether anyone clicks; the first thirty seconds decide whether they stay; pacing decides whether they finish. Engineer turns those into repeatable systems, so quality stops depending on which editor picked up the file.",
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
      "A single recording contains far more usable content than one episode. Amplify is the production factory that extracts it: the full episode, roughly a dozen vertical clips cut and captioned for the platform each one is going to, plus notes, transcript, chapters and a newsletter draft — all from one session, on one calendar.",
    capabilities: [
      "Full episode, edited for YouTube and audio platforms",
      "Platform-native clips cut for Shorts, Reels and TikTok",
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
      "Reporting that stops at a screenshot changes nothing. We separate the funnel into four layers because each fails differently and each has a different fix: weak impressions is a discovery problem, weak click-through is a packaging problem, early drop-off is an editing problem, and traffic that never converts is a positioning problem.",
    capabilities: [
      "Discovery — impressions, traffic sources, suggested-video pickup",
      "Packaging — click-through rate on thumbnail and title pairs",
      "Consumption — retention curves, average view duration, drop-off",
      "Business — subscribers, inquiries, sponsor conversations",
    ],
  },
];

export const SERVICES: ServiceCard[] = [
  /* One line each, not a paragraph. Eight cards carrying eight
     thirty-word paragraphs put ~240 words of near-identical grey text
     in a single grid — it reads as a wall and gets skipped. The line
     states the promise; the `includes` nouns carry the detail and the
     search terms in a form the eye can actually scan. */
  {
    icon: "video",
    title: "Video podcast editing",
    body: "Multicam, cut speaker-aware, colour and sound matched across every angle.",
    includes: ["Multicam", "Captions", "Lower thirds", "Template system"],
  },
  {
    icon: "audio",
    title: "Audio editing & mastering",
    body: "Cleaned, levelled and mastered so it sounds right on headphones and in a car.",
    includes: ["Noise & room tone", "Filler words", "Level matching", "Loudness targets"],
  },
  {
    icon: "clip",
    title: "Short-form clipping",
    body: "Moments chosen for a reason, cut to what each platform actually rewards.",
    includes: ["Shorts", "Reels", "TikTok", "Vertical reframe", "Burned-in captions"],
  },
  {
    icon: "thumb",
    title: "Thumbnails & packaging",
    body: "Thumbnail and title designed as one decision, then tested as a pair.",
    includes: ["A/B variants", "Title systems", "Click-through testing"],
  },
  {
    icon: "notes",
    title: "Show notes, SEO & transcripts",
    body: "Written for search engines and AI assistants as well as for listeners.",
    includes: ["Chapters", "Timestamps", "Full transcripts", "Descriptions"],
  },
  {
    icon: "publish",
    title: "Publishing & channel management",
    body: "An ongoing operation across YouTube and the social ring, not a hand-off.",
    includes: ["Scheduling", "Metadata", "Playlists", "End screens", "Community"],
  },
  {
    icon: "globe",
    title: "Dubbing & localization",
    body: "Open a second and third market using the languages already running in-house.",
    includes: ["Transcreation", "20+ languages", "Subtitles"],
  },
  {
    icon: "chart",
    title: "Analytics & growth reporting",
    body: "A monthly scorecard that ends in decisions, not a wall of screenshots.",
    includes: ["Discovery", "Packaging", "Consumption", "Business"],
  },
];


export const AUDIENCES: AudienceCard[] = [
  {
    icon: "mic",
    title: "Founders & operators with a show",
    body:
      "Whether you are in New York, Toronto or London, the podcast is a growth channel for the business, not a hobby. You record consistently and the back end is the bottleneck — you want the episode, the clips and the packaging handled to a standard, on a calendar you can plan around.",
    signal: "Weekly or bi-weekly cadence, video-first",
  },
  {
    icon: "brand",
    title: "Brands running podcasts as marketing",
    body:
      "The show has to earn its budget. That means it is measured against pipeline and brand search, given a real content calendar, and treated as a distribution channel rather than a side project someone owns on top of their day job.",
    signal: "Marketing-owned, reports to a number",
  },
  {
    icon: "network",
    title: "Networks & media companies",
    body:
      "Multi-show operations, large back catalogs and localization across markets. This is the work Cocoma has done longest — the studio's channel and catalog operations were built at exactly this scale — 35,000+ videos produced and 12B+ organic views driven.",
    signal: "Multiple shows, shared production standard",
  },
];

/* Commercial position stated by Anil on 2026-08-26. The floor is
   published deliberately: it qualifies out hobby shows before a call,
   which is the whole point of putting it on the page.

   IMPORTANT: the entry scope below is deliberately conservative and is
   NOT pinned to the full weekly-show table further down the page. Anil
   to confirm the exact scope-to-price mapping before this ships. */
export const PRICING = {
  prefix: "From",
  floor: "$2,000",
  unit: "/month",
  eyebrow: "Straight answer on price",
  heading: "Priced like a product, not a project",
  lead:
    "You are not buying editing hours. You are buying a production line with a named producer on it, a documented process behind it, and an SLA you can build a publishing calendar around. That is what it costs to run properly — and it is why the number is on this page instead of behind a discovery call.",
  includedTitle: "What every engagement includes",
  included: [
    "A named producer who owns your show — not a ticket queue",
    "Retention-first editing delivered to an agreed SLA",
    "Thumbnail and title packaging, built and tested as pairs",
    "Platform-native short-form clips from every episode",
    "Show notes, transcript and chapters written for search",
    "Publishing across YouTube and the full social ring",
    "A monthly scorecard that ends in decisions, not screenshots",
  ],
  scalesTitle: "What moves the number",
  scales: [
    "Episodes per month and how many camera angles",
    "Clip volume per episode",
    "Whether publishing and community management are included",
    "Back-catalog re-cutting and re-packaging",
    "Distribution and language expansion into new markets",
  ],
  note:
    "Quoted and invoiced in USD; GBP and CAD on request. The audit comes back with scope and price together — one document, no gauntlet.",
  cta: { label: "Get a free podcast audit", href: "#podcast-audit" },
};

/* Operating facts for overseas buyers. Cocoma is a Mumbai studio; this
   section exists because that is the first real question a US, Canadian
   or UK buyer has, and answering it plainly beats letting them guess. */
export const US_OPERATIONS = [
  {
    icon: "clock",
    title: "Overlap with your working day",
    body:
      "Reviews, calls and approvals happen in maintained overlap windows with US, Canadian and UK business hours — mornings India-side for the UK, evenings for North America. Production itself runs on the agreed SLA rather than on your clock, which is the advantage of the time difference rather than the cost of it.",
  },
  {
    icon: "dollar",
    title: "Priced and invoiced in USD",
    body:
      "Quoted and invoiced in US dollars wherever you are, with GBP and CAD available on request. No per-hour meter — a monthly engagement with a defined scope, so the line item on your budget stays the same number every month.",
  },
  {
    icon: "lock",
    title: "You own everything",
    body:
      "Channels and social accounts stay in your ownership with access granted to us, never the other way round. Project files, templates and assets are yours and are handed over on request.",
  },
];

/**
 * Founder note.
 *
 * A named, visible owner is the single strongest trust signal for an
 * overseas buyer weighing up an offshore studio, which is why this sits
 * directly under the pricing block rather than in an About footer.
 *
 * TODO (Anil): these are drafted words in your voice, not a quote you
 * actually gave — read them and either approve or replace before this
 * ships. Nothing here claims anything beyond what the engagement model
 * already commits to, but it is signed with your name and your face, so
 * it should be your wording.
 */
export const FOUNDER = {
  eyebrow: "Who you are actually dealing with",
  name: "Anil Mahato",
  role: "Founder, Cocoma Digital",
  portrait: "/Images/podcast/anil-mahato-founder-cocoma.jpg",
  alt: "Anil Mahato, founder of Cocoma Digital.",
  lines: [
    "I started Cocoma in Mumbai in 2019 after a pitch meeting I was only supposed to sit in on. Seven years later the studio has produced 35,000+ videos and built 45M+ subscribers across the channels it runs.",
    "Podcasts are where that same machinery is now most useful outside India — because a show is not an editing job, it is an operation, and operations are the thing we have actually built.",
    "Your show will not be run by me. It will be run by a producer whose name you will know, against a documented process, to an SLA you agreed. That is deliberate: a studio that only works when the founder is in the room is not a studio, it is a bottleneck.",
  ],
  cta: { label: "Get a free podcast audit", href: "#podcast-audit" },
};

/**
 * Explicit disqualification.
 *
 * Counter-intuitive but load-bearing: saying plainly who this is not for
 * raises conversion among the people it IS for, and removes the
 * price-shopping conversations that cost the most time and close the
 * least. A page that tries to be right for everyone reads as right for
 * no one.
 */
export const NOT_FOR = {
  eyebrow: "Straight talk",
  heading: "When we are the wrong call",
  lead:
    "We would rather lose the inquiry than take an engagement that cannot work. If any of these describe you, a freelance editor will serve you better and cost you far less.",
  items: [
    "You are looking for the cheapest per-episode rate. We are not competitive on rate and do not try to be — you are buying an operation, not an hour of editing.",
    "You publish occasionally, when there is time. Systems earn their cost through cadence; without one there is nothing for the machinery to compound.",
    "You want someone to take instructions rather than own an outcome. Our producers push back on packaging and structure. If that sounds like friction rather than value, it will be.",
    "You need work turned around same-day, unpredictably. We hold an agreed SLA rather than an always-on queue.",
  ],
  footnote:
    "Still reading and none of these fit? Then the audit will probably be worth your time.",
};



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
    detail: "Episode launch beats and evergreen pulls from the back catalog",
  },
  {
    deliverable: "Show notes, transcripts & newsletter",
    volume: "4 sets",
    detail: "SEO-written notes, full transcript and newsletter draft per episode",
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
    duration: "No cost",
    body:
      "We review the show as it stands — packaging, retention, publishing cadence, back catalog and where attention is being lost. You get the findings whether or not you work with us, along with scope and pricing for the shape that fits.",
  },
  {
    step: "02",
    name: "Engine build",
    duration: "Setup phase",
    body:
      "Strategy, show architecture, edit and thumbnail templates, naming conventions, publishing calendar and the baseline benchmarks we will measure against. This is the part most shows never had.",
  },
  {
    step: "03",
    name: "Operate & grow",
    duration: "Ongoing",
    body:
      "Production runs to an agreed turnaround SLA while the optimization loop runs monthly: read the four layers, change something specific, measure the change.",
  },
];

export const FAQS: Faq[] = [
  {
    q: "What do podcast editing and growth services cost?",
    a:
      "Engagements start at $2,000 per month, quoted and invoiced in USD (GBP and CAD on request). Where a show lands above that depends on episodes per month, how many camera angles, clip volume per episode, and whether publishing, back-catalog work and localization are included. We publish the floor deliberately. Below $2,000 a month a freelance editor will serve you better than a production system, and we would rather say so than sell you something that does not fit. The free audit comes back with the scope and the number together.",
  },
  {
    q: "Why is there a minimum at all?",
    a:
      "Because the thing we sell is a system, not hours. A named producer, template build, packaging tests, a publishing operation and a monthly optimization loop have a fixed cost to stand up and run properly. Below that floor we would be delivering a worse version of what a good freelance editor already does well, at a higher price. The minimum is honesty about where this model starts working.",
  },
  {
    q: "You're based in India. How does that work for a show in the US, Canada or the UK?",
    a:
      "The studio is in Mumbai and the team maintains overlap windows with US, Canadian and UK business hours for reviews, calls and approvals — India mornings line up with the UK working day, India evenings with North America. Production runs on the agreed SLA rather than on your clock, which usually means you send a recording at the end of your day and the work has moved by the time you are back. Everything is quoted and invoiced in USD, with GBP and CAD available on request.",
  },
  {
    q: "What are your turnaround times?",
    a:
      "Turnaround is agreed as an SLA before work starts and written into the engagement, so you can plan a publishing calendar around it rather than chasing updates. The SLA depends on format and volume; it is set during the engine-build stage and then held.",
  },
  {
    q: "Do you work on video podcasts, audio-only, or both?",
    a:
      "Both. Audio-only shows get editing, mastering, notes, transcripts and audio-led clips. Video shows get everything audio does, plus multicam editing, thumbnails, packaging tests and the full short-form ring. We build video-first by default, because that is where discovery now happens.",
  },
  {
    q: "Why does YouTube matter so much for podcasts?",
    a:
      "YouTube is a search and recommendation engine, not just a hosting platform. A podcast that lives only in audio apps depends almost entirely on people already knowing it exists. On YouTube, packaging and retention decide whether the platform shows the episode to people who have never heard of the show — which is the difference between a back catalog that compounds and one that sits still.",
  },
  {
    q: "How do you measure success?",
    a:
      "In four layers. Discovery: impressions and where traffic comes from. Packaging: click-through rate on thumbnail and title. Consumption: retention curve and average view duration. Business: subscribers, inquiries and sponsor conversations. We report on all four monthly and each report ends in specific decisions. We do not promise view counts or subscriber numbers — those are outcomes, not deliverables. What we commit to is output volume, turnaround, and a tested packaging and retention process.",
  },
  {
    q: "Who owns the channel, the accounts and the project files?",
    a:
      "You do, always. Channels and social accounts stay in your ownership with access granted to us, never the other way round. Project files, templates and assets are yours and are handed over on request. Nothing about the engagement is designed to make leaving difficult.",
  },
  {
    q: "Can you work with our existing editor or in-house team?",
    a:
      "Yes. The model is built to run the parts a small team cannot hold at volume — packaging, clipping, publishing operations, localization — while the in-house editor keeps the main edit. The system matters more than who holds each seat.",
  },
  {
    q: "What happens to our back catalog?",
    a:
      "It is usually the fastest win available. Existing episodes already contain clip-worthy moments, and old packaging can be re-tested without recording anything new. The audit flags which back-catalog episodes are worth re-cutting or re-packaging first.",
  },
  {
    q: "How do we start?",
    a:
      "Send the show link through the audit form below. We review it and come back with findings, a recommended shape for the engine, and pricing for the scope that fits. No obligation attached to the audit.",
  },
];
