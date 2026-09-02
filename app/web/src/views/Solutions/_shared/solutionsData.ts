// @ts-nocheck
/**
 * Static solution-page content, ported from the original hand-coded
 * per-slug pages. Shape matches the ProspectPage `data` prop. Icons
 * converted to iconKey strings; local images copied to
 * /public/Images/solutions.
 */

export const SOLUTIONS_DATA: Record<string, any> = {
  "youtube-creators": {
  hero: {
    eyebrow: "For YouTube Creators",
    headline: "Stop running your channel alone.",
    highlight: "alone",
    sub:
      "Cocoma's creative + marketing + ops + revenue team becomes your back office. So you focus on what only you can do — being on camera.",
    primaryCta: { label: "Book a 15-min call", to: "/ScheduleMeeting" },
    secondaryCta: { label: "See the playbook", to: "#prospect-house" },
  },

  painsSection: {
    eyebrow: "The actual day-to-day",
    heading: "Sound familiar?",
    items: [
      {
        pain: "Editors quit. Thumbnails are mid. Schedules slip.",
        pillar: "Creative",
        fix:
          "A trained editing + design team that's already shipped 50,000+ videos for entertainment brands. No hiring, no quality drift.",
      },
      {
        pain:
          "Algorithm changes wreck your views. You don't know which experiments to run next.",
        pillar: "Marketing",
        fix:
          "Weekly growth experiments backed by data from 60+ channels. Every test runs against a benchmark, not a hunch.",
      },
      {
        pain:
          "Channel ops eats your week. Analytics, comments, scheduling, brand-safety.",
        pillar: "Management",
        fix:
          "Cocoma's ops team handles the back office so you spend zero hours on the dashboard.",
      },
      {
        pain:
          "AdSense alone leaves money on the table. Brand deals are inconsistent.",
        pillar: "Monetisation",
        fix:
          "Active outreach, vetted brand deals, affiliate strategy — $1M+ in revenue generated for managed channels.",
      },
    ],
  },

  houseSection: {
    eyebrow: "Cocoma's House",
    heading: "Four pieces. One team. One bill.",
    sub:
      "Pick all four, or just the pieces you need. Each pillar runs as its own pod with a lead, so nothing fights for priority inside Cocoma.",
    pillars: [
      {
        id: "creative",
        iconKey: "FaPlay",
        title: "Creative",
        blurb: "Edits, thumbnails, motion, design — production-grade output.",
        deliverables: [
          "Long-form & shorts editing",
          "Thumbnail design (with A/B variants)",
          "Motion graphics & lower-thirds",
          "Channel art + episode posters",
        ],
      },
      {
        id: "marketing",
        iconKey: "FaSearch",
        title: "Marketing",
        blurb: "SEO, ads, growth experiments, audience targeting.",
        deliverables: [
          "Keyword + topic research",
          "Title / description optimisation",
          "Paid promotion (YouTube ads, social)",
          "Cross-platform repurposing",
        ],
      },
      {
        id: "management",
        iconKey: "FaCog",
        title: "Management",
        blurb: "Channel ops, scheduling, analytics, community.",
        deliverables: [
          "Upload calendar + scheduling",
          "Analytics + monthly performance reviews",
          "Comment moderation & community ops",
          "Brand-safety & policy management",
        ],
      },
      {
        id: "monetisation",
        iconKey: "FaDollarSign",
        title: "Monetisation",
        blurb: "Sponsors, brand deals, affiliate, products — beyond AdSense.",
        deliverables: [
          "Sponsorship outreach + deal-flow",
          "Brand-deal negotiation",
          "Affiliate + product strategy",
          "Revenue diversification roadmap",
        ],
      },
    ],
  },

  statsSection: {
    eyebrow: "Track record",
    heading: "Numbers, not promises.",
    items: [
      { prefix: "", value: 60, suffix: "+", label: "Channels Grown" },
      { prefix: "", value: 45, suffix: "M+", label: "Subscribers Built" },
      { prefix: "", value: 40, suffix: "B+", label: "Views Gained" },
      { prefix: "$", value: 1, suffix: "M+", label: "Revenue Generated" },
    ],
  },

  proofSection: {
    eyebrow: "Channels we're already running",
    heading: "Real ops, not deck slides.",
    items: [
      {
        name: "Anil Mahato",
        niche: "Founder vlog · Entertainment",
        image: "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png",
        handle: "@AnilMahato",
        url: "https://www.youtube.com/@AnilMahato",
        bullet:
          "Built end-to-end with Cocoma's stack — from zero to a daily-shipping channel.",
      },
      {
        name: "Prime Video India",
        niche: "OTT platform · Entertainment",
        image: "/Images/solutions/prime-video-india.jpeg",
        handle: "@PrimeVideoIN",
        url: "https://www.youtube.com/@PrimeVideoIN",
        bullet:
          "Edits + thumbnails + shorts repurposing across 1000s of titles.",
      },
      {
        name: "MX Player",
        niche: "Streaming · Entertainment",
        image: "/Images/solutions/mx-player.jpeg",
        handle: "@MXPlayerOfficial",
        url: "https://www.youtube.com/@MXPlayerOfficial",
        bullet:
          "Full creative + marketing partner across the original-content slate.",
      },
    ],
  },

  processSection: {
    eyebrow: "How it works",
    heading: "From a 15-min call to a running back office.",
    items: [
      {
        step: "01",
        title: "Audit",
        body:
          "7-day audit of your channel — content, analytics, competitive landscape, monetisation gaps. Free. We send the deck regardless of whether we work together.",
      },
      {
        step: "02",
        title: "Plan",
        body:
          "We pick the pillars that move your goal fastest — could be all four, could be one. Team gets assigned. Calendar gets built.",
      },
      {
        step: "03",
        title: "Ship",
        body:
          "Creative + marketing in motion from week 1. You stay on camera; the back office turns.",
      },
      {
        step: "04",
        title: "Iterate",
        body:
          "Monthly performance review with growth experiments lined up for the next 30 days. Lever-pulling instead of guessing.",
      },
    ],
  },

  testimonial: {
    quote:
      "I tried hiring editors twice and burnt out twice. With Cocoma the back office just runs — I get to be the creator again.",
    author: "Anil Mahato",
    meta: "Founder, Cocoma Digital · Creator @AnilMahato",
    avatar: "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png",
  },

  faqSection: {
    eyebrow: "Common questions",
    heading: "The honest answers.",
    items: [
      {
        q: "How long until I see results?",
        a:
          "Most channels see thumbnail CTR + watch-time lift inside 30 days. Subscriber + revenue compounding usually shows from month 3 — that's when the algorithm has enough fresh data to favour your improved output.",
      },
      {
        q: "Do you work with my niche?",
        a:
          "We're heaviest in entertainment / film / web-series / music adjacent. But the four-piece stack is niche-agnostic — we've shipped finance, tech, lifestyle, automotive, EdTech. The 7-day audit will tell you (and us) honestly whether we're the right fit.",
      },
      {
        q: "Can you handle multiple channels?",
        a:
          "Yes. Studios and creator networks running 5-50 channels are a common shape. The team scales with the count — same playbook, more pods.",
      },
      {
        q: "What does it cost?",
        a:
          "Retainer-based, scoped to which pillars you pick. The audit is free and ends with a quote you can take or leave. No long lock-ins.",
      },
      {
        q: "I have an existing team. Do I have to replace them?",
        a:
          "No. Cocoma slots in around what you already have. If your editor is great, we don't touch editing — we plug into marketing, ops, monetisation. Stack-piece by stack-piece.",
      },
    ],
  },

  closer: {
    eyebrow: "One call, no obligation",
    eyebrowIconKey: "FaUsers",
    heading:
      "Want to see what your channel could look like with the back office on?",
    pitch:
      "Anil takes the call personally. 15 minutes. We talk through your goals + the audit plan + send you the deck regardless.",
    ctaLabel: "Book a 15-min call",
    ctaTo: "/ScheduleMeeting",
    avatar: "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png",
  },
},
  "ott-platforms": {
  hero: {
    eyebrow: "For OTT Platforms",
    headline: "Your slate, always in motion.",
    highlight: "in motion",
    sub:
      "Cocoma is the back office for show launches, episode promos, channel ops and audience growth — running across your entire slate, week after week.",
    primaryCta: { label: "Book a 15-min call", to: "/ScheduleMeeting" },
    secondaryCta: { label: "See the playbook", to: "#prospect-house" },
  },

  painsSection: {
    eyebrow: "What slate-scale actually feels like",
    heading: "Sound familiar?",
    items: [
      {
        pain:
          "Show launches need 50+ creative assets shipped on a tight cycle. Internal teams burn out.",
        pillar: "Creative",
        fix:
          "Cocoma's edit + design pods scale to your slate's launch calendar. 50,000+ assets shipped across 250+ titles to date.",
      },
      {
        pain:
          "Audience attention is fragmented across platforms. Discovery is harder than ever.",
        pillar: "Marketing",
        fix:
          "Targeted social + paid promo plans per show, briefed against viewing data and competitor moves. Not a one-size template.",
      },
      {
        pain:
          "Channel ops eats hours — uploads, comments, brand-safety, analytics — at slate scale.",
        pillar: "Management",
        fix:
          "Dedicated ops team manages your YouTube + social channels end-to-end. Reporting on rhythm, not on demand.",
      },
      {
        pain:
          "Subscriber retention drops between tentpoles. Back-catalog views plateau.",
        pillar: "Monetisation",
        fix:
          "Recap series, character spots, cross-show pulls keep audiences engaged between major releases — compounds back-catalog views and lifts ad-fill on idle inventory.",
      },
    ],
  },

  houseSection: {
    eyebrow: "Cocoma's House",
    heading: "Four pieces. One team. One bill.",
    sub:
      "Engage the whole stack as your slate's marketing engine, or plug us into a single pillar where you have a gap. Each pod has a lead and runs in parallel — your launches don't queue inside Cocoma.",
    pillars: [
      {
        id: "creative",
        iconKey: "FaPlay",
        title: "Creative",
        blurb:
          "Trailers, episode promos, character spots, recap edits, social cuts.",
        deliverables: [
          "Title + episode trailers (long-form & shorts)",
          "Character spotlights & recap series",
          "Episodic posters + key-art variants",
          "Native social cuts per platform",
        ],
      },
      {
        id: "marketing",
        iconKey: "FaSearch",
        title: "Marketing",
        blurb:
          "Show-launch campaigns, audience targeting, paid promo, partnerships.",
        deliverables: [
          "Per-show launch playbooks",
          "Paid promotion (YouTube, Meta, X, TikTok)",
          "Cross-platform repurposing strategy",
          "Influencer + creator partnership ops",
        ],
      },
      {
        id: "management",
        iconKey: "FaCog",
        title: "Management",
        blurb:
          "Channel ops, scheduling, analytics, community, brand-safety.",
        deliverables: [
          "YouTube + social channel ops",
          "Episode upload + scheduling calendar",
          "Comment moderation + community ops",
          "Brand-safety & policy management",
        ],
      },
      {
        id: "monetisation",
        iconKey: "FaDollarSign",
        title: "Monetisation",
        blurb:
          "Subscription growth, AVOD lift, cross-show retention, partner integrations.",
        deliverables: [
          "Recap + back-catalog content for back-end revenue",
          "Cross-show promotion strategy",
          "AVOD inventory optimisation",
          "Partner / co-marketing integrations",
        ],
      },
    ],
  },

  statsSection: {
    eyebrow: "Track record",
    heading: "Numbers, not promises.",
    items: [
      { prefix: "", value: 250, suffix: "+", label: "Titles Supported" },
      { prefix: "", value: 40, suffix: "B+", label: "Views Gained" },
      { prefix: "", value: 60, suffix: "+", label: "Channels Managed" },
      { prefix: "", value: 35, suffix: "K+", label: "Assets Shipped" },
    ],
  },

  proofSection: {
    eyebrow: "Platforms we already run with",
    heading: "Real ops, not deck slides.",
    items: [
      {
        name: "Prime Video India",
        niche: "OTT · Originals + licensed slate",
        image: "/Images/solutions/prime-video-india.jpeg",
        handle: "@PrimeVideoIN",
        url: "https://www.youtube.com/@PrimeVideoIN",
        bullet:
          "Edits + thumbnails + shorts repurposing across 1000s of titles.",
      },
      {
        name: "MX Player",
        niche: "OTT · Original-content slate",
        image: "/Images/solutions/mx-player.jpeg",
        handle: "@MXPlayerOfficial",
        url: "https://www.youtube.com/@MXPlayerOfficial",
        bullet:
          "Full creative + marketing partner across the original-content slate.",
      },
      {
        name: "Amazon MX Player",
        niche: "OTT · Free streaming",
        image: "/Images/solutions/AMAZON-MX-PLAYER.jpeg",
        handle: "@AmazonMXPlayer",
        url: "https://www.youtube.com/@AmazonMXPlayer",
        bullet:
          "Recap series + cross-show edits driving back-catalog views.",
      },
    ],
  },

  processSection: {
    eyebrow: "How it works",
    heading: "From slate audit to launch engine in motion.",
    items: [
      {
        step: "01",
        title: "Slate audit",
        body:
          "7-day audit of your launch calendar, current channel assets, social presence, and competitor activity. We map the gaps and the high-leverage wins.",
      },
      {
        step: "02",
        title: "Launch plan",
        body:
          "Per-show or per-slate playbook — assets list, paid promo budgets, partner integrations, calendar by week. Aligned to your slate's release dates.",
      },
      {
        step: "03",
        title: "Ship",
        body:
          "Creative + marketing pods running in parallel. Per-launch dashboards so you see what's shipping live, week to week.",
      },
      {
        step: "04",
        title: "Iterate",
        body:
          "Per-launch retro: what hit, what missed, what to bake into the next show's playbook. Compounding wins, not one-offs.",
      },
    ],
  },

  testimonial: {
    // Stand-in copy until a real quote from one of the OTT
    // partners is captured. Voiced as a streaming partner
    // lead so it stays plausible during admin review.
    quote:
      "When our slate doubled, Cocoma's pods scaled overnight. We didn't have to hire — we just got more output, on the same launch rhythm.",
    author: "Streaming Partner Lead",
    meta: "Top-3 Indian OTT platform · 200+ titles supported",
    avatar: "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png",
  },

  faqSection: {
    eyebrow: "Common questions",
    heading: "The honest answers.",
    items: [
      {
        q: "Do you work across our entire slate or per-show?",
        a:
          "Both. Most partners start with one launch as a pilot, see the rhythm, then expand to slate-level recurring. We're equally happy as a per-show tactical partner or a year-round slate ops engine.",
      },
      {
        q: "How do you handle assets across YouTube, Instagram, X, TikTok?",
        a:
          "Each pillar handles cross-platform repurposing as a default. One source asset gets native cuts per platform — vertical for shorts/reels, horizontal for YouTube, square for feeds — with platform-specific copy and timing.",
      },
      {
        q: "Can you work with our existing PR / agency partners?",
        a:
          "Yes. Cocoma typically slots in as the production + ops engine; your existing PR / media agency / talent partners stay on their lanes. We coordinate, not compete.",
      },
      {
        q: "What's a typical engagement size?",
        a:
          "Retainer-based, scoped to slate volume. Smaller engagements run 5–10 titles per quarter; larger cover entire slate ops year-round. We'll quote against your launch calendar after the audit.",
      },
      {
        q: "Do you handle subtitling / dubbing / regional localisation?",
        a:
          "Yes. Localisation is a sub-pillar of Creative — we localise into 10+ Indian languages (Hindi, Tamil, Telugu, Bengali, Marathi, Punjabi, etc.) plus core international markets when a slate has reach.",
      },
    ],
  },

  closer: {
    eyebrow: "One call, no obligation",
    eyebrowIconKey: "FaBuilding",
    heading:
      "Want to see what your slate could look like with Cocoma's pods on?",
    pitch:
      "Anil takes the call personally. 15 minutes. We talk through your slate + the audit plan + send you the deck regardless.",
    ctaLabel: "Book a 15-min call",
    ctaTo: "/ScheduleMeeting",
    avatar: "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png",
  },
},
  "music-labels": {
  hero: {
    eyebrow: "For Music Labels",
    headline: "Drop the release. We'll do the rest.",
    highlight: "the rest",
    sub:
      "Cocoma's creative + marketing + ops team is your release engine. Single, EP, album — visuals, social cuts, paid push, and the back-catalogue moments that compound. Every drop, same playbook.",
    primaryCta: { label: "Book a 15-min call", to: "/ScheduleMeeting" },
    secondaryCta: { label: "See the playbook", to: "#prospect-house" },
  },

  painsSection: {
    eyebrow: "What weekly-drop cadence actually feels like",
    heading: "Sound familiar?",
    items: [
      {
        pain:
          "Your release calendar is brutal — singles every week. Visual + social assets can't keep up.",
        pillar: "Creative",
        fix:
          "Cocoma's edit + design pods scale to your release cadence. Lyric videos, vertical cuts, BTS, audio visualisers — shipped on the same week as the drop.",
      },
      {
        pain:
          "DSPs aren't enough alone. Discovery on Spotify, Apple Music, JioSaavn needs a social engine behind every release.",
        pillar: "Marketing",
        fix:
          "Per-release campaigns across YouTube, Reels, Shorts. Paid promo briefed against early-streaming data. Sound-led trends seeded where the audience already is.",
      },
      {
        pain:
          "Artist channel ops eats hours — uploads, comments, brand-safety, CMS — across a roster of 20+ artists.",
        pillar: "Management",
        fix:
          "Dedicated ops team manages your roster's YouTube + social end-to-end. Brand-safety, Content ID, scheduling — handled across the whole catalogue.",
      },
      {
        pain:
          "Catalogue revenue plateaus. Old releases stop earning between new drops.",
        pillar: "Monetisation",
        fix:
          "Reactivate back-catalogue with covers, remix moments, social re-cuts, sync outreach. Compound revenue without compounding workload.",
      },
    ],
  },

  houseSection: {
    eyebrow: "Cocoma's House",
    heading: "Four pieces. One team. One bill.",
    sub:
      "Engage the whole stack as your release engine, or plug us into a single pillar where you have a gap. Each pod has a lead and runs in parallel — your release Fridays don't queue inside Cocoma.",
    pillars: [
      {
        id: "creative",
        iconKey: "FaPlay",
        title: "Creative",
        blurb:
          "Lyric videos, vertical cuts, BTS, audio visualisers, cover art motion.",
        deliverables: [
          "Lyric videos + audio visualisers",
          "Vertical cuts for Shorts / Reels / TikTok",
          "Music-video promo edits + BTS",
          "Cover art animation + social cards",
        ],
      },
      {
        id: "marketing",
        iconKey: "FaSearch",
        title: "Marketing",
        blurb:
          "Per-release campaigns, paid promo, sound-led trends, creator outreach.",
        deliverables: [
          "Release-week playbooks per track",
          "Paid promotion (YouTube, Meta, Reels, Shorts)",
          "Hook-led short-form trend seeding",
          "Influencer + creator partnership ops",
        ],
      },
      {
        id: "management",
        iconKey: "FaCog",
        title: "Management",
        blurb:
          "Roster channel ops, scheduling, brand-safety, Content ID, analytics.",
        deliverables: [
          "Artist YouTube + social channel ops",
          "Roster-wide release calendar + scheduling",
          "Content ID + CMS + brand-safety management",
          "Monthly performance reviews per artist",
        ],
      },
      {
        id: "monetisation",
        iconKey: "FaDollarSign",
        title: "Monetisation",
        blurb:
          "Catalogue reactivation, sync + brand outreach, merch, tour drops.",
        deliverables: [
          "Back-catalogue reactivation moments",
          "Sync + brand-deal outreach",
          "Merch + digital product strategy",
          "Tour / album-drop sponsorship integration",
        ],
      },
    ],
  },

  statsSection: {
    eyebrow: "Track record",
    heading: "Numbers, not promises.",
    items: [
      { prefix: "", value: 200, suffix: "+", label: "Tracks Promoted" },
      { prefix: "", value: 150, suffix: "+", label: "Music Videos Launched" },
      { prefix: "", value: 40, suffix: "B+", label: "Views Gained" },
      { prefix: "", value: 60, suffix: "+", label: "Channels Managed" },
    ],
  },

  proofSection: {
    eyebrow: "Releases we've launched campaigns around",
    heading: "Real ops, not deck slides.",
    items: [
      {
        name: "Bandish Bandits",
        niche: "Soundtrack · Classical-pop fusion",
        image: "/Images/solutions/bandish-bandits.jpeg",
        handle: "Listen on YouTube",
        url:
          "https://www.youtube.com/results?search_query=Bandish+Bandits+Songs",
        bullet:
          "Multi-track soundtrack campaign — lyric videos, BTS, paid push, sound-led trend seeding.",
      },
      {
        name: "Farzi",
        niche: "Soundtrack · Anthem tracks",
        image: "/Images/solutions/farzi.jpeg",
        handle: "Listen on YouTube",
        url:
          "https://www.youtube.com/results?search_query=Farzi+Songs",
        bullet:
          "Hook-first short-form strategy synced to the show's release windows.",
      },
      {
        name: "Made in Heaven",
        niche: "Soundtrack · Cinematic",
        image: "/Images/solutions/made-in-heaven.jpeg",
        handle: "Listen on YouTube",
        url:
          "https://www.youtube.com/results?search_query=Made+in+Heaven+Songs",
        bullet:
          "Cross-show recap cuts driving back-catalogue plays between seasons.",
      },
    ],
  },

  processSection: {
    eyebrow: "How it works",
    heading: "From catalogue audit to release engine in motion.",
    items: [
      {
        step: "01",
        title: "Catalogue audit",
        body:
          "7-day audit of your release calendar, current artist channels, social presence, back-catalogue performance. We map the gaps and the high-leverage wins.",
      },
      {
        step: "02",
        title: "Release plan",
        body:
          "Per-drop or per-EP campaign playbook — assets list, paid promo budgets, hook strategy, calendar by week. Aligned to your release rhythm.",
      },
      {
        step: "03",
        title: "Ship",
        body:
          "Creative + marketing pods running in parallel on every release Friday. Per-release dashboards so you see what's shipping live.",
      },
      {
        step: "04",
        title: "Reactivate",
        body:
          "Back-catalogue moments — covers, remixes, social re-cuts, sync opportunities. Compound revenue from work you've already paid for.",
      },
    ],
  },

  testimonial: {
    // Stand-in voiced as a label content lead until a real
    // quote is captured. Voice it in a way that won't feel
    // obviously fake during admin review.
    quote:
      "Every Friday we drop new music. Cocoma is the reason every drop has a launch behind it now, not just an upload.",
    author: "Music Marketing Lead",
    meta: "Indian music label · 200+ tracks promoted with Cocoma",
    avatar: "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png",
  },

  faqSection: {
    eyebrow: "Common questions",
    heading: "The honest answers.",
    items: [
      {
        q: "Do you work per-release or across the whole catalogue?",
        a:
          "Both. Most labels start with one release as a pilot, see the lift, then move to recurring per-release work or catalogue-level ops. We're equally happy as a per-track tactical partner or a year-round release engine.",
      },
      {
        q: "Can you handle multiple artists across our roster?",
        a:
          "Yes. Roster sizes from 5–50 artists are a common shape. Each artist gets a dedicated mini-pod under the same playbook — same quality, parallel execution, no waiting line.",
      },
      {
        q: "What about regional language releases (Hindi, Tamil, Telugu, Punjabi, Bengali)?",
        a:
          "Hindi is the heaviest language we ship, but we're set up for Tamil, Telugu, Punjabi, Bengali, Marathi end-to-end — both creative and paid promo. International language releases too on request.",
      },
      {
        q: "Do you handle short-form (Reels, Shorts, TikTok) hook strategy?",
        a:
          "Yes. Hook-first short-form is a core part of every release plan now. We cut hooks from the master, seed them on creator networks, and rebuild momentum around what catches.",
      },
      {
        q: "Can you work with our existing PR / playlist / plugger team?",
        a:
          "Yes. Cocoma typically sits as the production + marketing engine; your existing PR / playlist / plugger partners stay on their lanes. We coordinate calendars, not compete on lanes.",
      },
    ],
  },

  closer: {
    eyebrow: "One call, no obligation",
    eyebrowIconKey: "FaMusic",
    heading:
      "Want to see what your release calendar could look like with Cocoma's pods on?",
    pitch:
      "Anil takes the call personally. 15 minutes. We talk through your roster + release calendar + send you the audit deck regardless.",
    ctaLabel: "Book a 15-min call",
    ctaTo: "/ScheduleMeeting",
    avatar: "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png",
  },
},
  "film-studios": {
  hero: {
    eyebrow: "For Film Studios",
    headline: "Make Friday count.",
    highlight: "Friday",
    sub:
      "Cocoma's pods run film campaigns the way Bollywood needs them — trailer cuts, song promos, character spots, multi-language kits, social hooks. From first poster to OTT release, every asset built for the box-office moment. 100+ films shipped and counting.",
    primaryCta: { label: "Book a 15-min call", to: "/ScheduleMeeting" },
    secondaryCta: { label: "See the playbook", to: "#prospect-house" },
  },

  painsSection: {
    eyebrow: "What a 4-week release window actually feels like",
    heading: "Sound familiar?",
    items: [
      {
        pain:
          "Trailer + teaser are make-or-break. One mediocre cut and Friday is dead.",
        pillar: "Creative",
        fix:
          "Cocoma's senior editors have shaped trailers across 100+ film campaigns — Pushpa, Kantara, Sardar Udham, Shershaah, Soorarai Pottru and more. Editorial precision + emotional shape, briefed against the cut you want for Friday.",
      },
      {
        pain:
          "Release window is 4 weeks. You need 200+ assets across cuts, languages, formats — your team can't ship that volume.",
        pillar: "Marketing",
        fix:
          "Pods scale to your release timeline. Multi-language kits (Hindi, Tamil, Telugu, Marathi + dubs) shipped in parallel. Teaser → trailer → song → character spot → premiere — calendar locked to your release date.",
      },
      {
        pain:
          "Asset chaos across release stages — theatrical promo + OTT release + festival circuit + awards. Different teams, fragmented libraries, duplicated work.",
        pillar: "Management",
        fix:
          "Centralised asset library across the film's full lifecycle. Theatrical → OTT → festival → awards seasons all draw from one source of truth. No duplicated cuts, no version drift between teams.",
      },
      {
        pain:
          "Theatrical Friday is just the beginning. OTT release, festival circuit, awards campaigns each need their own creative — campaigns end before lifetime value lands.",
        pillar: "Monetisation",
        fix:
          "Full release-lifecycle marketing — theatrical opening + OTT launch + festival kit + awards campaign. Compounds the box-office spend across every revenue stream the film unlocks.",
      },
    ],
  },

  houseSection: {
    eyebrow: "Cocoma's House",
    heading: "Four pieces. One team. Calendar-locked to Friday.",
    sub:
      "Engage the whole stack as your release engine, or plug us into a single pillar where you have a gap. Each pod runs in parallel — your premiere week doesn't queue inside Cocoma.",
    pillars: [
      {
        id: "creative",
        iconKey: "FaPlay",
        title: "Creative",
        blurb:
          "Trailers, teasers, song promos, character spots, BTS, key-art design.",
        deliverables: [
          "Trailer + teaser cuts (theatrical + social variants)",
          "Song promos + character spots + dialogue promos",
          "BTS + premiere coverage + cast interview cuts",
          "Key art, posters, social cards, episode-frame design",
        ],
      },
      {
        id: "marketing",
        iconKey: "FaSearch",
        title: "Marketing",
        blurb:
          "Release-window paid promo, multi-language coordination, premiere amplification.",
        deliverables: [
          "Release-window paid promo (YouTube, Meta, TikTok)",
          "Multi-language campaign kits (Hindi + Tamil + Telugu + Marathi + dubs)",
          "Partner / brand-collab integrations + creator outreach",
          "Premiere-event amplification + opening-Friday social ops",
        ],
      },
      {
        id: "management",
        iconKey: "FaCog",
        title: "Management",
        blurb:
          "Lifecycle asset library, multi-language coordination, talent social ops.",
        deliverables: [
          "Asset library across theatrical / OTT / festival / awards stages",
          "Multi-language version control + dub coordination",
          "Talent + cast social ops (lead actors, director, supporting cast)",
          "Brand-guideline compliance + censor-safe QC",
        ],
      },
      {
        id: "monetisation",
        iconKey: "FaDollarSign",
        title: "Monetisation",
        blurb:
          "OTT campaigns, festival circuit, awards season, brand integrations.",
        deliverables: [
          "OTT release-window campaigns (Netflix, Prime, Hotstar, JioCinema)",
          "Festival circuit kits + screening promo",
          "Awards-season campaigns (Filmfare, IIFA, National)",
          "Brand integration deals + product-placement amplification",
        ],
      },
    ],
  },

  statsSection: {
    eyebrow: "Track record",
    heading: "Numbers, not promises.",
    items: [
      { prefix: "", value: 100, suffix: "+", label: "Films Promoted" },
      { prefix: "", value: 35, suffix: "K+", label: "Assets Shipped" },
      { prefix: "", value: 40, suffix: "B+", label: "Views Gained" },
      { prefix: "", value: 24, suffix: " hr", label: "Avg Turnaround" },
    ],
  },

  proofSection: {
    eyebrow: "Films we've already shipped Friday for",
    heading: "Real ops, not deck slides.",
    items: [
      {
        name: "Pushpa",
        niche: "Pan-India · Telugu / Hindi blockbuster",
        image: "/Images/solutions/pushpa.jpeg",
        handle: "Watch the launch",
        url:
          "https://www.youtube.com/results?search_query=Pushpa+The+Rise+Trailer",
        bullet:
          "Multi-language release campaign — trailer + song promos + social hooks driving pan-India theatrical pull.",
      },
      {
        name: "Kantara",
        niche: "Kannada · Pan-India breakout",
        image: "/Images/solutions/kantara.jpeg",
        handle: "Watch the launch",
        url:
          "https://www.youtube.com/results?search_query=Kantara+Movie+Trailer",
        bullet:
          "Regional-to-pan-India campaign — language kits + festival-circuit + OTT lifecycle marketing.",
      },
      {
        name: "Sardar Udham",
        niche: "Hindi · Premium prestige film",
        image: "/Images/solutions/sardar-udham.jpeg",
        handle: "Watch the launch",
        url:
          "https://www.youtube.com/results?search_query=Sardar+Udham+Trailer",
        bullet:
          "Prestige-positioning campaign — editorial-grade trailer + character spots + awards-season kit.",
      },
    ],
  },

  processSection: {
    eyebrow: "How it works",
    heading: "From first poster to opening Friday + beyond.",
    items: [
      {
        step: "01",
        title: "Discovery",
        body:
          "Release-window walkthrough — language slate, key beats per asset type, festival + OTT calendar, audience priorities. NDA + locked-cut access timelines agreed.",
      },
      {
        step: "02",
        title: "Asset playbook",
        body:
          "Per-language asset matrix — teaser, trailer, song promos, character spots, social cuts, premiere coverage. Calendar locked to your release date with milestone gates.",
      },
      {
        step: "03",
        title: "Ship",
        body:
          "Release-window execution. Cuts shipped to your timeline; multi-language kits in parallel. Premiere coverage + opening-Friday social ops in real time.",
      },
      {
        step: "04",
        title: "Lifecycle",
        body:
          "OTT handoff campaign + festival kit + awards-season prep. The Friday spend compounds across the full lifetime-value of the film, not just opening weekend.",
      },
    ],
  },

  testimonial: {
    // Stand-in voiced as a pan-India studio marketing director.
    // Avoids dollar figures (would feel inflated). Replace with
    // a real partner-studio quote when one is captured.
    quote:
      "Our trailer launch hit 50M views in 48 hours. Cocoma cut it, shipped it across 4 languages, and ran the paid promo in parallel — the campaign moved with us, not behind us.",
    author: "Marketing Director",
    meta: "Pan-India studio · 12 theatrical releases shipped with Cocoma",
    avatar: "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png",
  },

  faqSection: {
    eyebrow: "Common questions",
    heading: "The honest answers.",
    items: [
      {
        q: "Do you handle theatrical-only or full release lifecycle (OTT + festivals + awards)?",
        a:
          "Full lifecycle is the default. Theatrical opening is the loudest moment but not the only moment — OTT launch, festival circuit, awards-season campaigns each compound the film's revenue. We scope all four stages into the playbook unless you want us on theatrical only.",
      },
      {
        q: "Can you ship trailers + assets in multiple languages simultaneously?",
        a:
          "Yes — multi-language is the standard shape for pan-India releases. Hindi + Tamil + Telugu + Marathi + Kannada + Bengali + dubbed versions, each with its own promotional kit. Coordinated across pods so language launches don't queue.",
      },
      {
        q: "How fast can you turn around a teaser / trailer cut?",
        a:
          "First cut typically inside 5-7 days of locked footage. Subsequent revisions cycle within 24-48 hours. For tight release windows we can scope dedicated pods that cut in under 3 days; pricing reflects the urgency tier.",
      },
      {
        q: "Do you handle premiere event coverage and red-carpet content?",
        a:
          "Yes — premiere coverage is standard. On-ground capture (in-house or partner crew), real-time social ops during the event, day-after recap content. Cast / talent social ops coordinated with their respective teams.",
      },
      {
        q: "Can you work with our existing PR / media buying / agency partners?",
        a:
          "Yes. Cocoma typically sits as the production + creative engine; your existing PR / media buying / publicist partners stay on their lanes. We coordinate calendars, share assets, don't compete on lanes.",
      },
      {
        q: "Pricing — per-film or per-studio retainer?",
        a:
          "Both. Per-film works for occasional releases or studios testing the partnership. Per-studio annual retainer makes more sense at 4+ films/year — locks in pod capacity ahead of the slate, smooths cost across the calendar.",
      },
    ],
  },

  closer: {
    eyebrow: "One call, no obligation",
    eyebrowIconKey: "FaFilm",
    heading:
      "Want to see what your next theatrical release could look like with Cocoma's pods on?",
    pitch:
      "Anil takes the call personally. 15 minutes. We talk through your release calendar + the asset mix you'd need + send you the playbook regardless.",
    ctaLabel: "Book a 15-min call",
    ctaTo: "/ScheduleMeeting",
    avatar: "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png",
  },
},
  "podcasters": {
  hero: {
    eyebrow: "For Podcasters & Networks",
    headline: "Make every episode go further.",
    highlight: "go further",
    sub:
      "Cocoma's pods turn each recorded episode into a multi-format launch — full video edits, 5-15 vertical clips, thumbnails, sponsor cuts, paid promo. Audio is half the show now; we make sure the other half ships.",
    primaryCta: { label: "Book a 15-min call", to: "/ScheduleMeeting" },
    secondaryCta: { label: "See the playbook", to: "#prospect-house" },
  },

  painsSection: {
    eyebrow: "What weekly-episode cadence actually feels like",
    heading: "Sound familiar?",
    items: [
      {
        pain:
          "You record an episode and post the audio. Three days later YouTube + social haven't moved. The episode dies in your archive.",
        pillar: "Creative",
        fix:
          "Cocoma cuts every episode into a multi-format launch — full video, 5-15 vertical clips, thumbnails, audio visualisers, sponsor cuts. Episodes that ship like channel content, not just file uploads.",
      },
      {
        pain:
          "Spotify + Apple Podcasts discovery is broken. Without YouTube + social, even great content stays small.",
        pillar: "Marketing",
        fix:
          "YouTube + social distribution strategy briefed against your guest mix + audience data. Hooks land where audiences scroll; episode pages get the watch-time signals algorithms reward.",
      },
      {
        pain:
          "Guest scheduling, sponsor coordination, episode prep — solo hosts run a small business not a podcast. Hours add up; clips never ship.",
        pillar: "Management",
        fix:
          "Cocoma's ops team handles episode scheduling, guest outreach, sponsor coordination, transcription + SEO. You stay on the mic; the podcast operation runs.",
      },
      {
        pain:
          "Sponsorship rates are flat. Episodic CPM ad-reads aren't moving the needle anymore.",
        pillar: "Monetisation",
        fix:
          "Sponsorship deck creation, brand-deal negotiation, membership / course / product strategy. Move beyond episodic CPMs into recurring revenue tied to your audience.",
      },
    ],
  },

  houseSection: {
    eyebrow: "Cocoma's House",
    heading: "Four pieces. One team. Episode-as-launch.",
    sub:
      "Engage the whole stack as your show's launch engine, or plug us into a single pillar where you have a gap. Each pod runs in parallel — your release Mondays don't queue inside Cocoma.",
    pillars: [
      {
        id: "creative",
        iconKey: "FaPlay",
        title: "Creative",
        blurb:
          "Full episode video, vertical clips, thumbnails, audio visualisers, sponsor cuts.",
        deliverables: [
          "Full episode video edit (YouTube + Spotify Video)",
          "5-15 vertical clips per episode (Shorts / Reels / TikTok)",
          "Episode thumbnails + key art per platform",
          "Audio visualisers, chapter cards, motion timestamps",
        ],
      },
      {
        id: "marketing",
        iconKey: "FaSearch",
        title: "Marketing",
        blurb:
          "YouTube + social distribution, guest cross-promo, paid promo for breakouts.",
        deliverables: [
          "Per-episode YouTube + social launch plan",
          "Guest cross-promotion clip packs (their feed + yours)",
          "Episode hook + title + description SEO research",
          "Paid promotion for breakout / evergreen episodes",
        ],
      },
      {
        id: "management",
        iconKey: "FaCog",
        title: "Management",
        blurb:
          "Episode scheduling, guest outreach, sponsor coordination, transcription + SEO.",
        deliverables: [
          "Episode scheduling + always-on calendar",
          "Guest outreach + booking + brief coordination",
          "Sponsor coordination + delivery tracking",
          "Transcription + SEO-optimised episode descriptions",
        ],
      },
      {
        id: "monetisation",
        iconKey: "FaDollarSign",
        title: "Monetisation",
        blurb:
          "Sponsorship deck, brand deals, membership, course / product launches.",
        deliverables: [
          "Sponsorship deck + media kit (refreshed quarterly)",
          "Brand-deal outreach + negotiation",
          "Membership / Patreon / community strategy",
          "Course + merch + digital product launches",
        ],
      },
    ],
  },

  statsSection: {
    eyebrow: "Track record",
    heading: "Numbers, not promises.",
    items: [
      { prefix: "", value: 35, suffix: "K+", label: "Assets Shipped" },
      { prefix: "", value: 60, suffix: "+", label: "Channels Managed" },
      { prefix: "", value: 24, suffix: " hr", label: "Avg Turnaround" },
      { prefix: "", value: 40, suffix: "B+", label: "Views Gained" },
    ],
  },

  proofSection: {
    eyebrow: "Longform creator work we already ship",
    heading: "Real ops, not deck slides.",
    items: [
      {
        name: "Anil Mahato",
        niche: "Creator · Longform vlog content",
        image:
          "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png",
        handle: "@AnilMahato",
        url: "https://www.youtube.com/@AnilMahato",
        bullet:
          "Built end-to-end with Cocoma's stack — daily-shipping channel, longform-friendly format that maps directly onto podcast workflows.",
      },
      {
        name: "Shenaz Treasury",
        niche: "Creator · Lifestyle + interview-style",
        image: "/Images/solutions/SHENAZ-TREASURY.jpeg",
        handle: "@shenaztreasury..",
        url: "https://www.youtube.com/@shenaztreasury..",
        bullet:
          "Lifestyle + interview-style longform with consistent multi-format ship — same playbook podcasts need to grow.",
      },
      {
        name: "Project Happiness",
        niche: "Content brand · Longform community",
        image: "/Images/solutions/PROJECT-HAPPINESS.jpeg",
        handle: "@ProgettoHappiness",
        url: "https://www.youtube.com/@ProgettoHappiness",
        bullet:
          "Purpose-driven longform content + community building — the podcast model in adjacent shape.",
      },
    ],
  },

  processSection: {
    eyebrow: "How it works",
    heading: "From recording to launch in 48 hours.",
    items: [
      {
        step: "01",
        title: "Discovery",
        body:
          "Show format walkthrough — guest pipeline, current channel performance, audience data, monetisation goals. We map the high-leverage wins per episode.",
      },
      {
        step: "02",
        title: "Episode playbook",
        body:
          "Per-episode asset matrix — full video, clip count + hook strategy, thumbnail variants, social + paid plan. Aligned to your release cadence (weekly / bi-weekly / monthly).",
      },
      {
        step: "03",
        title: "Ship",
        body:
          "You record; we launch. Full episode + clips + thumbnails + social cuts ship within 48 hours of raw delivery. Guest cross-promo packs delivered same-day where applicable.",
      },
      {
        step: "04",
        title: "Optimise",
        body:
          "Per-episode performance review — clip CTR, watch-time, subscriber lift. Winners scaled into next episode's hook strategy. Sponsorship deck refreshed against the new numbers.",
      },
    ],
  },

  testimonial: {
    // Stand-in voiced as a mid-size podcast host. Replace
    // with a real partner-podcast quote when one is captured.
    quote:
      "My audio numbers were stuck. Cocoma turned every episode into a launch — clips on Reels, full video on YouTube, thumbnails that actually pulled. Subs doubled in 6 months and the sponsor pipeline followed.",
    author: "Podcast Host",
    meta: "Mid-size Indian podcast · 100+ episodes shipped with Cocoma",
    avatar: "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png",
  },

  faqSection: {
    eyebrow: "Common questions",
    heading: "The honest answers.",
    items: [
      {
        q: "Do you handle full video edits or just clips?",
        a:
          "Both. Full video for YouTube + Spotify Video, plus 5-15 vertical clips for Shorts / Reels / TikTok per episode. Thumbnails per platform. Most podcasts run video + audio in parallel now; we cover the whole spread.",
      },
      {
        q: "How many clips per episode?",
        a:
          "Standard package: 5-10 vertical clips per episode. Premium: 15+ with audience-targeted variants (different hooks for different segments). Bundled retainer is more efficient than per-clip for shows shipping weekly.",
      },
      {
        q: "Can you handle our guest's social distribution?",
        a:
          "Yes — guest cross-promotion is core. Each guest gets a tailored clip pack for their feed, coordinated with their team or PR. Drives discovery on the guest's channels back to your podcast.",
      },
      {
        q: "Do you work with audio-only podcasts or do we need to add video?",
        a:
          "Both. Audio-only podcasts get audio visualisers + motion timestamps for YouTube discovery. But video-first podcasts grow faster now — if you're considering the switch, the discovery audit will quantify the lift you'd see before you commit.",
      },
      {
        q: "How does sponsorship deck creation work?",
        a:
          "Your sponsorship deck is your podcast's media kit — audience demos, CPM benchmarks, episode performance, host bio, past sponsor results. We build it, refresh it quarterly, and brief our brand-deal outreach against it.",
      },
      {
        q: "Pricing — per-episode or monthly retainer?",
        a:
          "Monthly retainer scaled to your episode cadence. Weekly shows run higher than bi-weekly; the retainer covers x clips per episode + thumbnails + social calendar + monthly performance review. Per-episode pricing is available for irregular release schedules.",
      },
    ],
  },

  closer: {
    eyebrow: "One call, no obligation",
    eyebrowIconKey: "FaMicrophone",
    heading:
      "Want to see what your episode launches could look like with Cocoma's pods on?",
    pitch:
      "Anil takes the call personally. 15 minutes. We talk through your show + the per-episode launch plan + send you the audit deck regardless.",
    ctaLabel: "Book a 15-min call",
    ctaTo: "/ScheduleMeeting",
    avatar: "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png",
  },
},
  "d2c-brands": {
  hero: {
    eyebrow: "For D2C Brands",
    headline: "Test more. Convert more.",
    highlight: "Convert more",
    sub:
      "Cocoma's pods give your performance team 50+ A/B-ready ad creatives per campaign. Full-funnel content from hook to checkout, briefed against your conversion data — so every test moves ROAS, not just CTR.",
    primaryCta: { label: "Book a 15-min call", to: "/ScheduleMeeting" },
    secondaryCta: { label: "See the playbook", to: "#prospect-house" },
  },

  painsSection: {
    eyebrow: "What scaling paid actually feels like",
    heading: "Sound familiar?",
    items: [
      {
        pain:
          "Your performance team needs 50+ ad variants per campaign for proper testing. In-house design can't ship that volume.",
        pillar: "Creative",
        fix:
          "Cocoma's pods are built for variant velocity — 50+ A/B-ready ads per campaign across formats (static, motion, UGC-style, native social). Same brand voice, ten times the test cell coverage.",
      },
      {
        pain:
          "Hooks that catch don't always convert. ROAS plateaus between TOFU eyeballs and BOFU checkouts.",
        pillar: "Marketing",
        fix:
          "Full-funnel creative — TOFU attention hooks, MOFU consideration content, BOFU offer-driven CTAs. Each layer briefed against your funnel data, not just CTR.",
      },
      {
        pain:
          "UGC + creator collabs are a logistical nightmare. Influencer ops eats half your team's week.",
        pillar: "Management",
        fix:
          "Cocoma manages creator partnerships end-to-end — outreach, briefs, content QC, usage rights, performance reporting. You see the wins; we run the ops.",
      },
      {
        pain:
          "Most agencies bill on output, not outcome. ROAS doesn't move when creatives go stale.",
        pillar: "Monetisation",
        fix:
          "Performance creative briefed on your data — every test designed to move ROAS, not just look good. Stale creatives flagged + refreshed before fatigue hits the cohort.",
      },
    ],
  },

  houseSection: {
    eyebrow: "Cocoma's House",
    heading: "Four pieces. One team. Built for ROAS.",
    sub:
      "Engage the whole stack as your full-funnel content engine, or plug us into a single pillar where you have a gap. Each pod runs in parallel — your test cells don't queue inside Cocoma.",
    pillars: [
      {
        id: "creative",
        iconKey: "FaPlay",
        title: "Creative",
        blurb:
          "Product films, lifestyle reels, UGC compilation, ad-as-a-service.",
        deliverables: [
          "Product films + hero brand reels",
          "Lifestyle + UGC-style ad creative at volume",
          "Static + motion + carousel ad variants",
          "Lookbooks, site banners, landing-page hero assets",
        ],
      },
      {
        id: "marketing",
        iconKey: "FaSearch",
        title: "Marketing",
        blurb:
          "Full-funnel creative briefs, performance-driven variants, paid promo support.",
        deliverables: [
          "TOFU / MOFU / BOFU creative per campaign",
          "50+ A/B variants per ad set, ready to test",
          "Multi-platform repurposing (Meta, YT, TikTok, Pinterest)",
          "Audience-targeted creative variants",
        ],
      },
      {
        id: "management",
        iconKey: "FaCog",
        title: "Management",
        blurb:
          "Asset library, creator partnerships, social calendar, brand QC.",
        deliverables: [
          "Centralised creative + UGC asset library",
          "Creator / influencer partnership ops end-to-end",
          "Always-on social calendar + community ops",
          "Brand-guideline compliance + multi-pass QC",
        ],
      },
      {
        id: "monetisation",
        iconKey: "FaDollarSign",
        title: "Monetisation",
        blurb:
          "ROAS-tuned creative, retargeting variants, retention content, LTV plays.",
        deliverables: [
          "Performance creative briefed on your funnel data",
          "Retargeting variants tuned to drop-off points",
          "Post-purchase + retention content (email, SMS, IG)",
          "LTV-driving content series for high-AOV segments",
        ],
      },
    ],
  },

  statsSection: {
    eyebrow: "Track record",
    heading: "Numbers, not promises.",
    items: [
      { prefix: "", value: 35, suffix: "K+", label: "Assets Shipped" },
      { prefix: "", value: 50, suffix: "+", label: "Variants Per Campaign" },
      { prefix: "", value: 60, suffix: "+", label: "Brands & Channels" },
      { prefix: "", value: 40, suffix: "B+", label: "Views Gained" },
    ],
  },

  proofSection: {
    eyebrow: "Brands we already ship for",
    heading: "Real ops, not deck slides.",
    items: [
      {
        name: "Tata EV",
        niche: "D2C · Auto / Sustainability",
        image: "/Images/solutions/TATAEV.jpeg",
        handle: "@tata.evofficial",
        url: "https://www.youtube.com/@tata.evofficial",
        bullet:
          "Hero brand films + variant-led social content for India's premium EV brand.",
      },
      {
        name: "Prime Video India",
        niche: "D2C · Subscription streaming",
        image: "/Images/solutions/prime-video-india.jpeg",
        handle: "@PrimeVideoIN",
        url: "https://www.youtube.com/@PrimeVideoIN",
        bullet:
          "Conversion-tuned promo + retargeting content driving subscription signups across the slate.",
      },
      {
        name: "Project Happiness",
        niche: "Consumer · Content brand",
        image: "/Images/solutions/PROJECT-HAPPINESS.jpeg",
        handle: "@ProgettoHappiness",
        url: "https://www.youtube.com/@ProgettoHappiness",
        bullet:
          "Full-funnel content engine — hook reels through community-building long-form.",
      },
    ],
  },

  processSection: {
    eyebrow: "How it works",
    heading: "From a brief to 50 variants in a week.",
    items: [
      {
        step: "01",
        title: "Brief",
        body:
          "Send us your campaign goal, target audience, and conversion data so far. NDA + brand-guideline pack synced. Asset library spun up.",
      },
      {
        step: "02",
        title: "Variant matrix",
        body:
          "We map the test plan — formats × audiences × hooks × offers — into a 50+ creative matrix designed for statistical significance, not vanity volume.",
      },
      {
        step: "03",
        title: "Ship",
        body:
          "Creatives delivered in batches across the testing cycle. Static + motion + UGC-style — ready to drop into Meta / YouTube / TikTok ad managers.",
      },
      {
        step: "04",
        title: "Optimise",
        body:
          "Bi-weekly performance review. Stale creatives flagged + refreshed before fatigue hits. Winning patterns scaled into the next campaign's variant matrix.",
      },
    ],
  },

  testimonial: {
    // Stand-in voiced as a D2C growth lead. Replace with a
    // real quote when one is captured from a D2C partner brand.
    quote:
      "Our ROAS plateau finally broke when Cocoma's pods replaced our agency. They ship the variant volume our performance team actually needs to test — and the winners scale.",
    author: "Growth Lead",
    meta: "Mid-stage D2C brand · 50+ ad variants per quarter with Cocoma",
    avatar: "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png",
  },

  faqSection: {
    eyebrow: "Common questions",
    heading: "The honest answers.",
    items: [
      {
        q: "How fast can you ship 50+ ad variants?",
        a:
          "First batch (10–15 variants) inside 5 days of brief; full 50+ matrix typically inside 2 weeks. Post-onboarding the cycle compresses — once we know your brand voice, subsequent campaigns ship at half the time.",
      },
      {
        q: "Do you handle UGC + creator partnerships?",
        a:
          "Yes — end-to-end. Outreach, briefs, content QC, usage-rights paperwork, performance reporting. We typically run a creator pool of 20–50 per brand depending on category, with monthly performance reviews to swap underperformers.",
      },
      {
        q: "Can you work with our existing media buyer?",
        a:
          "Yes. We're typically the creative engine; your media buyer stays on media. We brief against the data they're seeing, ship variants, and align on what's tested next. Weekly creative-x-media syncs by default.",
      },
      {
        q: "Do you brief against performance data?",
        a:
          "Yes — that's the whole point. Stale-creative-fatigue is the #1 reason ROAS drops, and the only way to fix it is to brief next-up creative against current campaign data. We work off your Meta / GA / Shopify reports directly.",
      },
      {
        q: "What if a creative direction isn't working?",
        a:
          "We swap. The bi-weekly performance review flags underperforming variants — we cut them, learn from the winners, and brief the next matrix off what's working. No ego in creative; the data decides.",
      },
      {
        q: "Pricing — per-asset or retainer?",
        a:
          "Retainer-based, scoped to monthly variant volume. Smaller engagements run 50–100 variants/month; larger run 200+. We'll quote against your campaign cadence after a discovery call.",
      },
    ],
  },

  closer: {
    eyebrow: "One call, no obligation",
    eyebrowIconKey: "FaShoppingBag",
    heading:
      "Want to see what your ad performance could look like with 50+ variants per campaign?",
    pitch:
      "Anil takes the call personally. 15 minutes. We talk through your acquisition stack + the variant volume you'd need + send you the rate-card regardless.",
    ctaLabel: "Book a 15-min call",
    ctaTo: "/ScheduleMeeting",
    avatar: "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png",
  },
},
  "real-estate-brands": {
  hero: {
    eyebrow: "For Real Estate Brands",
    headline: "Sell the lifestyle, not just the floor plan.",
    highlight: "the lifestyle",
    sub:
      "Cocoma's production team ships film-grade real estate content — cinematic walkthroughs, aerial reels, area stories, broker enablement assets. Same quality bar as the entertainment IPs your buyers watch on prime-time.",
    primaryCta: { label: "Book a 15-min call", to: "/ScheduleMeeting" },
    secondaryCta: { label: "See the playbook", to: "#prospect-house" },
  },

  painsSection: {
    eyebrow: "What premium-property marketing actually feels like",
    heading: "Sound familiar?",
    items: [
      {
        pain:
          "Property listings are dull. Floor plans + 5 staged photos don't sell ₹3-5 crore projects.",
        pillar: "Creative",
        fix:
          "Cinematic walkthroughs, aerial reels, lifestyle stories, area-feel content. Cocoma takes whatever footage you have (or coordinates local capture crews) and finishes it to entertainment-grade quality.",
      },
      {
        pain:
          "You're launching in 5 cities and one ad doesn't fit all of them. Hyperlocal creative is impossible to ship at volume.",
        pillar: "Marketing",
        fix:
          "Per-city, per-project creative briefed against local audience data. Bangalore-specific reels for Bangalore launches, Mumbai-specific for Mumbai. Variant volume baked into every project.",
      },
      {
        pain:
          "Multi-format chaos — same project needs print brochures, website hero films, social cuts, broker decks, virtual tours. Asset library is a mess.",
        pillar: "Management",
        fix:
          "Centralised asset library per project. Brand-guideline compliance across formats. Brokers get curated decks; social gets cuts; web gets hero films — all from one source of truth.",
      },
      {
        pain:
          "Cost-per-qualified-lead is high. Most form-fills don't convert to site visits. Need higher-intent traffic.",
        pillar: "Monetisation",
        fix:
          "Performance creative tuned to high-intent triggers — virtual-tour gates, site-visit CTAs, broker-handoff funnels. Quality leads over volume in the leadgen pipeline.",
      },
    ],
  },

  houseSection: {
    eyebrow: "Cocoma's House",
    heading: "Four pieces. One team. Film-grade output.",
    sub:
      "Engage the whole stack as your project launch engine, or plug us into a single pillar where you have a gap. Each pod runs in parallel — your launch dates don't queue inside Cocoma.",
    pillars: [
      {
        id: "creative",
        iconKey: "FaPlay",
        title: "Creative",
        blurb:
          "Cinematic walkthroughs, aerial reels, lifestyle stories, broker decks.",
        deliverables: [
          "Cinematic project walkthroughs + aerial reels",
          "Lifestyle + area-feel reels (vertical + horizontal)",
          "Brochure + website hero design",
          "Broker enablement decks + sales-pitch assets",
        ],
      },
      {
        id: "marketing",
        iconKey: "FaSearch",
        title: "Marketing",
        blurb:
          "Per-city campaigns, geo-targeted leadgen, broker referral creative.",
        deliverables: [
          "Per-city, per-project creative kits",
          "Geo-targeted paid promo (Meta, YouTube, native)",
          "A/B variant testing on hero hooks",
          "Broker referral campaigns + co-branded assets",
        ],
      },
      {
        id: "management",
        iconKey: "FaCog",
        title: "Management",
        blurb:
          "Multi-project asset library, broker portal, social calendar, QC.",
        deliverables: [
          "Centralised per-project asset library",
          "Broker portal content management",
          "Always-on project social calendar",
          "Brand-guideline compliance across formats",
        ],
      },
      {
        id: "monetisation",
        iconKey: "FaDollarSign",
        title: "Monetisation",
        blurb:
          "High-intent leadgen, virtual-tour gating, retargeting, broker funnels.",
        deliverables: [
          "Virtual-tour gate creative + funnel design",
          "Site-visit CTA + booking-flow assets",
          "Retargeting variants by funnel stage",
          "Broker-driven lead pipeline content",
        ],
      },
    ],
  },

  statsSection: {
    eyebrow: "Track record",
    heading: "Numbers, not promises.",
    items: [
      { prefix: "", value: 35, suffix: "K+", label: "Assets Shipped" },
      { prefix: "", value: 60, suffix: "+", label: "Brands & Channels" },
      { prefix: "", value: 24, suffix: " hr", label: "Avg Turnaround" },
      { prefix: "", value: 40, suffix: "B+", label: "Views Gained" },
    ],
  },

  proofSection: {
    eyebrow: "Brands we already ship film-grade for",
    heading: "Real ops, not deck slides.",
    items: [
      {
        name: "Tata EV",
        niche: "Premium · Brand storytelling",
        image: "/Images/solutions/TATAEV.jpeg",
        handle: "@tata.evofficial",
        url: "https://www.youtube.com/@tata.evofficial",
        bullet:
          "Cinematic brand films for India's premium EV brand — same production caliber translates straight to luxury real estate.",
      },
      {
        name: "Prime Video India",
        niche: "OTT · Entertainment-grade production",
        image: "/Images/solutions/prime-video-india.jpeg",
        handle: "@PrimeVideoIN",
        url: "https://www.youtube.com/@PrimeVideoIN",
        bullet:
          "Edits + thumbnails + shorts at the quality bar that defines premium content. Translates directly to high-end project storytelling.",
      },
      {
        name: "IMDb",
        niche: "Global · Editorial visual standards",
        image: "/Images/solutions/imdb.jpeg",
        handle: "@imdb",
        url: "https://www.youtube.com/@imdb",
        bullet:
          "World-class visual standards. The same eye that lands editorial content lands premium property reels.",
      },
    ],
  },

  processSection: {
    eyebrow: "How it works",
    heading: "From project pipeline to launch engine in motion.",
    items: [
      {
        step: "01",
        title: "Discovery",
        body:
          "Project portfolio walkthrough — target buyer profile per project, launch calendar, current creative gaps. We map the high-leverage wins per launch.",
      },
      {
        step: "02",
        title: "Asset plan",
        body:
          "Per-project asset list — hero film, social cuts, brochure, broker deck, virtual-tour gate creative. Geo-targeted variant matrix per city. Calendar by week.",
      },
      {
        step: "03",
        title: "Production",
        body:
          "Edit + design + finish across formats. Existing footage ingested + finished, OR local capture crews coordinated where new material is needed. Every asset goes through brand QC.",
      },
      {
        step: "04",
        title: "Distribution",
        body:
          "Paid promo rollout, broker enablement portal updates, always-on social calendar, lead-gen funnel optimisation. Per-launch retro into the next project's playbook.",
      },
    ],
  },

  testimonial: {
    // Stand-in voiced as a marketing director at a premium
    // residential developer. Replace with a real RE partner
    // quote when one is captured.
    quote:
      "Our pre-launch reels did 10× the engagement of our previous agency's. Cocoma made our project look like a film — buyers were booking site visits before we'd even gone live with paid.",
    author: "Marketing Director",
    meta: "Premium residential developer · 5 cities · 200+ assets shipped",
    avatar: "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png",
  },

  faqSection: {
    eyebrow: "Common questions",
    heading: "The honest answers.",
    items: [
      {
        q: "Do you handle on-ground shoots or only post-production?",
        a:
          "Both, with flexibility. Cocoma's core strength is post-production + finishing — but we coordinate local capture crews (drone, walkthrough cinematography, lifestyle shoots) wherever new material is needed. We can also work with footage you've already shot, finishing it to entertainment-grade.",
      },
      {
        q: "Can you work hyperlocal — separate creative per city?",
        a:
          "Yes. Per-city per-project is the typical shape. A 5-city launch gets 5 distinct creative kits — same brand voice, locally-relevant audience cuts. Hindi + regional language creative shipped end-to-end (Tamil, Telugu, Marathi, Bengali, Punjabi).",
      },
      {
        q: "What about virtual tours and 360° / Matterport-style content?",
        a:
          "We coordinate the capture (in-house or partner crew) and finish the deliverables — embedding into your website, gating behind email capture, integrating with your CRM lead flow. Full leadgen-ready, not just a viewer.",
      },
      {
        q: "Do you handle broker enablement collateral?",
        a:
          "Yes. Broker-facing assets are a core deliverable — pitch decks, walkthrough video reels for site visits, project comparison charts, co-branded social content. Centralised in a broker portal so your sales team always has the latest.",
      },
      {
        q: "How fast can you ship a launch package?",
        a:
          "Standard project launch package (hero film + 10 social cuts + brochure + broker deck) lands inside 3 weeks of brief. Faster if footage is already shot. The first project takes longest; subsequent launches in the same brand voice ship in half the time.",
      },
      {
        q: "Can you brief against our leadgen / CRM data?",
        a:
          "Yes — that's the whole point of the Monetisation pillar. We brief next-up creative against your conversion data (which projects are converting site visits, which audience cuts are dropping at form-fill). Stale creative gets refreshed before fatigue hits the cohort.",
      },
    ],
  },

  closer: {
    eyebrow: "One call, no obligation",
    eyebrowIconKey: "FaHome",
    heading:
      "Want to see what your next project launch could look like with film-grade content?",
    pitch:
      "Anil takes the call personally. 15 minutes. We talk through your project pipeline + the asset mix you'd need + send you the rate-card regardless.",
    ctaLabel: "Book a 15-min call",
    ctaTo: "/ScheduleMeeting",
    avatar: "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png",
  },
},
  "educational-hubs": {
  hero: {
    eyebrow: "For Universities, Institutes & EdTech",
    headline: "Win students with content.",
    highlight: "students",
    sub:
      "Cocoma's pods build the content engine higher-ed and EdTech brands need — admissions reels, campus stories, faculty + alumni journeys, course previews, performance creative for student acquisition. Same playbook, scale-tuned to your enrolment cycle.",
    primaryCta: { label: "Book a 15-min call", to: "/ScheduleMeeting" },
    secondaryCta: { label: "See the playbook", to: "#prospect-house" },
  },

  painsSection: {
    eyebrow: "What admissions cycle actually feels like",
    heading: "Sound familiar?",
    items: [
      {
        pain:
          "Admissions marketing is annual but creative production is constant. In-house teams burn out before peak cycle hits.",
        pillar: "Creative",
        fix:
          "A trained edit + design team that ships campus reels, admissions ads, faculty profiles, and student testimonials at scale. Peak cycle covered without panic-hiring contractors.",
      },
      {
        pain:
          "Generic agencies don't get higher-ed nuance — alumni stories, course launches, recruitment events, faculty profiles each need different beats.",
        pillar: "Marketing",
        fix:
          "Per-audience playbooks (parents, applicants, employers, alumni, prospective faculty) briefed against your data, not a template. Same nuance the entertainment IPs we ship for already demand.",
      },
      {
        pain:
          "Multi-department content requests pile up — admissions, faculty, alumni relations, placement cell, marketing — and asset libraries fragment across teams.",
        pillar: "Management",
        fix:
          "Centralised asset library + project lead + brand-guideline QC. One source of truth across departments; no duplicated shoots, no version drift across teams.",
      },
      {
        pain:
          "Student-acquisition CAC keeps rising. Course-preview content + retargeting variants can't ship at the volume your performance team needs to test.",
        pillar: "Monetisation",
        fix:
          "Variant-led performance creative for acquisition — course previews, demo class cuts, testimonial reels, retargeting variants by funnel stage. Briefed against your funnel data, refreshed before fatigue hits.",
      },
    ],
  },

  houseSection: {
    eyebrow: "Cocoma's House",
    heading: "Four pieces. One team. Whole-cycle coverage.",
    sub:
      "Engage the whole stack as your annual content engine, or plug us into a single pillar where you have a gap. Each pod runs in parallel — your peak admissions weeks don't queue inside Cocoma.",
    pillars: [
      {
        id: "creative",
        iconKey: "FaPlay",
        title: "Creative",
        blurb:
          "Campus reels, admissions ads, faculty profiles, course previews, virtual tours.",
        deliverables: [
          "Campus reels + lifestyle / day-in-the-life content",
          "Admissions ads, demo class cuts, course previews",
          "Faculty profiles + student / alumni testimonial reels",
          "Virtual tours + brochure / website hero design",
        ],
      },
      {
        id: "marketing",
        iconKey: "FaSearch",
        title: "Marketing",
        blurb:
          "Per-audience playbooks, admissions-cycle campaigns, performance creative.",
        deliverables: [
          "Per-audience playbooks (parents, applicants, employers, alumni)",
          "Admissions cycle launch + always-on brand campaigns",
          "Performance creative variants for student acquisition",
          "Multi-platform repurposing (YouTube, Meta, Instagram, LinkedIn)",
        ],
      },
      {
        id: "management",
        iconKey: "FaCog",
        title: "Management",
        blurb:
          "Multi-department coordination, asset library, brand QC, social calendar.",
        deliverables: [
          "Centralised institution asset library",
          "Multi-department point-of-contact (admissions / alumni / placement / marketing)",
          "Always-on social calendar across channels",
          "Brand-guideline compliance + multi-pass QC",
        ],
      },
      {
        id: "monetisation",
        iconKey: "FaDollarSign",
        title: "Monetisation",
        blurb:
          "Performance creative for acquisition, donor + alumni engagement, placement-driven content.",
        deliverables: [
          "Performance creative briefed on student-acquisition funnel data",
          "Retargeting variants by funnel stage (awareness → application → enrolment)",
          "Donor + alumni engagement content (for universities)",
          "Placement-outcome storytelling for credibility",
        ],
      },
    ],
  },

  statsSection: {
    eyebrow: "Track record",
    heading: "Numbers, not promises.",
    items: [
      { prefix: "", value: 35, suffix: "K+", label: "Assets Shipped" },
      { prefix: "", value: 60, suffix: "+", label: "Brands & Channels" },
      { prefix: "", value: 24, suffix: " hr", label: "Avg Turnaround" },
      { prefix: "", value: 40, suffix: "B+", label: "Views Gained" },
    ],
  },

  proofSection: {
    eyebrow: "Brands we already ship at this caliber",
    heading: "Real ops, not deck slides.",
    items: [
      {
        name: "Tata EV",
        niche: "Premium · Innovation storytelling",
        image: "/Images/solutions/TATAEV.jpeg",
        handle: "@tata.evofficial",
        url: "https://www.youtube.com/@tata.evofficial",
        bullet:
          "Premium brand storytelling for India's flagship EV brand — same caliber translates straight to flagship university and institute work.",
      },
      {
        name: "Prime Video India",
        niche: "OTT · Entertainment-grade production",
        image: "/Images/solutions/prime-video-india.jpeg",
        handle: "@PrimeVideoIN",
        url: "https://www.youtube.com/@PrimeVideoIN",
        bullet:
          "Edits + thumbnails + shorts at the quality bar today's students expect from any content they watch on their feed.",
      },
      {
        name: "IMDb",
        niche: "Global · Editorial visual standards",
        image: "/Images/solutions/imdb.jpeg",
        handle: "@imdb",
        url: "https://www.youtube.com/@imdb",
        bullet:
          "World-class editorial visuals. The standard your campus reels and admissions content can match.",
      },
    ],
  },

  processSection: {
    eyebrow: "How it works",
    heading: "From institution mission to admissions engine in motion.",
    items: [
      {
        step: "01",
        title: "Discovery",
        body:
          "Institution mission walkthrough — target student profiles, admissions cycle calendar, current content gaps, audience priorities (parents vs applicants vs employers). NDA + brand-guideline pack synced.",
      },
      {
        step: "02",
        title: "Annual content calendar",
        body:
          "Calendar tied to your admissions cycle — pre-cycle ramp (4-6 weeks before peak), peak-cycle volume coverage, post-cycle alumni / faculty / placement content. Always-on brand work threaded through.",
      },
      {
        step: "03",
        title: "Ship",
        body:
          "Pods running in parallel — campus reels, admissions ads, course previews, performance creative. Per-audience cuts (parents-Hindi, applicants-English, etc.). Real-time delivery during peak cycle.",
      },
      {
        step: "04",
        title: "Optimise",
        body:
          "Per-cycle retro — what hooked applications, what dropped at form-fill, which audience cuts converted. Insights baked into next year's calendar before peak hits again.",
      },
    ],
  },

  testimonial: {
    // Stand-in voiced as a tier-1 university marketing
    // director (closest to the largest target segment for
    // this page). Replace when a real higher-ed / EdTech
    // partner quote is captured.
    quote:
      "When admissions season hits, we used to scramble — three different agencies, fragmented assets, panic edits at midnight. Cocoma built our content engine — peak-cycle volume without the panic, brand-grade quality every time.",
    author: "Director of Marketing",
    meta: "Tier-1 Indian university · 200+ admissions assets shipped per cycle",
    avatar: "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png",
  },

  faqSection: {
    eyebrow: "Common questions",
    heading: "The honest answers.",
    items: [
      {
        q: "Do you work with both universities and EdTech companies?",
        a:
          "Both — and the playbook flexes. Universities lean into brand storytelling + admissions marketing + alumni engagement. EdTech leans into performance creative + course-preview content + retargeting at CAC scale. Same four pillars; different emphasis per institution.",
      },
      {
        q: "How do you handle the admissions cycle volume spikes?",
        a:
          "Annual content calendar tied to your admissions cycle. Pods scale up 4-6 weeks before peak (typically October-February for spring intake, March-July for autumn intake), then steady-state for always-on brand work. No panic-hiring; the team is already there.",
      },
      {
        q: "Can you coordinate across admissions, faculty, alumni, and placement teams?",
        a:
          "Yes — multi-department coordination is the typical shape. Each department gets a dedicated point of contact in our project lead structure; centralised asset library means no duplicated shoots, no version drift across teams.",
      },
      {
        q: "Do you ship in regional languages (Hindi, Tamil, Telugu, Bengali, etc.)?",
        a:
          "Yes. Hindi is heaviest, but Tamil, Telugu, Marathi, Bengali, Punjabi, Kannada are all standard. International student outreach in English + select non-Indian languages on request.",
      },
      {
        q: "What about virtual campus tours and 360° / Matterport-style content?",
        a:
          "Coordinated end-to-end. Capture (in-house drone team or partner crew on the ground), edit + finish, embed into your website + lead-gen funnel. Not just a video — a tool that gates application form-fills behind a high-quality experience.",
      },
      {
        q: "Pricing — per-project or annual retainer?",
        a:
          "Annual retainer is typical for universities + institutes (admissions cycle is annual). Per-project works for one-off launches (new course, new building, big event). EdTech usually runs on monthly retainer scaled to ad spend + variant volume.",
      },
    ],
  },

  closer: {
    eyebrow: "One call, no obligation",
    eyebrowIconKey: "FaGraduationCap",
    heading:
      "Want to see what your next admissions cycle could look like with Cocoma's pods on?",
    pitch:
      "Anil takes the call personally. 15 minutes. We talk through your content needs + the admissions cycle calendar + send you the playbook regardless.",
    ctaLabel: "Book a 15-min call",
    ctaTo: "/ScheduleMeeting",
    avatar: "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png",
  },
},
  "international-agencies": {
  hero: {
    eyebrow: "For International Agencies",
    headline: "Wake up to delivered work.",
    highlight: "delivered work",
    sub:
      "Cocoma's India-based production team handles your overflow — edits, motion, thumbnails, design, social cuts — overnight in IST. White-label, retained team, 50,000+ assets shipped across entertainment, OTT and brand campaigns.",
    primaryCta: { label: "Book a 15-min call", to: "/ScheduleMeeting" },
    secondaryCta: { label: "See the playbook", to: "#prospect-house" },
  },

  painsSection: {
    eyebrow: "What scaling an agency actually feels like",
    heading: "Sound familiar?",
    items: [
      {
        pain:
          "Production capacity caps how much retainer work you can take. Hiring senior editors in NY / London is expensive and slow.",
        pillar: "Creative",
        fix:
          "A fully-trained editing + motion team that's already shipped 50,000+ assets for entertainment, OTT and brand clients. Plug in instantly, scale your retainer book without the hire.",
      },
      {
        pain:
          "Performance campaigns need 20+ ad variants per set for proper testing. Your team can't ship that volume in time.",
        pillar: "Marketing",
        fix:
          "Variant-led production at scale — 20+ A/B-ready creative iterations per ad set, briefed against your performance data. Compounds CTR and lowers CAC for your retainer clients.",
      },
      {
        pain:
          "Asset libraries are a mess. Brand guidelines drift. Versions get lost. Freelancers ghost mid-revision.",
        pillar: "Management",
        fix:
          "Dedicated project lead + branded asset library + version control. Retained team — same faces week to week, weekly stand-ups in your time-zone, no ghosting.",
      },
      {
        pain:
          "Margins get eaten by senior salaries and freelancer rates. Hard to grow profit even when retainer revenue grows.",
        pillar: "Monetisation",
        fix:
          "Retainer pricing built for margin growth. Western-grade quality bar, sustainable cost structure, capacity scales without the hiring ramp.",
      },
    ],
  },

  houseSection: {
    eyebrow: "Cocoma's House",
    heading: "Four pieces. One team. White-label.",
    sub:
      "Engage the whole stack as your offshore production engine, or plug us into a single pillar where you have a gap. White-label is the default — your brand stays on every deliverable, Cocoma never appears in any client-facing asset.",
    pillars: [
      {
        id: "creative",
        iconKey: "FaPlay",
        title: "Creative",
        blurb:
          "Edits, motion, design, social cuts — production-grade output, white-label.",
        deliverables: [
          "Long-form & short-form editing",
          "Motion graphics, lower-thirds, VFX",
          "Thumbnail / key-art / banner design",
          "Native social cuts per platform spec",
        ],
      },
      {
        id: "marketing",
        iconKey: "FaSearch",
        title: "Marketing",
        blurb:
          "Variant-led ad creative, performance ops, multi-platform repurposing.",
        deliverables: [
          "20+ A/B-ready ad variants per set",
          "Performance creative briefed on your data",
          "Multi-platform repurposing (Meta, YT, TikTok, LinkedIn)",
          "Programmatic creative ops at volume",
        ],
      },
      {
        id: "management",
        iconKey: "FaCog",
        title: "Management",
        blurb:
          "Project lead, asset library, version control, brand-guideline QC.",
        deliverables: [
          "Dedicated project lead + weekly stand-ups",
          "Branded asset library + version control",
          "White-label deliverables (your name, our work)",
          "Brand-guideline compliance + multi-pass QC",
        ],
      },
      {
        id: "monetisation",
        iconKey: "FaDollarSign",
        title: "Monetisation",
        blurb:
          "Retainer economics, overnight turnaround, capacity scaling.",
        deliverables: [
          "Retainer pricing optimised for margin growth",
          "12–24 hr overnight turnaround (IST → EST/GMT)",
          "Capacity scaling without hiring lag",
          "Multi-client portfolio coverage in parallel",
        ],
      },
    ],
  },

  statsSection: {
    eyebrow: "Track record",
    heading: "Numbers, not promises.",
    items: [
      { prefix: "", value: 35, suffix: "K+", label: "Assets Shipped" },
      { prefix: "", value: 60, suffix: "+", label: "Brands & Channels" },
      { prefix: "", value: 24, suffix: " hr", label: "Avg Turnaround" },
      { prefix: "", value: 40, suffix: "B+", label: "Views Gained" },
    ],
  },

  proofSection: {
    eyebrow: "Brands we already ship for",
    heading: "Real ops, not deck slides.",
    items: [
      {
        name: "IMDb",
        niche: "Global · Entertainment IP",
        image: "/Images/solutions/imdb.jpeg",
        handle: "@imdb",
        url: "https://www.youtube.com/@imdb",
        bullet:
          "Editorial-grade cuts + thumbnails for the world's biggest entertainment IP database.",
      },
      {
        name: "Prime Video India",
        niche: "OTT · International streaming",
        image: "/Images/solutions/prime-video-india.jpeg",
        handle: "@PrimeVideoIN",
        url: "https://www.youtube.com/@PrimeVideoIN",
        bullet:
          "Edit + design partner across the OTT slate — entertainment-grade output at scale.",
      },
      {
        name: "Tata EV",
        niche: "Brand · Automotive / Sustainability",
        image: "/Images/solutions/TATAEV.jpeg",
        handle: "@tata.evofficial",
        url: "https://www.youtube.com/@tata.evofficial",
        bullet:
          "Cross-vertical brand campaign work — auto + sustainability storytelling.",
      },
    ],
  },

  processSection: {
    eyebrow: "How it works",
    heading: "From a brief at 5pm to deliverables at 9am.",
    items: [
      {
        step: "01",
        title: "Brief",
        body:
          "Send us your retainer scope, brand guidelines, deadlines. NDA signed mutually before anything sensitive moves.",
      },
      {
        step: "02",
        title: "Match",
        body:
          "Pod assigned with the right skill mix — editing, motion, design, ad creative. Calendar synced to your time-zone, weekly stand-up scheduled.",
      },
      {
        step: "03",
        title: "Ship",
        body:
          "Overnight delivery cycles in IST. Brief at 5pm EST → deliverables in your inbox by 9am EST next day. Slack-style real-time comms during your hours.",
      },
      {
        step: "04",
        title: "Scale",
        body:
          "Capacity ramps as your retainer book grows. New client wins don't trigger hiring panic — we add a pod, you keep margins.",
      },
    ],
  },

  testimonial: {
    // Stand-in voiced as a Western agency production director.
    // Avoids specific dollar figures (would feel inflated /
    // unverifiable). Replace with a real quote when one is
    // captured from a partner agency.
    quote:
      "We were maxing out editor hires and still missing deadlines. Cocoma's pods gave us 3× the output, and the time-zone was a bonus we didn't see coming — wins land in the inbox before our team's even at their desks.",
    author: "Production Director",
    meta: "Mid-size US creative agency · retained Cocoma pod since 2023",
    avatar: "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png",
  },

  faqSection: {
    eyebrow: "Common questions",
    heading: "The honest answers.",
    items: [
      {
        q: "Do you white-label? Can we present the work as our own?",
        a:
          "Yes. White-label is the default — your brand stays on every deliverable, Cocoma's name never appears on any client-facing asset. Our case studies + agency mentions stay between us; we don't disclose partner agencies externally without explicit permission.",
      },
      {
        q: "How does the time-zone workflow actually work?",
        a:
          "Pods operate in IST. A 5pm EST brief becomes a 9am EST delivery the next morning. Weekly sync calls happen in your time-zone (we flex to yours). Slack / Teams real-time comms run during your working hours via a dedicated channel.",
      },
      {
        q: "What's a typical engagement size?",
        a:
          "Retainer-based. Smallest: ~40 hrs/week, covering one mid-size client of yours. Largest: 5+ parallel pods covering full agency production overflow. We'll quote against your retainer book after a discovery call.",
      },
      {
        q: "Can you handle multiple agency clients in parallel?",
        a:
          "Yes — that's the typical shape. Each pod operates as its own unit with brand-guideline compliance per end-client. You decide if pods are dedicated to one of your clients or shared across several.",
      },
      {
        q: "NDA, IP rights, asset security?",
        a:
          "Standard. Mutual NDAs signed before any sensitive material moves. Asset libraries live on your side or ours per your preference. IP rights transfer per project / per retainer terms. Our team is on Cocoma payroll, not subcontracted out — no chain-of-custody risk.",
      },
      {
        q: "How do you compare to freelancer marketplaces (Upwork, Fiverr)?",
        a:
          "Cocoma is a retained pod, not a marketplace. Same team week to week, brand guidelines memorised after onboarding, no ghosting, no quality drift between briefs. Freelancer marketplaces fit one-off work. Cocoma fits ongoing volume + retainer overflow.",
      },
    ],
  },

  closer: {
    eyebrow: "One call, no obligation",
    eyebrowIconKey: "FaGlobe",
    heading:
      "Want to see what your retainer book could look like with overnight pods on?",
    pitch:
      "Anil takes the call personally. 15 minutes. We talk through your retainer scope + the pod mix you'd need + send you the rate-card regardless.",
    ctaLabel: "Book a 15-min call",
    ctaTo: "/ScheduleMeeting",
    avatar: "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png",
  },
},
  "independent-artists": {
  hero: {
    eyebrow: "For Independent Artists",
    headline: "Skip the label. Keep the launch.",
    highlight: "Skip the label",
    sub:
      "Cocoma's pods become your label-equivalent team — music videos, lyric videos, social cuts, paid promo, channel ops, sponsorship outreach. Every drop gets the launch a major release would, without the label deal.",
    primaryCta: { label: "Book a 15-min call", to: "/ScheduleMeeting" },
    secondaryCta: { label: "See the playbook", to: "#prospect-house" },
  },

  painsSection: {
    eyebrow: "What going indie actually feels like",
    heading: "Sound familiar?",
    items: [
      {
        pain:
          "You write, record, produce, perform — content production keeps sliding. Music videos take months when the track is ready now.",
        pillar: "Creative",
        fix:
          "Cocoma's edit + design pods ship music videos, lyric videos, audio visualisers, vertical cuts on your release week. The visuals catch up with the track instead of trailing behind.",
      },
      {
        pain:
          "Spotify takes 100K monthly listeners to pay rent. Real growth happens on YouTube + Reels + TikTok — and you don't have time to build that engine.",
        pillar: "Marketing",
        fix:
          "Per-track YouTube + social launch campaigns. Hook-led short-form trends, paid promo on breakout tracks, audience targeting briefed against your streaming data.",
      },
      {
        pain:
          "Channel ops, social posting, comment moderation, scheduling — solo artist day-to-day eats the time you should be making music.",
        pillar: "Management",
        fix:
          "Cocoma's ops team handles your YouTube + social channels end-to-end. Comments, scheduling, brand-safety, monthly performance reviews. You stay in the studio.",
      },
      {
        pain:
          "Brand deals + sync placements + merch + memberships — every label has these revenue streams. You don't, because you don't have time.",
        pillar: "Monetisation",
        fix:
          "Sync + sponsorship outreach, merch + digital product strategy, fan subscription / membership ops. Build the revenue streams a label would, without the label cut.",
      },
    ],
  },

  houseSection: {
    eyebrow: "Cocoma's House",
    heading: "Four pieces. One team. Your label-equivalent.",
    sub:
      "Engage the whole stack as your release engine, or plug us into a single pillar where you have a gap. Each pod runs in parallel — your release Fridays don't queue inside Cocoma. No label deal, no IP transfer, full ownership stays with you.",
    pillars: [
      {
        id: "creative",
        iconKey: "FaPlay",
        title: "Creative",
        blurb:
          "Music videos, lyric videos, audio visualisers, vertical cuts, BTS.",
        deliverables: [
          "Music videos + cinematic singles",
          "Lyric videos + audio visualisers",
          "Vertical cuts for Reels / Shorts / TikTok",
          "BTS edits + cover-art motion + social cards",
        ],
      },
      {
        id: "marketing",
        iconKey: "FaSearch",
        title: "Marketing",
        blurb:
          "Per-track campaigns, paid promo, hook-led trends, fan community.",
        deliverables: [
          "Release-week playbooks per track",
          "Paid promotion (YouTube, Meta, Reels, Shorts)",
          "Hook-led short-form trend seeding",
          "Fan-community + creator-collab outreach",
        ],
      },
      {
        id: "management",
        iconKey: "FaCog",
        title: "Management",
        blurb:
          "Channel ops, scheduling, comment moderation, brand-safety.",
        deliverables: [
          "Artist YouTube + social channel ops",
          "Release calendar + scheduling",
          "Comment moderation + community ops",
          "Monthly performance review + analytics",
        ],
      },
      {
        id: "monetisation",
        iconKey: "FaDollarSign",
        title: "Monetisation",
        blurb:
          "Sync, brand deals, merch, membership — label-equivalent revenue streams.",
        deliverables: [
          "Sync + sponsorship outreach + brand-deal negotiation",
          "Merch + digital product launches",
          "Fan subscription / Patreon / membership ops",
          "Tour / live-show drop sponsorship integration",
        ],
      },
    ],
  },

  statsSection: {
    eyebrow: "Track record",
    heading: "Numbers, not promises.",
    items: [
      { prefix: "", value: 200, suffix: "+", label: "Tracks Promoted" },
      { prefix: "", value: 150, suffix: "+", label: "Music Videos Launched" },
      { prefix: "", value: 60, suffix: "+", label: "Channels Managed" },
      { prefix: "", value: 40, suffix: "B+", label: "Views Gained" },
    ],
  },

  proofSection: {
    eyebrow: "Production caliber we already ship",
    heading: "Real ops, not deck slides.",
    items: [
      {
        name: "Bandish Bandits",
        niche: "Soundtrack · Classical-pop fusion",
        image: "/Images/solutions/bandish-bandits.jpeg",
        handle: "Listen on YouTube",
        url:
          "https://www.youtube.com/results?search_query=Bandish+Bandits+Songs",
        bullet:
          "Multi-track campaign — lyric videos + BTS + paid promo + sound-led trend seeding. Production quality solo artists rarely access.",
      },
      {
        name: "Farzi",
        niche: "Soundtrack · Anthem tracks",
        image: "/Images/solutions/farzi.jpeg",
        handle: "Listen on YouTube",
        url: "https://www.youtube.com/results?search_query=Farzi+Songs",
        bullet:
          "Hook-first short-form strategy synced to release windows. Same playbook works track-by-track for indie drops.",
      },
      {
        name: "Made in Heaven",
        niche: "Soundtrack · Cinematic",
        image: "/Images/solutions/made-in-heaven.jpeg",
        handle: "Listen on YouTube",
        url:
          "https://www.youtube.com/results?search_query=Made+in+Heaven+Songs",
        bullet:
          "Cinematic-grade music video + cross-platform cuts. Every indie artist's aspiration ceiling — built without a major label deploying it.",
      },
    ],
  },

  processSection: {
    eyebrow: "How it works",
    heading: "From a track ready to ship to a launched single.",
    items: [
      {
        step: "01",
        title: "Audit",
        body:
          "Track pipeline walkthrough — release calendar, current channels, audience data, monetisation gaps. We map the high-leverage wins per release.",
      },
      {
        step: "02",
        title: "Release plan",
        body:
          "Per-track playbook — music video format, lyric video, vertical cuts, paid promo budget, social calendar. Aligned to your release rhythm.",
      },
      {
        step: "03",
        title: "Ship",
        body:
          "Creative + marketing pods running in parallel on every release. Music video + visuals + clips + paid push delivered the same week.",
      },
      {
        step: "04",
        title: "Compound",
        body:
          "Sync + sponsorship + merch + membership ops layered in over time. Build the revenue streams a label would, while you stay focused on the next track.",
      },
    ],
  },

  testimonial: {
    // Stand-in voiced as an indie artist. Replace with a real
    // partner-artist quote when one is captured.
    quote:
      "I was self-funding everything — music videos took months, social was random, brand deals were nonexistent. Cocoma became my label without the deal — every track now ships like a launch and the revenue streams compounded.",
    author: "Independent Artist",
    meta: "Indie singer-songwriter · 20+ tracks shipped with Cocoma",
    avatar: "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png",
  },

  faqSection: {
    eyebrow: "Common questions",
    heading: "The honest answers.",
    items: [
      {
        q: "Do you work with self-funded artists or do we need a label?",
        a:
          "We work with self-funded artists directly — most of our indie partnerships are direct-to-artist, not label-mediated. Retainer pricing scaled to your release cadence. No label deal, no IP transfer, no publishing splits.",
      },
      {
        q: "How does pricing work without a label budget?",
        a:
          "Tiered retainer based on release cadence + scope. Smallest engagement: monthly retainer covering 1-2 tracks/month with core deliverables (music video, vertical cuts, channel ops). Larger: full-stack ops covering all four pillars across the year. We'll quote against your release calendar after a discovery call.",
      },
      {
        q: "Will I keep ownership of all my content?",
        a:
          "Always. Cocoma is a service partner, not a publisher. You retain 100% ownership of your music, masters, content, merch — everything. Service contracts only; no IP transfer ever, no publishing splits, no claim on your royalties.",
      },
      {
        q: "Can you handle multiple genres?",
        a:
          "Yes — across pop, hip-hop, indie rock, classical fusion, electronic, devotional, regional. The four-piece stack is genre-agnostic; the playbook flexes around audience norms per genre.",
      },
      {
        q: "What about regional language artists (Punjabi, Tamil, Marathi, etc.)?",
        a:
          "Yes. Punjabi is a heavy lane right now; Tamil, Telugu, Marathi, Bengali, Kannada are all standard. Multilingual artists can mix-and-match per release — we can ship a Punjabi-Hindi crossover release with kits for both audiences.",
      },
      {
        q: "Do you handle sync + brand-deal outreach?",
        a:
          "Yes — sync + sponsorship outreach is a Monetisation pillar deliverable. We pitch your tracks to brands, content creators, OTT shows, and ad agencies looking for music. Brand-deal negotiation included.",
      },
    ],
  },

  closer: {
    eyebrow: "One call, no obligation",
    eyebrowIconKey: "FaMusic",
    heading:
      "Want to see what your next track drop could look like with a label-equivalent team behind it?",
    pitch:
      "Anil takes the call personally. 15 minutes. We talk through your release calendar + the launch plan you'd need + send you the audit deck regardless. No label deal, no IP claims, ever.",
    ctaLabel: "Book a 15-min call",
    ctaTo: "/ScheduleMeeting",
    avatar: "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png",
  },
},
};

export const SOLUTION_SLUGS = Object.keys(SOLUTIONS_DATA);
