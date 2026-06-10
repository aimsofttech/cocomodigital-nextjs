// @ts-nocheck
/**
 * Page content for /work/marketing-campaigns (mounted via the
 * MarketingCampaigns component, NOT WorkCategoryPage — because
 * the page's centerpiece is the existing 400+ item filterable
 * marketing-house grid pulled from /marketing_house_item, not
 * a fixed list of case-study cards).
 *
 * Same data shape as contentCreatedData (no `caseStudies`
 * block — the AllSeriesData grid renders the actual
 * portfolio). Hero + audience + methodology + credentials +
 * partnerQuote + closingCta wrap the grid with the same
 * polished WorkCategoryPage visual language as the rest of
 * the /work/* family.
 */
import {
  FaFilm,
  FaUsers,
  FaRocket,
  FaChartLine,
  FaBullhorn,
} from "react-icons/fa";

export const marketingCampaignsData = {
  meta: {
    title: "Marketing Campaigns — Our Work · Cocoma Digital",
    description:
      "How Cocoma runs end-to-end launch campaigns for entertainment IP. 400+ campaigns shipped across film, OTT, music, and web series. Trailers, social blitz, content marketing, paid coordination — every launch lever pulled in concert.",
    path: "/work/marketing-campaigns",
  },

  schema: {
    name: "Marketing Campaigns",
    description:
      "End-to-end launch campaigns for entertainment IP — trailers, sizzles, social blitz, content marketing, paid coordination, PR, post-launch retention.",
    serviceType:
      "Marketing campaigns, launch coordination, trailer + sizzle production, social blitz, content marketing, paid + organic tuning",
  },

  hero: {
    eyebrow: "Our Work · Marketing Campaigns",
    /* Bookend pact — parallel verb-object structure. The
       client owns the title (the IP, the launch date); Cocoma
       owns the audience side (everything that gets people
       there). Closing CTA at the bottom echoes the same line. */
    title: {
      prefix: "You drop the title.",
      highlighted: "We bring the audience.",
      suffix: "",
    },
    subtitle:
      "60-person Mumbai studio running end-to-end launch campaigns for entertainment IP across film, OTT, music, and web series. Trailers, sizzles, social blitz, content marketing, paid coordination — every launch lever, pulled in concert.",
    stats: [
      // 404 actual items in the grid as of the last sitemap
      // build; rounded to "400+" for cleaner reading + a
      // little headroom as the catalog grows.
      { value: "400+", label: "campaigns shipped" },
      { value: "70%", label: "recurring partnerships" },
      { value: "7+", label: "years scaling launches" },
      { value: "60", label: "specialists in-house" },
    ],
  },

  /* "Who benefits from this" — situations that map to the
     gap a campaign team typically faces. Each card surfaces a
     launch-side pain (no engine, dead by week 2, no
     orchestration, paid loud but quiet launch) and answers
     with the corresponding Cocoma capability. */
  audience: {
    heading: "Who benefits from this",
    items: [
      {
        title:
          "You're dropping a title without a launch engine",
        description:
          "We bring the full launch stack: trailers, sizzles, content marketing, social blitz, paid coordination, PR — every lever pulled in concert, on schedule, in your brand voice.",
      },
      {
        title:
          "Your launches peak on day 1 and die by week 2",
        description:
          "We build campaigns that compound across launch AND post-launch retention windows. Daily content, community management, paid layers, retargeting — the audience stays engaged past week 2.",
      },
      {
        title: "You're shipping assets but no orchestration",
        description:
          "One team owns the calendar across every channel, every format, every platform — YouTube, Instagram, X, TikTok, OTT carousels, PR placements. Drops land in concert, not piecemeal.",
      },
      {
        title:
          "Your paid spend is loud but the launch still feels quiet",
        description:
          "Paid is one lever. We tune it against organic, content, and PR so the layers amplify each other — instead of paid carrying noise that organic never echoes.",
      },
    ],
  },

  methodology: [
    {
      number: "01",
      title: "We pre-launch with sizzle and tease",
      description:
        "4-8 weeks ahead of drop, we cut trailers, build hype assets, and seed early conversation. The audience knows your title is coming before your launch day actually arrives.",
    },
    {
      number: "02",
      title: "We launch with a multi-channel blitz",
      description:
        "Coordinated drop across YouTube, OTT, social, paid, PR — all in concert, all on schedule. The audience hits maximum density on day 1 because every channel hits at once.",
    },
    {
      number: "03",
      title: "We sustain through retention windows",
      description:
        "Post-launch content + community management + paid retargeting layers keep audiences engaged through week 2, week 4, and beyond. Compounding, not spike-and-dead.",
    },
    {
      number: "04",
      title: "We measure what compounded and what didn't",
      description:
        "Campaign-end review surfaces what worked, what didn't, and which patterns to bake into the next launch. Continuous improvement, not one-shot campaigns.",
    },
  ],

  /* CredentialsStrip override — campaign-flavoured copy.
     Lead stat is 400+ campaigns since it's the proof point
     most relevant to a marketing campaigns page. Pills cover
     the full launch lever stack. */
  /* CredentialsStrip — stats dropped (duplicate of hero). Pills
     retained — describe the full launch lever stack. */
  credentials: {
    heading: "Inside the launch lever stack",
    stats: null,
    pills: [
      { icon: FaFilm, text: "Trailers + sizzles" },
      { icon: FaBullhorn, text: "Social blitz coordination" },
      { icon: FaUsers, text: "Content marketing + PR" },
      { icon: FaRocket, text: "Paid + organic tuned together" },
      { icon: FaChartLine, text: "Post-launch retention layer" },
    ],
  },

  /* Partner testimonial removed — "[Major film studio]"
     anonymised attribution reads as fabricated. Returns when
     a real named film-studio partner approves a quote. */

  /* Closing CTA — hero "You drop the title. We bring the
     audience." stays as brand promise. Closing was a verbatim
     repeat. Action-led replacement matches the /work/* pattern. */
  closingCta: {
    heading: "Let's audit your upcoming launch.",
    description:
      "15-minute discovery call with Anil + a senior strategist. We'll review your launch slate and show you what end-to-end campaign coordination delivers when every lever moves together.",
    buttonText: "Book a discovery call",
    buttonTo: "/ScheduleMeeting",
  },
};
