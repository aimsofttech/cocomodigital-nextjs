import type { IconType } from "react-icons";
import {
  FaComments,
  FaFilm,
  FaGlobe,
  FaHandshake,
  FaLanguage,
  FaUserTie,
  FaUsers,
} from "react-icons/fa";

/**
 * /services/design — every string and image path on the page.
 *
 * The page was approved as a mockup (REFS/design-page/approved-design-B.html,
 * local only) and built with placeholder artwork. Kirk swaps the final WebP
 * exports in later, so each tile is one line here and no component carries a
 * path or a sentence of copy of its own. "[PRICE]" and "[N]" are deliberate
 * placeholders pending the rate card.
 *
 * Images live under /public/Images/service/design/ — copies of the local
 * reference assets, never references into REFS/ (which is git-ignored).
 */

/* Pricing is mocked. Flip to true once the rate card is locked; while false
   the whole #pricing band is skipped, leaving no gap. */
export const SHOW_PRICING = true;

const IMG = "/Images/service/design";

export const DESIGN_PATH = "/services/design";

export const DESIGN_META = {
  title: "Design Services — Thumbnails, Key Art, Branding, Web & Ads | Cocoma Digital",
  description:
    "Thumbnail design, key art and posters, branding, web and app development, and static and motion ads from Cocoma Digital, the studio behind 45M+ subscribers.",
  breadcrumbLabel: "Design Services",
};

export interface DesignCta {
  label: string;
  href: string;
}

export const DESIGN_HERO = {
  eyebrow: "Design services",
  /** One array entry per line of the H1. */
  title: ["One design team.", "Five things we're", "very good at."],
  lead:
    "Thumbnails, key art, brand identities, websites and ads all created by the team behind 45M+ subscribers. Real designers who understand your vision, empowered with custom AI tools to turn work around faster.",
  primaryCta: { label: "Get a free quote", href: "/ScheduleMeeting" } as DesignCta,
  secondaryCta: { label: "See services", href: "#services" } as DesignCta,
  /* Muted/autoplay settings mirror the thumbnail page's hero, handled by the
     hero component exactly as HeroBanner does it. */
  videoUrl: "https://www.youtube.com/watch?v=PNH0V6bvMEM",
};

/** "How does it work?" step titles, in order. The icons stay with the component. */
export const DESIGN_STEPS = [
  "Pick the services",
  "Add them to your call",
  "Book 15 minutes",
  "Start the project",
];

/* ── The five service blocks ─────────────────────────────────────────── */

export type DesignSample =
  | {
      kind: "image";
      src: string;
      alt: string;
      /** Only the web block overrides the block ratio per tile. */
      ratio?: string;
      span?: 1 | 2;
    }
  | {
      kind: "video";
      src: string;
      /** Accessible name for the poster frame; the clip never autoplays. */
      alt: string;
      ratio?: string;
      span?: 1 | 2;
    }
  | {
      kind: "placeholder";
      label: string;
      sublabel?: string;
      ratio?: string;
      span?: 1 | 2;
    };

export interface DesignSpec {
  label: string;
  value: string;
}

/** What "Add to call" puts in the cart. Shape matches what /cart and the
 *  booking form read off a service item (id, title, slug, thumbnail,
 *  description). Ids are stable strings, not API ids — these blocks have no
 *  admin record behind them. */
export interface DesignCartItem {
  id: string;
  title: string;
  slug: string;
  thumbnail: string;
  description: string;
}

export interface DesignServiceBlock {
  id: string;
  /** Printed ordinal, "01". */
  number: string;
  eyebrow: string;
  /** Two lines of poster title. */
  title: [string, string];
  /** CSS aspect-ratio for the sample tiles, e.g. "16 / 9". */
  ratio: string;
  /** Tiles per row in the sample strip. Default 3; wide 16:9 work reads better 2-up. */
  columns?: 2 | 3;
  samples: DesignSample[];
  paragraph: string;
  specs: DesignSpec[];
  explore: DesignCta;
  cart: DesignCartItem;
}

