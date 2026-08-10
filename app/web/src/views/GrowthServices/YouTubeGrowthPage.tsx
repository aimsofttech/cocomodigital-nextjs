import {
  FiActivity,
  FiAward,
  FiBarChart2,
  FiBookOpen,
  FiCalendar,
  FiClipboard,
  FiClock,
  FiEye,
  FiImage,
  FiMic,
  FiPackage,
  FiPlay,
  FiScissors,
  FiSearch,
  FiSettings,
  FiStar,
  FiTarget,
  FiTrendingUp,
  FiUser,
  FiUsers,
  FiVideo,
  FiZap,
} from "react-icons/fi";
import { FaYoutube } from "react-icons/fa6";
import StructuredData from "@/src/components/common/StructuredData/StructuredData";
import CaseStudy from "@/src/components/Services/growth/CaseStudy";
import ClosingCta from "@/src/components/Services/growth/ClosingCta";
import FaqAccordion from "@/src/components/Services/growth/FaqAccordion";
import FeatureGrid from "@/src/components/Services/growth/FeatureGrid";
import GrowthHero from "@/src/components/Services/growth/GrowthHero";
import StatsBand from "@/src/components/Services/growth/StatsBand";
import ChannelDashboard from "@/src/components/Services/growth/dashboards/ChannelDashboard";
import { Section, SectionHeading } from "@/src/components/Services/growth/Primitives";
import type {
  FaqItem,
  FeatureItem,
  MetricRow,
  StatItem,
} from "@/src/components/Services/growth/types";

const PAGE_URL =
  "https://cocomadigital.com/services/end-to-end-youtube-growth-services";

const STATS: StatItem[] = [
  { icon: FaYoutube, value: "120+", label: "Channels Managed" },
  { icon: FiEye, value: "10M+", label: "Views Generated" },
  { icon: FiUsers, value: "500+", label: "Clients Served" },
  { icon: FiTrendingUp, value: "85%", label: "Retention Rate (6M+)" },
];

const SERVICES: FeatureItem[] = [
  {
    icon: FiClipboard,
    title: "Channel Audit",
    description: "In-depth audit to find gaps, opportunities, and growth potential.",
  },
  {
    icon: FiTarget,
    title: "Content Strategy",
    description: "Optimize titles, tags, descriptions & more to rank higher.",
  },
  {
    icon: FiVideo,
    title: "Content Production",
    description: "High-quality videos that engage viewers and build trust.",
  },
  {
    icon: FiImage,
    title: "Thumbnail Design",
    description: "Click-worthy thumbnails that increase CTR and drive more views.",
  },
  {
    icon: FiScissors,
    title: "Video Editing",
    description: "Professional editing that keeps viewers watching till the end.",
  },
  {
    icon: FiBarChart2,
    title: "Analytics & Management",
    description: "Track progress with clear reports and actionable insights.",
  },
];

/* The proven-process band reads as numbered steps in the design,
   so the numbering lives in the card titles. */
const PROVEN_PROCESS: FeatureItem[] = [
  {
    icon: FiSearch,
    title: "1. We Discover",
    description: "We analyze your channel, content, and audience.",
  },
  {
    icon: FiTarget,
    title: "2. We Strategize",
    description: "We build a custom growth strategy tailored to your goals.",
  },
  {
    icon: FiZap,
    title: "3. We Execute",
    description: "We implement SEO, content & promotion to drive results.",
  },
  {
    icon: FiActivity,
    title: "4. We Optimize",
    description: "We test, measure & refine for maximum growth.",
  },
  {
    icon: FiUsers,
    title: "5. We Engage",
    description: "We help you build stronger audience connections & retention.",
  },
  {
    icon: FiAward,
    title: "6. You Win",
    description: "You get more views, subs & real business impact.",
  },
];

const DELIVERABLES: FeatureItem[] = [
  {
    icon: FiClipboard,
    title: "Channel Audit",
    description: "Complete channel audit to unlock hidden growth opportunities.",
  },
  {
    icon: FiTrendingUp,
    title: "Growth Strategy",
    description: "Custom strategies designed to grow your audience.",
  },
  {
    icon: FiSearch,
    title: "Content Research",
    description: "Find high-potential topics your audience loves to watch.",
  },
  {
    icon: FiSettings,
    title: "Optimization",
    description: "Optimize every detail for better rankings and visibility.",
  },
  {
    icon: FiImage,
    title: "Thumbnail Design",
    description: "Eye-catching thumbnails that increase clicks and views.",
  },
  {
    icon: FiTarget,
    title: "YouTube SEO",
    description: "Optimize titles, tags, descriptions & playlists.",
  },
  {
    icon: FiPlay,
    title: "Shorts Creation",
    description: "Short-form content to boost reach and subscribers.",
  },
  {
    icon: FiBarChart2,
    title: "Analytics & Reporting",
    description: "Track performance with data-backed insights.",
  },
];

