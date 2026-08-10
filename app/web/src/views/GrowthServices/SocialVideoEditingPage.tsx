import {
  FiAward,
  FiBarChart2,
  FiBookOpen,
  FiCrop,
  FiEye,
  FiFilm,
  FiFrown,
  FiHeart,
  FiImage,
  FiLayers,
  FiMessageSquare,
  FiMic,
  FiPackage,
  FiPlay,
  FiScissors,
  FiSettings,
  FiStar,
  FiThumbsUp,
  FiTrendingDown,
  FiTrendingUp,
  FiType,
  FiUser,
  FiUsers,
  FiVideo,
  FiVolume2,
  FiZap,
} from "react-icons/fi";
import { FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa6";
import StructuredData from "@/src/components/common/StructuredData/StructuredData";
import CaseStudy from "@/src/components/Services/growth/CaseStudy";
import ClosingCta from "@/src/components/Services/growth/ClosingCta";
import FaqAccordion from "@/src/components/Services/growth/FaqAccordion";
import FeatureGrid from "@/src/components/Services/growth/FeatureGrid";
import GrowthHero from "@/src/components/Services/growth/GrowthHero";
import ProcessTimeline from "@/src/components/Services/growth/ProcessTimeline";
import StatsBand from "@/src/components/Services/growth/StatsBand";
import SocialDashboard from "@/src/components/Services/growth/dashboards/SocialDashboard";
import {
  CheckBullet,
  Section,
  SectionHeading,
} from "@/src/components/Services/growth/Primitives";
import type {
  FaqItem,
  FeatureItem,
  MetricRow,
  ProcessStep,
  StatItem,
} from "@/src/components/Services/growth/types";

const PAGE_URL =
  "https://cocomadigital.com/services/social-media-video-editing-services";

const STATS: StatItem[] = [
  { icon: FiVideo, value: "1,000+", label: "Social Videos Edited" },
  { icon: FiEye, value: "20M+", label: "Views Generated" },
  { icon: FiFilm, value: "500+", label: "Short-Form Videos Created" },
  { icon: FiThumbsUp, value: "95%", label: "Client Satisfaction Rate" },
];

const SERVICES: FeatureItem[] = [
  {
    icon: FaInstagram,
    title: "Instagram Reels Editing",
    description: "Fast-paced edits, captions & trends to boost reach and engagement.",
  },
  {
    icon: FaYoutube,
    title: "YouTube Shorts Editing",
    description: "Vertical edits with strong hooks that keep viewers watching.",
  },
  {
    icon: FaTiktok,
    title: "TikTok Video Editing",
    description: "Trendy edits, effects & captions that go viral on TikTok.",
  },
  {
    icon: FiMic,
    title: "Podcast Clip Editing",
    description: "Turn long episodes into engaging short clips for social media.",
  },
  {
    icon: FiZap,
    title: "Promotional Video Editing",
    description: "High-converting promo videos that showcase your brand.",
  },
  {
    icon: FiImage,
    title: "Thumbnail & Caption Design",
    description: "Eye-catching thumbnails & captions that increase clicks & views.",
  },
];

const PROBLEMS: FeatureItem[] = [
  {
    icon: FiTrendingDown,
    title: "Low Audience Retention",
    description: "Viewers drop off within seconds.",
  },
  {
    icon: FiZap,
    title: "Weak Video Hooks",
    description: "Content doesn't grab attention early.",
  },
  {
    icon: FiScissors,
    title: "Poor Editing Quality",
    description: "Amateur edits hurt your credibility.",
  },
  {
    icon: FiFrown,
    title: "Low Engagement",
    description: "Likes, comments & shares stay low.",
  },
  {
    icon: FiLayers,
    title: "Inconsistent Branding",
    description: "Your content lacks a consistent look.",
  },
  {
    icon: FiCrop,
    title: "Wrong Platform Formatting",
    description: "Incorrect sizes & formats limit your reach.",
  },
];

const PROCESS: ProcessStep[] = [
  { title: "Discovery", description: "We understand your goals, audience & content needs." },
  { title: "File Collection", description: "You send us your raw footage & brand assets." },
  {
    title: "Content Selection",
    description: "We pick the best moments & structure for maximum impact.",
  },
  {
    title: "Professional Editing",
    description: "We edit with precision, captions, effects & engaging storytelling.",
  },
  {
    title: "Platform Optimisation",
    description: "We optimise formats, aspect ratios & hooks for each platform.",
  },
  { title: "Review & Delivery", description: "You review, request changes & receive final videos." },
];

const DELIVERABLES: FeatureItem[] = [
  {
    icon: FiType,
    title: "Animated Captions",
    description: "Dynamic captions that improve watch time & accessibility.",
  },
  {
    icon: FiSettings,
    title: "Motion Graphics",
    description: "Engaging text animations, transitions & visual effects.",
  },
  {
    icon: FiVolume2,
    title: "Audio Enhancement",
    description: "Clean audio, noise reduction & volume balancing.",
  },
  {
    icon: FiZap,
    title: "Hook Optimisation",
    description: "Strong intros & hooks that capture attention instantly.",
  },
  {
    icon: FiLayers,
    title: "B-Roll & Stock Footage",
    description: "High-quality b-roll to make your content more engaging.",
  },
  {
    icon: FiAward,
    title: "Branded Visuals",
    description: "Logos, colours, fonts & elements that build brand recognition.",
  },
  {
    icon: FiCrop,
    title: "Multi-Platform Resizing",
    description: "Reels, Shorts, TikTok & more — perfectly sized for every platform.",
  },
  {
    icon: FiBarChart2,
    title: "Analytics & Reporting",
    description: "Performance insights to help you grow your content strategy.",
  },
];

/* Vertical-format showcase — one card per platform. */
const PLATFORMS = [
  {
    icon: FaInstagram,
    name: "Instagram Reels",
    caption: "Level up your content",
    metric: "12.4K",
    points: [
      "Fast-paced cuts & transitions",
      "Animated captions",
      "Strong hooks in first 2 seconds",
      "Trend-focused editing",
      "Vertical format (9:16)",
    ],
  },
  {
    icon: FaYoutube,
    name: "YouTube Shorts",
    caption: "3 tips to grow fast",
    metric: "15K",
    points: [
      "Hook-driven storytelling",
      "Engaging captions",
      "High retention edits",
      "Optimised for discovery",
      "Vertical format (9:16)",
    ],
  },
  {
    icon: FaTiktok,
    name: "TikTok Videos",
    caption: "Make it viral",
    metric: "8.7K",
    points: [
      "Trendy effects & transitions",
      "Auto captions",
      "Viral sound integration",
      "Engagement-focused edits",
      "Vertical format (9:16)",
    ],
  },
];

const WHY_US: FeatureItem[] = [
  {
    icon: FiCrop,
    title: "Platform-Specific Expertise",
    description: "We know what works on each platform and edit accordingly.",
  },
  {
    icon: FiStar,
    title: "Engaging Editing Style",
    description: "We create videos that grab attention and keep viewers watching till the end.",
  },
  {
    icon: FiAward,
    title: "Consistent Brand Identity",
    description: "We maintain your brand voice, visuals & messaging in every video.",
  },
  {
    icon: FiZap,
    title: "Fast & Organised Workflow",
    description: "Quick turnaround, clear communication & hassle-free process.",
  },
];

const CONTENT_ASSETS: FeatureItem[] = [
  {
    icon: FiBookOpen,
    title: "Educational Videos",
    description: "Teach, inform & provide value to your audience.",
  },
  {
    icon: FiMessageSquare,
    title: "Promotional Videos",
    description: "Promote offers, launches & special campaigns.",
  },
  {
    icon: FiStar,
    title: "Testimonial Videos",
    description: "Showcase customer reviews & success stories.",
  },
  {
    icon: FiFilm,
    title: "Behind-the-Scenes Videos",
    description: "Build trust with real behind-the-scenes clips.",
  },
  {
    icon: FiUser,
    title: "Personal Brand Videos",
    description: "Share your journey, insights & expertise.",
  },
  {
    icon: FiMic,
    title: "Podcast Clips",
    description: "Repurpose long-form episodes into short, engaging clips.",
  },
  {
    icon: FiPackage,
    title: "Product Videos",
    description: "Show your product in action with scroll-stopping edits.",
  },
];

const CASE_ROWS: MetricRow[] = [
  { label: "Monthly Video Views", icon: FiEye, before: "80K", after: "1.2M", growth: "+1,400%" },
  { label: "Avg Watch Time", icon: FiPlay, before: "24%", after: "58%", growth: "+141%" },
  { label: "Followers", icon: FiUsers, before: "12K", after: "68K", growth: "+466%" },
  { label: "Enquiries", icon: FiTrendingUp, before: "20", after: "145", growth: "+625%" },
];

const FAQS: FaqItem[] = [
  {
    question: "What are social media video editing services?",
    answer:
      "It's end-to-end editing for the content you publish on social platforms — Reels, Shorts, TikToks, promos, testimonials, and podcast clips. We handle cutting, pacing, captions, motion graphics, audio, branding, and per-platform formatting so each video is ready to post.",
  },
  {
    question: "Do you create Reels and YouTube Shorts?",
    answer:
      "Yes. Vertical short-form is our core output. Every clip is cut for a strong opening hook, captioned, branded, and exported at 9:16 with the safe zones each platform expects.",
  },
  {
    question: "Can you repurpose long-form videos?",
    answer:
      "Absolutely. Send us a podcast, webinar, livestream, or long YouTube upload and we'll pull the highest-performing moments into a batch of short clips — each one framed, captioned, and ready for a different platform.",
  },
  {
    question: "Do you add captions and branding?",
    answer:
      "Every edit includes animated captions and your brand kit — logos, colour palette, fonts, lower-thirds, and intro/outro elements — so your feed looks consistent no matter who is watching.",
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
  name: "Social Media Video Editing Services",
  serviceType: "Social media video editing",
  provider: { "@type": "Organization", name: "Cocoma Digital", url: "https://cocomadigital.com" },
  url: PAGE_URL,
  description:
    "Professional social media video editing — Instagram Reels, YouTube Shorts, TikTok clips, promotional videos, animated captions, motion graphics and multi-platform resizing.",
};

const SocialVideoEditingPage = () => (
  <div className="w-full bg-white text-neutral-900">
    <StructuredData data={[SERVICE_SCHEMA, FAQ_SCHEMA]} />

    <GrowthHero
      id="social-hero-title"
      badge={{ icon: FiVideo, label: "Create Better Videos. Grow Faster." }}
      headline={[
        { text: "Professional" },
        { text: "Social Media Video", accent: true },
        { text: "Editing Services" },
      ]}
      paragraphs={[
        "Turn raw footage into scroll-stopping content for every platform.",
        "We edit Reels, Shorts, TikToks, podcast clips, promo videos, and branded social content that captures attention, increases reach, boosts engagement, and drives real conversions.",
      ]}
      ctas={[
        { label: "Get a Free Video Editing Consultation", href: "/contact-us" },
        { label: "View Our Editing Portfolio", href: "/creative-house", variant: "outline" },
      ]}
      trust={{
        initials: ["RS", "DK", "LM", "AV"],
        label: "Trusted by creators, brands, coaches & agencies worldwide",
      }}
      dashboard={<SocialDashboard />}
    />

    <StatsBand items={STATS} label="Social video editing results at a glance" />

    {/* ── Services ── */}
    <Section labelledBy="social-services-title">
      <SectionHeading
        id="social-services-title"
        eyebrow="Our Services"
        title="Complete Social Media Video Editing Solutions"
        description="Engaging, platform-ready videos designed to capture attention and drive results."
      />
      <FeatureGrid items={SERVICES} columns={3} className="mt-8" />
    </Section>

    {/* ── Problems ── */}
    <Section labelledBy="social-problems-title" tone="tint">
      <SectionHeading
        id="social-problems-title"
        title="Are Your Social Media Videos Failing to Perform?"
      />
      <FeatureGrid items={PROBLEMS} columns={6} layout="stack" compact className="mt-8" />
    </Section>

    {/* ── Process ── */}
    <Section labelledBy="social-process-title">
      <SectionHeading
        id="social-process-title"
        title="A Simple Process From Raw Footage to Published Content"
      />
      <ProcessTimeline steps={PROCESS} />
    </Section>

    {/* ── What's included ── */}
    <Section labelledBy="social-deliverables-title">
      <SectionHeading id="social-deliverables-title" title="What Our Video Editing Services Include" />
      <FeatureGrid items={DELIVERABLES} columns={4} className="mt-8" />
    </Section>

    {/* ── Platform showcase ── */}
    <Section labelledBy="social-platforms-title">
      <SectionHeading
        id="social-platforms-title"
        title="Create Scroll-Stopping Reels, Shorts & TikToks"
      />

      <ul className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
        {PLATFORMS.map(({ icon: Icon, name, caption, metric, points }) => (
          <li key={name}>
            <article className="h-full rounded-2xl border border-neutral-200 bg-white p-5">
              <h3 className="flex items-center gap-2.5 text-base font-bold text-neutral-900">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EE2B2C]/10 text-[#EE2B2C]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {name}
              </h3>

              <div className="relative mt-4 flex aspect-[9/13] flex-col justify-between overflow-hidden rounded-xl bg-linear-to-br from-neutral-700 via-neutral-800 to-black p-4">
                <span className="self-start rounded bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white">
                  9:16
                </span>
                <p className="text-lg leading-tight font-extrabold text-white uppercase">
                  {caption}
                </p>
                <p className="flex items-center gap-1.5 text-[11px] text-white/70">
                  <FiHeart className="h-3 w-3" aria-hidden="true" />
                  {metric}
                </p>
              </div>

              <ul className="mt-4 space-y-2.5">
                {points.map((point) => (
                  <CheckBullet key={point}>{point}</CheckBullet>
                ))}
              </ul>
            </article>
          </li>
        ))}
      </ul>
    </Section>

    {/* ── Why choose us ── */}
    <Section labelledBy="social-why-title">
      <SectionHeading
        id="social-why-title"
        title="Why Choose Our Social Media Video Editing Agency?"
      />
      <FeatureGrid items={WHY_US} columns={4} className="mt-8" />
    </Section>

    {/* ── Case study ── */}
    <Section labelledBy="social-case-title">
      <SectionHeading
        id="social-case-title"
        eyebrow="Case Study"
        title="Better Editing. Higher Engagement. Stronger Social Growth."
      />
      <CaseStudy
        content={{
          title: "Social Growth",
          paragraphs: [
            "We helped a personal brand grow by improving hooks, captions, branding & short-form consistency.",
            "Our edits increased watch time, boosted reach, and turned viewers into followers and leads.",
          ],
          rows: CASE_ROWS,
          media: (
            <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-xl bg-linear-to-br from-neutral-800 via-neutral-900 to-black p-5">
              <p className="text-center text-xl leading-tight font-extrabold tracking-tight text-white uppercase sm:text-2xl">
                Social
                <span className="block text-[#EE2B2C]">Growth</span>
              </p>
              <span
                aria-hidden="true"
                className="absolute right-3 bottom-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-neutral-900"
              >
                <FiPlay className="h-3.5 w-3.5 fill-current" />
              </span>
            </div>
          ),
        }}
      />
    </Section>

    {/* ── Repurposed content ── */}
    <Section labelledBy="social-assets-title">
      <SectionHeading
        id="social-assets-title"
        eyebrow="Content That Helps Your Brand Grow"
        title="Turn One Recording Into Multiple Content Assets"
      />
      <FeatureGrid items={CONTENT_ASSETS} columns={4} className="mt-8" />
    </Section>

    {/* ── FAQ ── */}
    <Section labelledBy="social-faq-title">
      <SectionHeading id="social-faq-title" title="Frequently Asked Questions" />
      <FaqAccordion items={FAQS} />
    </Section>

    <ClosingCta
      id="social-cta-title"
      title={
        <>
          Ready to Create Social Media
          <span className="block">Videos That Get Attention?</span>
        </>
      }
      description="Turn your raw footage into professional, engaging, platform-ready videos that grow your brand."
      ctas={[
        { label: "Get Your Free Video Editing Consultation", href: "/contact-us" },
        { label: "Speak With a Video Editing Expert", href: "/ScheduleMeeting", variant: "outline" },
      ]}
      illustration={
        <div className="relative mx-auto flex aspect-[4/3] w-full max-w-md items-end justify-center gap-4">
          <span
            aria-hidden="true"
            className="flex h-32 w-24 items-center justify-center rounded-2xl border-4 border-white/40 bg-white/15 sm:h-44 sm:w-32"
          >
            <FiPlay className="h-10 w-10 fill-current text-white sm:h-14 sm:w-14" />
          </span>
          <span aria-hidden="true" className="flex items-end gap-2">
            <span className="h-14 w-6 rounded-t bg-white/25 sm:h-20 sm:w-8" />
            <span className="h-24 w-6 rounded-t bg-white/35 sm:h-32 sm:w-8" />
            <span className="h-32 w-6 rounded-t bg-white/50 sm:h-44 sm:w-8" />
          </span>
        </div>
      }
    />
  </div>
);

export default SocialVideoEditingPage;
