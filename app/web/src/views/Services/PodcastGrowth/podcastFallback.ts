import type { PodcastPageData } from "@/src/lib/podcast";
import { PODCAST_PAGE_SLUG } from "@/src/lib/podcast";

/**
 * Last-resort copy for /podcast-video-editing-marketing-services.
 *
 * The page is API-driven — everything below is editable from the admin panel's
 * Podcast module, and the same copy was loaded into the database through that
 * module's own API. This file is NOT the content source; it is the safety net
 * used only when the API is unreachable (which includes `next build`, where
 * apiGet short-circuits to null by design).
 *
 * That fallback is deliberate. This is the single ranking target for podcast
 * queries, so a blank page or a 404 during an API outage would be far worse
 * than serving the copy the page shipped with. It follows the same pattern the
 * three /services/<growth-page> routes already use for their SEO fallbacks.
 *
 * Once an editor changes something in the admin panel the database is the
 * truth, and this only ever appears during an outage — so treat it as the
 * launch copy, not as something to keep hand-editing.
 */
export const PODCAST_FALLBACK: PodcastPageData = {
  id: "fallback",
  slug: PODCAST_PAGE_SLUG,
  name: "Podcast Video Editing & Marketing Services",
  path: `/${PODCAST_PAGE_SLUG}`,
  pageUrl: `https://cocomadigital.com/${PODCAST_PAGE_SLUG}`,

  hero: {
    eyebrow: "For podcasters in the US, Canada & UK",
    /* Matches the URL and the <title>. Deliberately NOT the identical string
       to the admin-driven page at /services/podcast-editing-and-growth-services
       — two Cocoma pages with the same h1 would compete for the same query. */
    title: "Podcast Video Editing & Marketing Services",
    sub: "One recording becomes a week of content — produced, packaged and published as one system.",
    priceBadge: "Engagements start at $2,000/month",
    priceBadgeIcon: "dollar",
    hoursBadge: "US, Canada & UK hours overlap",
    hoursBadgeIcon: "clock",
    media: {
      videoId: null,
      videoSrc: null,
      poster: "/Images/podcast/podcast-recording-cocoma-studio.jpg",
      alt: "Two hosts recording a podcast episode on set at Cocoma Digital’s Mumbai studio, each on a boom-mounted microphone.",
      playLabel: "Play the pitch video",
    },
  },

  credentials: {
    signature:
      "Most podcast companies produce episodes. Cocoma builds the operating system behind a successful podcast.",
    caption:
      "Cocoma Digital, studio-wide, across seven years of channel and catalog work:",
  },

  problem: {
    title: "The recording is the cheapest part",
    lead: "Almost every show that stalls has the same shape of problem. The conversation is good, the guests are good, and nothing downstream of the record button is built to keep up. Episodes ship late or not at all, clips get made when someone has a spare afternoon, thumbnails are decided by whoever is nearest the file, and the back catalog sits untouched. None of that is a talent problem. It’s a capacity and systems problem, and it compounds quietly until the show feels like a cost center.",
    backgroundImage: "/Images/about/2026-08/edit-floor-row.jpg",
  },

  method: {
    eyebrow: "The method",
    title: "The Signal-to-Scale method",
    lead: "Four stages, run in order and then run again every month. Align sets the target, Engineer builds the craft, Amplify multiplies the output, Optimize decides what changes next.",
  },

  services: {
    eyebrow: "What we run",
    title: "Podcast production and growth services",
    lead: "Every piece below is run by the same team against the same templates. You can take the whole system or the parts your team can’t hold at volume.",
  },

  audience: {
    eyebrow: "Who it’s for",
    title: "Built for shows that have to earn their budget",
  },

  pricing: {
    eyebrow: "Straight answer on price",
    heading: "Priced like a product, not a project",
    prefix: "From",
    floor: "$2,000",
    unit: "/month",
    lead: "You’re not buying editing hours. You’re buying a production line with a named producer on it, a documented process behind it, and an SLA you can build a publishing calendar around. That’s what it costs to run properly, and it’s why the number is on this page instead of behind a discovery call.",
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
    note: "Quoted and invoiced in USD; GBP and CAD on request. The audit comes back with scope and price together — one document, no gauntlet.",
  },

  month: {
    eyebrow: "Output",
    title: "What a full month looks like",
    lead: "A weekly show running the complete system. This is deliverable volume at a full engagement. It isn’t a forecast of results, and it isn’t the entry tier. Your audit comes back with the scope that fits your cadence.",
    tableNote: "Monthly deliverables for a weekly podcast at a full engagement",
    columns: { deliverable: "Deliverable", volume: "Volume", detail: "Detail" },
  },

  notFor: {
    eyebrow: "Straight talk",
    heading: "When we’re the wrong call",
    lead: "We’d rather lose the inquiry than take an engagement that can’t work. If any of these describe you, a freelance editor will serve you better and cost you far less.",
    items: [
      "You’re looking for the cheapest per-episode rate. We’re not competitive on rate and don’t try to be — you’re buying an operation, not an hour of editing.",
      "You publish occasionally, when there’s time. Systems earn their cost through cadence; without one there’s nothing for the machinery to compound.",
      "You want someone who takes instructions and stops there. Our producers push back on packaging and structure, and if that sounds like friction, it will be.",
      "You need work turned around same-day, unpredictably. We work to an SLA we agree up front, and we’re not an always-on queue.",
    ],
    footnote:
      "Still reading and none of these fit? Then the audit will probably be worth your time.",
    /* Empty on purpose. The shipped copy is what renders when the API is
       unreachable, and this page had no video in this band before — inventing
       a poster path here would draw a broken image on exactly the occasion
       the page is already degraded. An editor sets it in the admin. */
    media: { videoId: null, videoSrc: null, poster: "", alt: "", playLabel: "" },
  },

  founder: {
    eyebrow: "Who you’re actually dealing with",
    name: "Anil Mahato",
    role: "Founder, Cocoma Digital",
    portrait: "/Images/podcast/anil-mahato-founder-cocoma.jpg",
    portraitAlt: "Anil Mahato, founder of Cocoma Digital.",
    lines: [
      "I started Cocoma in Mumbai in 2019 after a pitch meeting I was only supposed to sit in on. Seven years later the studio has produced 35,000+ videos and built 45M+ subscribers across the channels it runs.",
      "Podcasts are where that same machinery is now most useful outside India, because a show isn’t an editing job, it’s an operation, and operations are the thing we have actually built.",
      "Your show won’t be run by me. It will be run by a producer whose name you’ll know, against a documented process, to an SLA you agreed. That’s deliberate: a studio that only works when the founder is in the room isn’t a studio, it’s a bottleneck.",
    ],
  },

  operations: {
    eyebrow: "Working across time zones",
    title: "The practical questions, answered up front",
  },

  studio: {
    eyebrow: "The room this runs from",
    heading: "A working studio, not a marketplace of freelancers",
    body: "Your show is produced by a named team on the Cocoma floor in Andheri West, Mumbai — editors, designers, colorists, sound and channel operations under one roof. That’s what makes an SLA mean anything: there’s a bench behind it, not one contractor with a full inbox.",
    scaleNote:
      "Studio-wide channel and catalog figures, all published on cocomadigital.com. They’re not podcast metrics. They’re the size of the operation your show would be produced inside.",
  },

  process: {
    eyebrow: "How engagements run",
    title: "From audit to operating system",
  },

  proof: {
    eyebrow: "What we can show you",
    title: "The capability, and what it isn’t",
    paragraphs: [
      "We don’t publish podcast case studies yet. Saying otherwise would be the easiest sentence on this page to write and the fastest one to get caught on.",
      "What we can show you is the work the studio does publish, and we’ll be precise about how it transfers. The figures at the top of this page — 12B+ organic views, 35,000+ videos, 45M+ subscribers — are channel and catalog numbers built across seven years. They are not podcast metrics and we will not dress them up as podcast metrics. What carries across is the operating capability behind them: high-volume editing, packaging tested against click-through, multi-platform publishing, and localization across 20+ languages.",
      "On a call we’ll walk you through that work and the exact process we’d run on your show.",
    ],
  },

  faq: { eyebrow: "Questions", title: "Frequently asked questions" },

  final: {
    title: "Get a free podcast audit",
    lead: "Send the show link. We’ll review packaging, retention, publishing cadence and back catalog, then come back with what we’d change first, and what it would cost.",
    points: [
      "Findings are yours whether or not we work together",
      "Scope and price come back together, in USD",
      "No obligation and no discovery-call gauntlet",
    ],
  },

  auditForm: {
    nameLabel: "Name",
    namePlaceholder: "Your name",
    emailLabel: "Email",
    emailPlaceholder: "you@company.com",
    showLabel: "Show link",
    showPlaceholder: "https://youtube.com/@yourshow",
    submitLabel: "Get a free podcast audit",
    submittingLabel: "Sending…",
    note: "No obligation. You get the findings either way.",
    doneTitle: "Got it.",
    doneBody:
      "We’ll review the show and come back with the audit findings. If it’s urgent, email",
    contactEmail: "anil@cocomadigital.com",
    errorFallback:
      "Something went wrong. Try again, or email anil@cocomadigital.com directly.",
    leadTag: "Podcast audit request",
  },

  seo: {
    title: "Podcast Video Editing & Marketing Services",
    description:
      "Full-stack podcast production and growth: video and audio editing, clips, thumbnails, publishing and analytics — run as one system by Cocoma Digital.",
    keywords: [
      "podcast editing and growth services",
      "podcast production agency",
      "video podcast editing services",
      "podcast growth agency",
      "YouTube podcast production",
      "short-form clipping",
      "podcast repurposing",
      "podcast channel management",
      "podcast dubbing and localization",
      "podcast production agency for US shows",
      "podcast editing services USA",
      "podcast production agency Canada UK",
    ],
    secondaryKeywords: [],
    canonicalUrl: "",
    noIndex: false,
    schema: {
      name: "Podcast Video Editing & Marketing Services",
      serviceType: "Podcast production, editing and growth",
      description:
        "Full-stack podcast production and growth: video and audio editing, short-form clipping, thumbnails and packaging, show notes and SEO, publishing, dubbing and localization, and analytics — operated as one system.",
      areaServed: [
        "India",
        "United States",
        "United Kingdom",
        "Canada",
        "Singapore",
        "Australia",
      ],
      audienceType:
        "Podcasters, founders and creators, brands running podcasts, OTT platforms and media networks in the United States, Canada and the United Kingdom",
      offerCatalogName: "Podcast production and growth services",
      breadcrumbLabel: "Podcast Video Editing & Marketing Services",
    },
    /* Blank overrides, matching a record with nothing filled in: the site's
       own metadata chain supplies the title and description. */
    openGraph: {
      title: "",
      description: "",
      type: "website",
      image: "",
      imageAlt:
        "Cocoma Digital — Podcast Video Editing & Marketing Services: one recording becomes a multi-platform growth engine.",
      imageWidth: 1200,
      imageHeight: 630,
      imageType: "image/png",
    },
    twitter: {
      card: "summary_large_image",
      title: "",
      description: "",
      image: "",
      imageAlt:
        "Cocoma Digital — Podcast Video Editing & Marketing Services: one recording becomes a multi-platform growth engine.",
    },
  },

  ogCard: {
    eyebrow: "Cocoma Digital",
    title: "Podcast Video Editing & Marketing Services",
    description:
      "One recording becomes a multi-platform growth engine — episodes, clips, packaging, publishing and analytics, run as one system.",
    badgeOne: "From $2,000/month",
    badgeTwo: "US · Canada · UK hours",
  },

  displayOrder: 1,

  trustStats: [
    { value: "12B+", label: "Organic views driven", description: "" },
    { value: "35,000+", label: "Videos produced", description: "" },
    { value: "45M+", label: "Subscribers built", description: "" },
    { value: "7 yrs", label: "Studio operating", description: "" },
  ],

  problemStats: [
    {
      value: "4–8 hrs",
      label:
        "of post-production per 30 minutes recorded — our own measured range",
      description:
        "Cutting, cleaning, color, captions, clip selection, thumbnails, notes, uploads. The recording is the cheapest part of a podcast.",
    },
    {
      value: "60+",
      label: "pieces a week is what a full engagement is built to ship",
      description:
        "An episode is no longer the unit of output. Episodes, cutdowns, vertical clips, carousels and a newsletter all come from the same session.",
    },
    {
      value: "1",
      label: "editor can’t carry that load — a system can",
      description:
        "Hiring one more editor buys you throughput for a month. A production system with defined roles, templates and SLAs is what holds at volume.",
    },
  ],

  scaleStats: [
    {
      value: "60",
      label: "People on the floor",
      description: "Editors, design, marketing, channel ops",
    },
    {
      value: "60+",
      label: "Partner channels run",
      description: "Across seven years of operations",
    },
    {
      value: "$600K+",
      label: "Partner revenue in 2025",
      description: "YouTube ads alone, before sponsorship",
    },
    {
      value: "20+",
      label: "Languages",
      description: "Transcreation already running in-house",
    },
  ],

  serviceCards: [
    {
      image: "",
      imageAlt: "",
      icon: "video",
      step: "",
      title: "Video podcast editing",
      body: "Multicam, cut speaker-aware, color and sound matched across every angle.",
      meta: "",
      points: ["Multicam", "Captions", "Lower thirds", "Template system"],
    },
    {
      image: "",
      imageAlt: "",
      icon: "audio",
      step: "",
      title: "Audio editing & mastering",
      body: "Cleaned, levelled and mastered so it sounds right on headphones and in a car.",
      meta: "",
      points: [
        "Noise & room tone",
        "Filler words",
        "Level matching",
        "Loudness targets",
      ],
    },
    {
      image: "",
      imageAlt: "",
      icon: "clip",
      step: "",
      title: "Short-form clipping",
      body: "Moments chosen for a reason, cut to what each platform actually rewards.",
      meta: "",
      points: [
        "Shorts",
        "Reels",
        "TikTok",
        "Vertical reframe",
        "Burned-in captions",
      ],
    },
    {
      image: "",
      imageAlt: "",
      icon: "thumb",
      step: "",
      title: "Thumbnails & packaging",
      body: "Thumbnail and title designed as one decision, then tested as a pair.",
      meta: "",
      points: ["A/B variants", "Title systems", "Click-through testing"],
    },
    {
      image: "",
      imageAlt: "",
      icon: "notes",
      step: "",
      title: "Show notes, SEO & transcripts",
      body: "Written for search engines and AI assistants as well as for listeners.",
      meta: "",
      points: ["Chapters", "Timestamps", "Full transcripts", "Descriptions"],
    },
    {
      image: "",
      imageAlt: "",
      icon: "publish",
      step: "",
      title: "Publishing & channel management",
      body: "We keep running it week to week across YouTube and the whole social ring.",
      meta: "",
      points: [
        "Scheduling",
        "Metadata",
        "Playlists",
        "End screens",
        "Community",
      ],
    },
    {
      image: "",
      imageAlt: "",
      icon: "globe",
      step: "",
      title: "Dubbing & localization",
      body: "Open a second and third market using the languages already running in-house.",
      meta: "",
      points: ["Transcreation", "20+ languages", "Subtitles"],
    },
    {
      image: "",
      imageAlt: "",
      icon: "chart",
      step: "",
      title: "Analytics & growth reporting",
      body: "A monthly scorecard that ends in decisions, not a wall of screenshots.",
      meta: "",
      points: ["Discovery", "Packaging", "Consumption", "Business"],
    },
  ],

  audienceCards: [
    {
      image: "",
      imageAlt: "",
      icon: "mic",
      step: "",
      title: "Founders & operators with a show",
      body: "Whether you’re in New York, Toronto or London, the podcast is a growth channel for the business, not a hobby. You record consistently and the back end is the bottleneck. You want the episode, the clips and the packaging handled to a standard, on a calendar you can plan around.",
      meta: "Weekly or bi-weekly cadence, video-first",
      points: [],
    },
    {
      image: "",
      imageAlt: "",
      icon: "brand",
      step: "",
      title: "Brands running podcasts as marketing",
      body: "The show has to earn its budget. That means it’s measured against pipeline and brand search, it runs on a real content calendar, and someone owns it as their actual job.",
      meta: "Marketing-owned, reports to a number",
      points: [],
    },
    {
      image: "",
      imageAlt: "",
      icon: "network",
      step: "",
      title: "Networks & media companies",
      body: "Multi-show operations, large back catalogs and localization across markets. This is the work Cocoma has done longest: the studio’s channel and catalog operations were built at exactly this scale — 35,000+ videos produced and 12B+ organic views driven.",
      meta: "Multiple shows, shared production standard",
      points: [],
    },
  ],

  operationCards: [
    {
      image: "",
      imageAlt: "",
      icon: "clock",
      step: "",
      title: "Overlap with your working day",
      body: "Reviews, calls and approvals happen inside your working day. India evenings overlap the North American morning, Eastern and Pacific both, and India mornings overlap the UK afternoon. Production runs to the agreed SLA while you are offline, so you send a recording at the end of your day and the work has moved by the time you are back.",
      meta: "",
      points: [],
    },
    {
      image: "",
      imageAlt: "",
      icon: "dollar",
      step: "",
      title: "Priced and invoiced in USD",
      body: "Quoted and invoiced in US dollars wherever you are, with GBP and CAD available on request. No per-hour meter — a monthly engagement with a defined scope, so the line item on your budget stays the same number every month.",
      meta: "",
      points: [],
    },
    {
      image: "",
      imageAlt: "",
      icon: "lock",
      step: "",
      title: "You own everything",
      body: "Channels and social accounts stay in your ownership with access granted to us, never the other way around. Project files, templates and assets are yours and are handed over on request.",
      meta: "",
      points: [],
    },
  ],

  processSteps: [
    {
      image: "",
      imageAlt: "",
      icon: "",
      step: "01",
      title: "Free podcast audit",
      meta: "No cost",
      body: "We review the show as it stands — packaging, retention, publishing cadence, back catalog and where attention is being lost. You get the findings whether or not you work with us, along with scope and pricing for the shape that fits.",
      points: [],
    },
    {
      image: "",
      imageAlt: "",
      icon: "",
      step: "02",
      title: "Engine build",
      meta: "Setup phase",
      body: "Strategy, show architecture, edit and thumbnail templates, naming conventions, publishing calendar and the baseline benchmarks we’ll measure against. This is the part most shows never had.",
      points: [],
    },
    {
      image: "",
      imageAlt: "",
      icon: "",
      step: "03",
      title: "Operate & grow",
      meta: "Ongoing",
      body: "Production runs to an agreed turnaround SLA while the optimization loop runs monthly: read the four layers, change something specific, measure the change.",
      points: [],
    },
  ],

  monthRows: [
    {
      image: "",
      imageAlt: "",
      icon: "",
      step: "",
      title: "Full episodes",
      meta: "4",
      body: "Multicam edit, audio master, captions, chapters and thumbnail",
      points: [],
    },
    {
      image: "",
      imageAlt: "",
      icon: "",
      step: "",
      title: "Platform-native clips",
      meta: "48",
      body: "Roughly 12 per episode, reframed and captioned per platform",
      points: [],
    },
    {
      image: "",
      imageAlt: "",
      icon: "",
      step: "",
      title: "Thumbnails with A/B variants",
      meta: "8",
      body: "Two packaging routes per episode, tested and reported on",
      points: [],
    },
    {
      image: "",
      imageAlt: "",
      icon: "",
      step: "",
      title: "Stories & carousels",
      meta: "Per calendar",
      body: "Episode launch beats and evergreen pulls from the back catalog",
      points: [],
    },
    {
      image: "",
      imageAlt: "",
      icon: "",
      step: "",
      title: "Show notes, transcripts & newsletter",
      meta: "4 sets",
      body: "SEO-written notes, full transcript and newsletter draft per episode",
      points: [],
    },
    {
      image: "",
      imageAlt: "",
      icon: "",
      step: "",
      title: "Publishing",
      meta: "Full",
      body: "YouTube, Instagram, TikTok, LinkedIn, Facebook and X",
      points: [],
    },
    {
      image: "",
      imageAlt: "",
      icon: "",
      step: "",
      title: "Growth scorecard",
      meta: "1",
      body: "Four-layer review ending in decisions for the following month",
      points: [],
    },
  ],

  stages: [
    {
      diagramKey: "align",
      image: "",
      imageAlt: "",
      step: "01",
      name: "Align",
      promise:
        "Decide what the show is actually for before a single cut is made.",
      detail:
        "Most shows are formatted before anyone decides what they’re for, which is why they drift. Align happens once, before production, and it makes every later decision cheap: when the goal, the audience and the pillars are written down, choosing a title or cutting a segment stops being a matter of opinion.",
      capabilities: [
        "Business goal — leads, authority, sponsorship, product pull-through",
        "Audience definition and competitive positioning",
        "Show architecture: format, length, cadence, segment structure",
        "Content pillars mapped to what the business needs to be known for",
      ],
    },
    {
      diagramKey: "engineer",
      image: "",
      imageAlt: "",
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
      diagramKey: "amplify",
      image: "",
      imageAlt: "",
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
      diagramKey: "optimize",
      image: "",
      imageAlt: "",
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
  ],

  studioShots: [
    {
      image: "/Images/about/2026-08/edit-floor-row.jpg",
      alt: "Four editors working in a row at adjacent monitors along a yellow wall, each wearing headphones, timelines and footage open on the screens.",
      caption: "The edit floor",
      wide: true,
    },
    {
      image: "/Images/about/2026-08/editor-close-up.jpg",
      alt: "An editor in headphones at a wide monitor, a dense multi-track timeline below a preview of a single speaker talking to camera.",
      caption: "Retention-first editing",
      wide: false,
    },
    {
      image: "/Images/about/2026-08/editor-multicam-timeline.jpg",
      alt: "An editor at dual monitors cutting a two-person sequence, with a densely stacked color-coded timeline filling the lower screen.",
      caption: "Multicam, two speakers",
      wide: false,
    },
    {
      image: "/Images/about/2026-08/editor-two-screen.jpg",
      alt: "An editor at two monitors, an editing timeline on the left and the graded footage playing full-screen on the right.",
      caption: "Cut and review, side by side",
      wide: false,
    },
    {
      image: "/Images/about/2026-08/editor-promo-cut.jpg",
      alt: "An editor in headphones working at two screens, an audio-heavy timeline on one and the video playing on the other.",
      caption: "Audio and picture together",
      wide: false,
    },
    {
      image: "/Images/about/2026-08/thumbnail-designer.jpg",
      alt: "A designer at a wide monitor cutting a subject out of a still in Photoshop, the isolated figure shown on a transparency checkerboard beside the source frame.",
      caption: "Thumbnail and packaging design",
      wide: true,
    },
  ],

  faqs: [
    {
      question: "What do podcast editing and growth services cost?",
      answer:
        "Engagements start at $2,000 per month, quoted and invoiced in USD (GBP and CAD on request). Where a show lands above that depends on episodes per month, how many camera angles, clip volume per episode, and whether publishing, back-catalog work and localization are included. We publish the floor deliberately. Below $2,000 a month a freelance editor will serve you better than a production system, and we’d rather say so than sell you something that doesn’t fit. The free audit comes back with the scope and the number together.",
    },
    {
      question: "Why is there a minimum at all?",
      answer:
        "Because the thing we sell is a system, not hours. A named producer, template build, packaging tests, a publishing operation and a monthly optimization loop have a fixed cost to stand up and run properly. Below that floor we would be delivering a worse version of what a good freelance editor already does well, at a higher price. The minimum is honesty about where this model starts working.",
    },
    {
      question:
        "You’re based in India. How does that work for a show in the US, Canada or the UK?",
      answer:
        "The studio is in Mumbai. India evenings overlap the North American working day, Eastern and Pacific both, and India mornings overlap the UK afternoon, so reviews, calls and approvals land inside your hours. Production runs to the agreed SLA while you are offline, which usually means you send a recording at the end of your day and the work has moved by the time you’re back. Everything is quoted and invoiced in USD, with GBP and CAD available on request.",
    },
    {
      question: "What are your turnaround times?",
      answer:
        "Turnaround is agreed as an SLA before work starts and written into the engagement, so you can plan a publishing calendar around it instead of chasing us for updates. The SLA depends on format and volume; it’s set during the engine-build stage and then held.",
    },
    {
      question: "Do you work on video podcasts, audio-only, or both?",
      answer:
        "Both. Audio-only shows get editing, mastering, notes, transcripts and audio-led clips. Video shows get everything audio does, plus multicam editing, thumbnails, packaging tests and the full short-form ring. We build video-first by default, because that’s where discovery now happens.",
    },
    {
      question: "Why does YouTube matter so much for podcasts?",
      answer:
        "YouTube is a search and recommendation engine, not just a hosting platform. A podcast that lives only in audio apps depends almost entirely on people already knowing it exists. On YouTube, packaging and retention decide whether the platform shows the episode to people who have never heard of the show. That is the difference between a back catalog that compounds and one that sits still.",
    },
    {
      question: "How do you measure success?",
      answer:
        "In four layers. Discovery: impressions and where traffic comes from. Packaging: click-through rate on thumbnail and title. Consumption: retention curve and average view duration. Business: subscribers, inquiries and sponsor conversations. We report on all four monthly and each report ends in specific decisions. We don’t promise view counts or subscriber numbers. Those are outcomes, not deliverables. What we commit to is output volume, turnaround, and a tested packaging and retention process.",
    },
    {
      question: "Who owns the channel, the accounts and the project files?",
      answer:
        "You do, always. Channels and social accounts stay in your ownership with access granted to us, never the other way around. Project files, templates and assets are yours and are handed over on request. Nothing about the engagement is designed to make leaving difficult.",
    },
    {
      question: "Can you work with our existing editor or in-house team?",
      answer:
        "Yes. The model is built to run the parts a small team can’t hold at volume — packaging, clipping, publishing operations, localization — while the in-house editor keeps the main edit. The system matters more than who holds each seat.",
    },
    {
      question: "What happens to our back catalog?",
      answer:
        "It’s usually the fastest win available. Existing episodes already contain clip-worthy moments, and old packaging can be re-tested without recording anything new. The audit flags which back-catalog episodes are worth re-cutting or re-packaging first.",
    },
    {
      question: "How do we start?",
      answer:
        "Send the show link through the audit form below. We review it and come back with findings, a recommended shape for the engine, and pricing for the scope that fits. No obligation attached to the audit.",
    },
  ],

  ctas: {
    hero: [
      {
        label: "Get a free podcast audit",
        href: "#podcast-audit",
        variant: "primary",
      },
    ],
    pricing: [
      {
        label: "Get a free podcast audit",
        href: "#podcast-audit",
        variant: "primary",
      },
    ],
    founder: [
      {
        label: "Get a free podcast audit",
        href: "#podcast-audit",
        variant: "primary",
      },
    ],
    proof: [
      {
        label: "Read the case studies",
        href: "/case-studies",
        variant: "secondary",
      },
      {
        label: "See the portfolio",
        href: "/marketing-portfolio",
        variant: "secondary",
      },
    ],
  },
};