const CONTENT_FORMATS: FeatureItem[] = [
  {
    icon: FiBookOpen,
    title: "Educational Videos",
    description: "Build authority with informative videos that teach, explain, and deliver real value.",
  },
  {
    icon: FiZap,
    title: "YouTube Shorts",
    description: "Drive rapid discovery and audience growth with high-impact short-form content.",
  },
  {
    icon: FiMic,
    title: "Podcast Clips",
    description: "Repurpose long-form conversations into engaging clips that expand your reach.",
  },
  {
    icon: FiPackage,
    title: "Product & Service Videos",
    description: "Showcase your offers clearly with videos designed to educate and convert viewers.",
  },
  {
    icon: FiUser,
    title: "Personal Brand Content",
    description: "Strengthen visibility and trust with consistent thought-leadership video content.",
  },
  {
    icon: FiStar,
    title: "Case Study & Testimonial Videos",
    description: "Highlight real success stories to build credibility and influence purchase decisions.",
  },
];

const CASE_ROWS: MetricRow[] = [
  { label: "Views", icon: FiEye, before: "520K", after: "2.1M", growth: "+304.8%" },
  { label: "Subscribers", icon: FiUsers, before: "2.3K", after: "48K", growth: "+1,978.3%" },
  { label: "Watch Time (Hours)", icon: FiClock, before: "62K", after: "166K", growth: "+167.0%" },
];

const FAQS: FaqItem[] = [
  {
    question: "How long does it take to see growth?",
    answer:
      "Most channels see measurable movement in impressions and click-through rate within the first 30–45 days, with compounding view and subscriber growth from month three onwards. The exact curve depends on your niche, upload cadence, and existing back catalogue.",
  },
  {
    question: "Do you work with new channels?",
    answer:
      "Yes. New channels often grow fastest because we can set up positioning, packaging, and SEO correctly from day one instead of undoing old habits. We'll agree on a realistic milestone plan before we start.",
  },
  {
    question: "Can you help me rank on YouTube search?",
    answer:
      "That's a core part of the work. We research the terms your audience actually searches, then build titles, descriptions, tags, chapters, and playlists around them — and keep refining based on what the analytics show after publishing.",
  },
  {
    question: "How do you guarantee results?",
    answer:
      "We don't sell guaranteed view counts — nobody credible can. What we commit to is a documented strategy, an agreed publishing cadence, transparent monthly reporting against baseline metrics, and continuous optimisation until the numbers move.",
  },
];

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
};

const SERVICE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "End-to-End YouTube Growth Services",
  serviceType: "YouTube channel growth and management",
  provider: { "@type": "Organization", name: "Cocoma Digital", url: "https://cocomadigital.com" },
  url: PAGE_URL,
  description:
    "Full-service YouTube growth — channel audits, content strategy, production, thumbnail design, YouTube SEO, Shorts creation, analytics and channel management.",
};