export const DESIGN_BLOCKS: DesignServiceBlock[] = [
  {
    id: "thumbnails",
    number: "01",
    eyebrow: "YouTube · Instagram · Social",
    title: ["Click-first", "thumbnails"],
    ratio: "16 / 9",
    columns: 2,
    samples: [
      { kind: "image", src: `${IMG}/thumbnails/the-j-curve-01.jpg`, alt: "The J Curve — thumbnail" },
      { kind: "image", src: `${IMG}/thumbnails/mx-by-prime-video-01.jpg`, alt: "MX by Prime Video — thumbnail" },
    ],
    paragraph:
      "The first signal YouTube reads is CTR. We design per-video thumbnails benchmarked against your niche, series systems that make your channel recognisable before the title is read, and split-test pairs so the data decides.",
    specs: [
      { label: "What you get", value: "2 concepts per video, source files, all sizes" },
      { label: "Turnaround", value: "24–48 hours" },
      { label: "Starting at", value: "[PRICE] per thumbnail · retainers available" },
      { label: "Best for", value: "Creators, podcasts, OTT, edtech, finance" },
    ],
    explore: { label: "Explore more", href: "/services/youtube-thumbnail-graphics-services" },
    cart: {
      id: "design-thumbnails",
      title: "Click-first thumbnails",
      slug: "design",
      thumbnail: `${IMG}/thumbnails/the-j-curve-01.jpg`,
      description: "Per-video thumbnails, series systems and split-test pairs. 2 concepts per video, 24–48 hours.",
    },
  },
  {
    id: "key-art",
    number: "02",
    eyebrow: "Movies · Series · Shows · Shorts",
    title: ["Key art", "& posters"],
    ratio: "2 / 3",
    samples: [
      { kind: "image", src: `${IMG}/key-art/happy-ending-male-poster.jpg`, alt: "Happy Ending — character poster" },
      { kind: "image", src: `${IMG}/key-art/banner-chor-character-poster.jpg`, alt: "Banner Chor — character poster" },
      { kind: "image", src: `${IMG}/key-art/us-poster.jpg`, alt: "Happy Ending — character poster" },
    ],
    paragraph:
      "One frame that carries a whole title. Character posters, one-sheets, OTT tiles and social adaptations that stay consistent from the trailer to the thumbnail — the same system we've built for streaming launches.",
    specs: [
      { label: "What you get", value: "Hero key art + a size-adapted pack (OTT, social, print)" },
      { label: "Turnaround", value: "5–7 working days" },
      { label: "Starting at", value: "[PRICE] per title" },
      { label: "Best for", value: "Film studios, OTT platforms, music labels, short films" },
    ],
    explore: { label: "Explore more", href: "#services" },
    cart: {
      id: "design-key-art",
      title: "Key art & posters",
      slug: "design",
      thumbnail: `${IMG}/key-art/happy-ending-male-poster.jpg`,
      description: "Hero key art plus a size-adapted pack for OTT, social and print. 5–7 working days.",
    },
  },
  {
    id: "branding",
    number: "03",
    eyebrow: "Logo · Identity · Guidelines",
    title: ["Branding &", "rebranding"],
    ratio: "1 / 1",
    /* The brand books are PDFs; rendering spreads to images is an asset
       conversion, which is Kirk's step. Grey tiles until the exports land. */
    samples: [
      { kind: "placeholder", label: "Work sample" },
      { kind: "placeholder", label: "Work sample" },
      { kind: "placeholder", label: "Work sample" },
    ],
    paragraph:
      "For creators turning into companies and brands that outgrew their first logo. Mark, type, colour, voice and a guide the next designer can actually follow — plus the social and channel assets to launch it.",
    specs: [
      { label: "What you get", value: "Logo suite, palette, type, brand guide, launch kit" },
      { label: "Turnaround", value: "2–4 weeks" },
      { label: "Starting at", value: "[PRICE] per project" },
      { label: "Best for", value: "D2C, creators, podcasts, wellness brands" },
    ],
    explore: { label: "Explore more", href: "#services" },
    cart: {
      id: "design-branding",
      title: "Branding & rebranding",
      slug: "design",
      thumbnail: "",
      description: "Logo suite, palette, type, brand guide and launch kit. 2–4 weeks.",
    },
  },
  {
    id: "web-app",
    number: "04",
    eyebrow: "Design · Build · Launch",
    title: ["Web & app", "development"],
    ratio: "16 / 10",
    samples: [
      { kind: "placeholder", label: "Work sample", sublabel: "Desktop", ratio: "16 / 10", span: 2 },
      { kind: "placeholder", label: "Work sample", sublabel: "Mobile", ratio: "9 / 16" },
    ],
    paragraph:
      "Landing pages, creator sites, course platforms and web apps, designed and developed by the same team. Fast, on-brand and built to convert the audience you already have.",
    specs: [
      { label: "What you get", value: "UX, UI, build, launch, 30 days of support" },
      { label: "Turnaround", value: "Landing page 2 weeks · site 4–8 weeks" },
      { label: "Starting at", value: "[PRICE] per landing page" },
      { label: "Best for", value: "Creators, coaches, brands, agencies" },
    ],
    explore: { label: "Explore more", href: "#services" },
    cart: {
      id: "design-web-app",
      title: "Web & app development",
      slug: "design",
      thumbnail: "",
      description: "UX, UI, build, launch and 30 days of support. Landing page in 2 weeks, site in 4–8.",
    },
  },
  {
    id: "ads",
    number: "05",
    eyebrow: "Meta · YouTube · Display",
    title: ["Ads, static", "& motion"],
    ratio: "4 / 5",
    samples: [
      { kind: "image", src: `${IMG}/ads/cocoma-static-01.jpg`, alt: "Cocoma — static ad" },
      { kind: "image", src: `${IMG}/ads/amx-static-01.jpg`, alt: "AMX — static ad" },
      { kind: "video", src: `${IMG}/ads/motion-01.mp4`, alt: "Motion ad — opening frame" },
    ],
    paragraph:
      "Scroll-stopping statics and 6–15s motion cuts in every placement size, with hook variants ready for testing from day one. Made by the people who already edit your long-form.",
    specs: [
      { label: "What you get", value: "Static set + motion cuts, all placement sizes, 3 hook variants" },
      { label: "Turnaround", value: "3–5 working days" },
      { label: "Starting at", value: "[PRICE] per campaign set" },
      { label: "Best for", value: "D2C, wellness, real estate, apps" },
    ],
    explore: { label: "Explore more", href: "#services" },
    cart: {
      id: "design-ads",
      title: "Ads, static & motion",
      slug: "design",
      thumbnail: `${IMG}/ads/cocoma-static-01.jpg`,
      description: "Static set plus motion cuts in every placement size, with 3 hook variants. 3–5 working days.",
    },
  },
];