const YouTubeGrowthPage = () => (
  <div className="w-full bg-white text-neutral-900">
    <StructuredData data={[SERVICE_SCHEMA, FAQ_SCHEMA]} />

    <GrowthHero
      id="youtube-hero-title"
      badge={{ icon: FaYoutube, label: "Grow Views, Leads, and Your Brand" }}
      headline={[
        { text: "End-to-End" },
        { text: "YouTube Growth", accent: true },
        { text: "Services" },
      ]}
      paragraphs={[
        "From strategy to results, we handle it all. From SEO to content, we grow your channel and audience — so you can focus on creating.",
        "A full-service growth partner built to deliver real impact on YouTube: views, subscribers, engagement, and business.",
      ]}
      ctas={[
        { label: "Get Your Free Channel Audit", href: "/contact-us", icon: FiPlay },
        {
          label: "Book a Strategy Call",
          href: "/ScheduleMeeting",
          variant: "outline",
          icon: FiCalendar,
        },
      ]}
      trust={{
        initials: ["NV", "SG", "RB", "KT"],
        label: "Trusted by 500+ creators & businesses",
      }}
      dashboard={<ChannelDashboard />}
    />

    <StatsBand items={STATS} label="YouTube growth results at a glance" />

    {/* ── Services ── */}
    <Section labelledBy="youtube-services-title">
      <SectionHeading
        id="youtube-services-title"
        eyebrow="Complete Solution"
        title="Complete YouTube Growth Solutions Under One Roof"
        description="We handle every part of your YouTube growth journey, from strategy to scaling. Focused on results. Built on data. Designed for long-term growth."
      />
      <FeatureGrid items={SERVICES} columns={3} className="mt-8" />
    </Section>

    {/* ── Proven process ── */}
    <Section labelledBy="youtube-process-title" tone="tint">
      <SectionHeading
        id="youtube-process-title"
        eyebrow="Our Proven Process"
        title="Is Your YouTube Channel Struggling to Grow?"
      />
      <FeatureGrid items={PROVEN_PROCESS} columns={6} layout="stack" compact className="mt-8" />
    </Section>

    {/* ── What's included ── */}
    <Section labelledBy="youtube-deliverables-title">
      <SectionHeading
        id="youtube-deliverables-title"
        eyebrow="What We Do"
        title="What Our YouTube Growth Services Include"
      />
      <FeatureGrid items={DELIVERABLES} columns={4} className="mt-8" />
    </Section>

    {/* ── Content formats ── */}
    <Section labelledBy="youtube-formats-title">
      <SectionHeading
        id="youtube-formats-title"
        eyebrow="Content Results"
        title="Content That Drives Real YouTube Growth"
        description="We create and optimize content formats that help brands, creators, and businesses reach the right audience, increase engagement, and grow faster on YouTube."
      />
      <FeatureGrid items={CONTENT_FORMATS} columns={3} className="mt-8" />
    </Section>

    {/* ── Case study ── */}
    <Section labelledBy="youtube-case-title">
      <SectionHeading
        id="youtube-case-title"
        eyebrow="Proven Results"
        title="Real YouTube Growth, Measurable Results"
      />
      <CaseStudy
        content={{
          title: "Tech Explained",
          subtitle: "Niche: Tech Reviews",
          paragraphs: ["We helped Tech Explained 2X their views and grow subscribers consistently."],
          rows: CASE_ROWS,
          media: (
            <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-xl bg-linear-to-br from-neutral-800 via-neutral-900 to-black p-5">
              <p className="text-center text-xl leading-tight font-extrabold tracking-tight text-amber-300 uppercase sm:text-2xl">
                Tech
                <span className="block text-white">Explained</span>
              </p>
              <span
                aria-hidden="true"
                className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded bg-[#EE2B2C] px-2 py-1 text-[10px] font-semibold text-white"
              >
                <FaYoutube className="h-3 w-3" />
                Subscribe
              </span>
            </div>
          ),
        }}
      />
    </Section>

    {/* ── FAQ ── */}
    <Section labelledBy="youtube-faq-title">
      <SectionHeading id="youtube-faq-title" eyebrow="FAQs" title="Frequently Asked Questions" />
      <FaqAccordion items={FAQS} variant="marked" />
    </Section>

    <ClosingCta
      id="youtube-cta-title"
      title={
        <>
          Ready to Accelerate
          <span className="block">Your YouTube Growth?</span>
        </>
      }
      description="Let's grow your channel, audience, and business — with a strategy that works."
      ctas={[
        { label: "Get Your Free Channel Audit", href: "/contact-us", icon: FiPlay },
        {
          label: "Book a Free Strategy Call",
          href: "/ScheduleMeeting",
          variant: "outline",
          icon: FiCalendar,
        },
      ]}
      illustration={
        <div className="relative mx-auto flex aspect-[4/3] w-full max-w-md items-end justify-center gap-4">
          <span
            aria-hidden="true"
            className="flex h-24 w-32 items-center justify-center rounded-2xl bg-white/20 sm:h-32 sm:w-44"
          >
            <FiPlay className="h-12 w-12 fill-current text-white sm:h-16 sm:w-16" />
          </span>
          <span aria-hidden="true" className="flex items-end gap-2">
            <span className="h-16 w-6 rounded-t bg-white/25 sm:h-24 sm:w-8" />
            <span className="h-24 w-6 rounded-t bg-white/35 sm:h-36 sm:w-8" />
            <span className="h-32 w-6 rounded-t bg-white/50 sm:h-48 sm:w-8" />
          </span>
        </div>
      }
    />
  </div>
);

export default YouTubeGrowthPage;