export const DESIGN_ADD_TO_CALL = {
  idle: "Add to call",
  added: "On call ✓",
};

/* ── Team strip ──────────────────────────────────────────────────────── */

export interface DesignPerson {
  name: string;
  role: string;
  photo: string;
  alt: string;
}

export const DESIGN_TEAM = {
  eyebrow: "The people",
  title: "Designers, not a dashboard.",
  lead:
    "Named people who learn your channel, your brand and your bad habits. AI tools speed up the boring parts; the taste is theirs.",
  /* Names come from the photo file names; the roles are the mockup's four,
     in order. Correct the pairing here when the final line-up is confirmed. */
  people: [
    { name: "Chirag Maru", role: "Lead designer · thumbnails & social", photo: `${IMG}/team/chirag-maru.jpeg`, alt: "Chirag Maru — portrait" },
    { name: "Manish", role: "Key art & poster designer", photo: `${IMG}/team/manish.jpeg`, alt: "Manish — portrait" },
    { name: "Samiksha Pandav", role: "Brand & identity", photo: `${IMG}/team/samiksha-pandav.jpeg`, alt: "Samiksha Pandav — portrait" },
    { name: "Dilip Lohar", role: "Web design & development", photo: `${IMG}/team/dilip-lohar.jpg`, alt: "Dilip Lohar — portrait" },
  ] as DesignPerson[],
};

/* ── "Why teams keep coming back" (rendered by the shared CredentialsStrip) ── */

/* CountUp animates a numeric `number` and prints a non-numeric one verbatim,
   so "35" + "K+" counts up to 35K+ and "[N]" + "+" stays a placeholder. */
export const DESIGN_STATS = {
  heading: "Why teams keep coming back",
  stats: [
    { number: 7, suffix: "", label: "Years in business" },
    { number: 60, suffix: "+", label: "In-house team" },
    { number: 35, suffix: "K+", label: "Videos shipped" },
    { number: 13, suffix: "K+", label: "Design pieces every month" },
  ],
  pills: [
    { icon: FaFilm, text: "Reels in 6 hours" },
    { icon: FaUserTie, text: "Dedicated project manager" },
    { icon: FaComments, text: "WhatsApp + Slack" },
    { icon: FaGlobe, text: "US · EU · Asia time zones" },
    { icon: FaLanguage, text: "Multilingual in-house team" },
  ] as { icon: IconType; text: string }[],
};

/* ── Pricing (placeholder; see SHOW_PRICING) ─────────────────────────── */

export interface DesignPricingTier {
  name: string;
  badge?: string;
  price: string;
  /** Printed after the price, e.g. "/mo". Empty for a quote. */
  period: string;
  tagline: string;
  features: string[];
  cta: DesignCta & { variant: "outline" | "dark" };
  featured?: boolean;
}

export const DESIGN_PRICING = {
  eyebrow: "Pricing · Placeholder",
  title: "Three ways to work with us",
  currencies: ["₹ INR", "$ USD"],
  tiers: [
    {
      name: "Starter",
      price: "[PRICE]",
      period: "/mo",
      tagline: "For one channel or one brand",
      features: [
        "Up to [N] thumbnails or ads a month",
        "One designer, one PM",
        "2 revision rounds, 48h turnaround",
        "Slack / WhatsApp",
      ],
      cta: { label: "Book a call", href: "/ScheduleMeeting", variant: "outline" },
    },
    {
      name: "Growth",
      badge: "Most popular",
      price: "[PRICE]",
      period: "/mo",
      tagline: "For teams posting daily across platforms",
      features: [
        "Up to [N] pieces a month, any mix",
        "Dedicated designer + motion",
        "Same-day replies, 24h turnaround",
        "Monthly performance review",
      ],
      cta: { label: "Book a call", href: "/ScheduleMeeting", variant: "dark" },
      featured: true,
    },
    {
      name: "Project",
      price: "Quote",
      period: "",
      tagline: "Brands, rebrands, key art, websites, apps",
      features: [
        "Scoped on one call",
        "Fixed price, fixed timeline",
        "Source files + guidelines",
        "30 days post-launch support",
      ],
      cta: { label: "Get a quote", href: "/ScheduleMeeting", variant: "outline" },
    },
  ] as DesignPricingTier[],
  footnote:
    "All prices are placeholders pending rate card. INR for Indian clients, USD for international; GST / VAT extra.",
};

/* ── FAQ ─────────────────────────────────────────────────────────────── */

export const DESIGN_FAQ = {
  title: "Questions people ask on the call",
  items: [
    {
      question: "Do you use AI?",
      answer:
        "Yes, as a tool. Designers with years on real channels lead every piece; AI speeds up research, mocks and resizing. You'll never get a raw generation.",
    },
    {
      question: "Who owns the files?",
      answer: "You do. Source files come with every delivery.",
    },
    {
      question: "Do you work with international clients?",
      answer:
        "About a third of our work is US, UK, Middle East and Africa. We cover their hours and invoice in USD.",
    },
    {
      question: "Can you also edit the video?",
      answer: "That's the rest of the studio. Design and editing are often the same retainer.",
    },
  ],
};

/* ── "Two ways to work with Cocoma" (rendered by the shared HireOrJoin) ── */

export const DESIGN_HIRE_OR_JOIN_CARDS = [
  {
    variant: "primary",
    icon: FaHandshake,
    tag: "For brands & creators",
    title: "Hire Cocoma Design",
    pitch: "Custom scoping for your goals. Dedicated PM. End-to-end delivery from brief to files.",
    ctaText: "Book a discovery call",
    to: "/ScheduleMeeting",
  },
  {
    variant: "secondary",
    icon: FaUsers,
    tag: "For designers",
    title: "Join Cocoma",
    pitch: "Designers, motion artists, developers — we're hiring across India and remote.",
    ctaText: "See open roles",
    to: "/career",
  },
];
