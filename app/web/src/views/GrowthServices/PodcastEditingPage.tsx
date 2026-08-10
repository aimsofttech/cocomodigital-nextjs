import {
  FiActivity,
  FiBarChart2,
  FiCalendar,
  FiClock,
  FiFileText,
  FiFilm,
  FiHeadphones,
  FiImage,
  FiMessageSquare,
  FiMic,
  FiPlay,
  FiRss,
  FiScissors,
  FiSearch,
  FiSettings,
  FiShare2,
  FiSliders,
  FiSmartphone,
  FiTrendingDown,
  FiTrendingUp,
  FiType,
  FiUsers,
  FiVideo,
  FiVideoOff,
  FiVolume2,
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
import PodcastDashboard from "@/src/components/Services/growth/dashboards/PodcastDashboard";
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
  "https://cocomadigital.com/services/podcast-editing-and-growth-services";

const STATS: StatItem[] = [
  { icon: FiMic, value: "300+", label: "Episodes Edited" },
  { icon: FiPlay, value: "5M+", label: "Podcast Views Generated" },
  { icon: FiScissors, value: "500+", label: "Short Clips Created" },
  { icon: FiUsers, value: "95%", label: "Client Retention Rate" },
];

const SERVICES: FeatureItem[] = [
  {
    icon: FiActivity,
    title: "Audio Editing",
    description: "Remove noise, filler words, pauses, and mistakes.",
  },
  {
    icon: FiVideo,
    title: "Video Podcast Editing",
    description: "Multi-camera editing, captions, and branded visuals.",
  },
  {
    icon: FiSliders,
    title: "Audio Mixing & Mastering",
    description: "Balanced, polished, and professional sound.",
  },
  {
    icon: FiSearch,
    title: "Podcast SEO",
    description: "Optimise episode titles, descriptions, and metadata.",
  },
  {
    icon: FiFilm,
    title: "Short-Form Content",
    description: "Create Reels, Shorts, and social clips from episodes.",
  },
  {
    icon: FiRss,
    title: "Publishing & Distribution",
    description: "Schedule and publish across Spotify, Apple, and YouTube.",
  },
];

const CHALLENGES: FeatureItem[] = [
  {
    icon: FiVolume2,
    title: "Poor Audio Quality",
    description: "Makes episodes hard to enjoy.",
  },
  {
    icon: FiClock,
    title: "Time-Consuming Editing",
    description: "Editing takes too much of your time.",
  },
  {
    icon: FiTrendingDown,
    title: "Low Listener Retention",
    description: "Listeners drop off early.",
  },
  {
    icon: FiUsers,
    title: "Limited Reach",
    description: "Your episodes aren't discovered.",
  },
  {
    icon: FiCalendar,
    title: "Inconsistent Publishing",
    description: "Irregular uploads kill momentum.",
  },
  {
    icon: FiVideoOff,
    title: "Lack of Promo Content",
    description: "No content to promote episodes.",
  },
];

const PROCESS: ProcessStep[] = [
  { title: "Discovery", description: "We learn about your podcast goals and audience." },
  { title: "File Collection", description: "You send us your recordings and assets." },
  { title: "Editing & Enhancement", description: "We edit, clean, and enhance your episode." },
  {
    title: "Content Repurposing",
    description: "We create clips, reels, and other content assets.",
  },
  {
    title: "Optimisation & Publishing",
    description: "We optimise SEO and publish across platforms.",
  },
  {
    title: "Growth Analysis",
    description: "We track performance and provide insights for growth.",
  },
];

const DELIVERABLES: FeatureItem[] = [
  {
    icon: FiActivity,
    title: "Audio Cleanup",
    description: "Remove noise, clicks, pops, and unwanted sounds.",
  },
  {
    icon: FiFilm,
    title: "Video Editing",
    description: "Professional cuts, transitions, captions, and branded elements.",
  },
  {
    icon: FiFileText,
    title: "Show Notes",
    description: "Engaging show notes that improve SEO and listener experience.",
  },
  {
    icon: FiType,
    title: "Transcriptions",
    description: "Accurate episode transcriptions for accessibility and SEO.",
  },
  {
    icon: FiSearch,
    title: "Podcast SEO",
    description: "Optimise episodes, descriptions, and metadata.",
  },
  {
    icon: FiSmartphone,
    title: "Shorts & Reels",
    description: "High-performing short clips for social media platforms.",
  },
  {
    icon: FiImage,
    title: "Thumbnail Design",
    description: "Eye-catching thumbnails that boost clicks.",
  },
  {
    icon: FiBarChart2,
    title: "Analytics & Reporting",
    description: "Detailed reports to track performance and growth.",
  },
];

const WHY_US: FeatureItem[] = [
  {
    icon: FiHeadphones,
    title: "Complete Podcast Management",
    description: "We handle every step from editing to publishing and growth.",
  },
  {
    icon: FiSliders,
    title: "Professional Editing Quality",
    description: "Industry-standard editing for clear, engaging, and polished episodes.",
  },
  {
    icon: FiTrendingUp,
    title: "Growth-Focused Approach",
    description: "We optimise content and strategy to grow your audience.",
  },
  {
    icon: FiSettings,
    title: "Transparent Workflow",
    description: "Clear communication, updates, and complete transparency.",
  },
];

const CONTENT_ASSETS: FeatureItem[] = [
  {
    icon: FaYoutube,
    title: "YouTube Shorts",
    description: "Short, engaging clips optimised for YouTube Shorts.",
  },
  {
    icon: FaInstagram,
    title: "Instagram Reels",
    description: "Vertical videos designed to perform on Instagram.",
  },
  {
    icon: FaTiktok,
    title: "TikTok Clips",
    description: "Viral-ready clips that capture attention on TikTok.",
  },
  {
    icon: FiActivity,
    title: "Audiograms",
    description: "Shareable audio snippets with captivating visuals.",
  },
  {
    icon: FiMessageSquare,
    title: "Quote Graphics",
    description: "Branded quote cards for engagement and shares.",
  },
  {
    icon: FiFileText,
    title: "Blog Articles / Show Notes",
    description: "SEO-friendly blog posts that extend your reach.",
  },
];

const AUDIO_POINTS = [
  "Noise reduction for crystal clear audio",
  "Voice leveling for consistent volume",
  "Remove filler words and awkward pauses",
  "Polished mastering for a professional sound",
];

const VIDEO_POINTS = [
  "Multi-camera cuts and smooth transitions",
  "Accurate subtitles and captions",
  "Branded lower-thirds and graphics",
  "YouTube-ready formatting and optimization",
];

const WAVE_BARS = [
  3, 6, 9, 4, 8, 5, 10, 3, 7, 5, 9, 4, 8, 6, 3, 9, 5, 7, 4, 8, 6, 10, 3, 7, 5, 9, 4, 6, 8, 3,
];

const BAR_CLASSES = [
  "h-1",
  "h-2",
  "h-3",
  "h-4",
  "h-5",
  "h-6",
  "h-7",
  "h-8",
  "h-9",
  "h-10",
  "h-11",
];

const CASE_ROWS: MetricRow[] = [
  { label: "Downloads", icon: FiPlay, before: "25K", after: "240K", growth: "+860%" },
  { label: "Retention", icon: FiUsers, before: "28%", after: "54%", growth: "+93%" },
  { label: "Social Reach", icon: FiShare2, before: "50K", after: "750K", growth: "+1400%" },
  { label: "Subscribers", icon: FiTrendingUp, before: "3.5K", after: "22K", growth: "+528%" },
];

const FAQS: FaqItem[] = [
  {
    question: "Do you edit both audio and video podcasts?",
    answer:
      "Yes. We handle audio-only shows, video podcasts, and hybrid formats — including multi-camera setups, remote recordings, and studio sessions. Every episode is delivered in the formats your distribution platforms need.",
  },
  {
    question: "Can you remove background noise and improve voice quality?",
    answer:
      "Absolutely. Noise reduction, hum and hiss removal, de-essing, voice leveling, and full mixing and mastering are part of every episode we edit, so your show sounds consistent from the first minute to the last.",
  },
  {
    question: "Do you create podcast Shorts and Reels?",
    answer:
      "Yes. Every episode can be repurposed into vertical short-form clips for YouTube Shorts, Instagram Reels, and TikTok — complete with captions, branded framing, and hooks chosen from the strongest moments in the episode.",
  },
  {
    question: "Can you publish episodes for us?",
    answer:
      "We can. Our team schedules and publishes across Spotify, Apple Podcasts, YouTube, and your website — including titles, descriptions, chapters, tags, and thumbnails — so all you need to do is record.",
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
  name: "Podcast Editing & Growth Services",
  serviceType: "Podcast editing and podcast growth",
  provider: { "@type": "Organization", name: "Cocoma Digital", url: "https://cocomadigital.com" },
  url: PAGE_URL,
  description:
    "Professional podcast editing and growth services — audio editing, video podcast editing, mixing and mastering, podcast SEO, short-form clips, publishing and distribution.",
};

const PodcastEditingPage = () => (
  <div className="w-full bg-white text-neutral-900">
    <StructuredData data={[SERVICE_SCHEMA, FAQ_SCHEMA]} />

    <GrowthHero
      id="podcast-hero-title"
      badge={{ icon: FiMic, label: "Record Your Podcast. We Handle the Rest." }}
      headline={[
        { text: "Professional" },
        { text: "Podcast Editing &", accent: true },
        { text: "Growth Services" },
      ]}
      paragraphs={[
        "Transform raw recordings into polished, engaging, and platform-ready podcast episodes.",
        "From audio and video editing to short-form content, podcast SEO, publishing, distribution, and performance analysis, we manage every stage of your podcast growth.",
      ]}
      ctas={[
        { label: "Get a Free Podcast Audit", href: "/contact-us" },
        { label: "Book a Strategy Call", href: "/ScheduleMeeting" },
      ]}
      trust={{
        initials: ["AR", "JS", "MK", "PT"],
        label: "Trusted by podcasters, creators, coaches & businesses worldwide",
      }}
      dashboard={<PodcastDashboard />}
    />

    <StatsBand items={STATS} label="Podcast editing results at a glance" />

    {/* ── Services ── */}
    <Section labelledBy="podcast-services-title">
      <SectionHeading
        id="podcast-services-title"
        eyebrow="Our Services"
        title="Complete Podcast Editing and Growth Solutions"
        description="Everything you need to produce, optimise, and grow a professional podcast."
      />
      <FeatureGrid items={SERVICES} columns={3} className="mt-8" />
    </Section>

    {/* ── Challenges ── */}
    <Section labelledBy="podcast-challenges-title" tone="tint">
      <SectionHeading
        id="podcast-challenges-title"
        eyebrow="Challenges We Solve"
        title="Is Your Podcast Struggling to Grow?"
      />
      <FeatureGrid items={CHALLENGES} columns={6} layout="stack" compact className="mt-8" />
    </Section>

    {/* ── Process ── */}
    <Section labelledBy="podcast-process-title">
      <SectionHeading
        id="podcast-process-title"
        eyebrow="Our Process"
        title="A Simple Process From Recording to Publishing"
      />
      <ProcessTimeline steps={PROCESS} />
    </Section>

    {/* ── What we deliver ── */}
    <Section labelledBy="podcast-deliverables-title">
      <SectionHeading
        id="podcast-deliverables-title"
        eyebrow="What We Deliver"
        title="What Our Podcast Services Include"
      />
      <FeatureGrid items={DELIVERABLES} columns={4} className="mt-8" />
    </Section>

    {/* ── Format showcase ── */}
    <Section labelledBy="podcast-formats-title">
      <SectionHeading id="podcast-formats-title" title="Professional Quality Across Every Format" />

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Audio panel */}
        <article className="relative overflow-hidden rounded-2xl border border-[#EE2B2C]/20 bg-[#EE2B2C]/5 p-5 sm:p-6">
          <h3 className="text-lg font-bold text-[#EE2B2C]">Audio Podcast Editing</h3>

          <div className="mt-4 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EE2B2C] text-white">
              <FiPlay className="h-4 w-4 fill-current" aria-hidden="true" />
            </span>
            <span
              aria-hidden="true"
              className="flex min-w-0 flex-1 items-center gap-[3px] overflow-hidden"
            >
              {WAVE_BARS.map((amplitude, index) => (
                <span
                  key={index}
                  className={`w-[3px] shrink-0 rounded-full bg-[#EE2B2C]/70 ${BAR_CLASSES[amplitude]}`}
                />
              ))}
            </span>
          </div>
          <p className="mt-1.5 flex justify-between px-1 text-[11px] text-neutral-400">
            <span>00:00</span>
            <span>48:32</span>
          </p>

          <ul className="mt-5 space-y-2.5">
            {AUDIO_POINTS.map((point) => (
              <CheckBullet key={point}>{point}</CheckBullet>
            ))}
          </ul>

          <FiHeadphones
            aria-hidden="true"
            className="pointer-events-none absolute right-4 bottom-4 h-12 w-12 text-[#EE2B2C]/25"
          />
        </article>

        {/* Video panel */}
        <article className="relative overflow-hidden rounded-2xl border border-sky-200 bg-sky-50 p-5 sm:p-6">
          <h3 className="text-lg font-bold text-sky-700">Video Podcast Editing</h3>

          <div className="relative mt-4 flex aspect-[16/8] items-center justify-center overflow-hidden rounded-xl bg-linear-to-br from-neutral-700 via-neutral-800 to-black">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-neutral-900">
              <FiPlay className="h-4 w-4 fill-current" aria-hidden="true" />
            </span>
            <span className="absolute bottom-2 left-3 text-[10px] text-white/80">00:00 / 48:32</span>
            <span
              aria-hidden="true"
              className="absolute right-3 bottom-2 flex h-6 w-6 items-center justify-center rounded bg-sky-500 text-white"
            >
              <FiVideo className="h-3 w-3" />
            </span>
          </div>

          <ul className="mt-5 space-y-2.5">
            {VIDEO_POINTS.map((point) => (
              <CheckBullet key={point} tone="sky">
                {point}
              </CheckBullet>
            ))}
          </ul>

          <FiType
            aria-hidden="true"
            className="pointer-events-none absolute right-4 bottom-4 h-12 w-12 text-sky-600/20"
          />
        </article>
      </div>
    </Section>

    {/* ── Why choose us ── */}
    <Section labelledBy="podcast-why-title">
      <SectionHeading id="podcast-why-title" title="Why Choose Our Podcast Editing Agency?" />
      <FeatureGrid items={WHY_US} columns={4} className="mt-8" />
    </Section>

    {/* ── Case study ── */}
    <Section labelledBy="podcast-case-title">
      <SectionHeading
        id="podcast-case-title"
        eyebrow="Case Study"
        title="Professional Editing. Stronger Reach. Measurable Growth."
      />
      <CaseStudy
        content={{
          title: "The Growth Show",
          paragraphs: [
            "We improved audio and video quality, optimised SEO, created 200+ short clips, and established a consistent publishing strategy.",
            "The result? Massive growth across downloads, retention, reach, and subscribers.",
          ],
          rows: CASE_ROWS,
          media: (
            <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-xl bg-linear-to-br from-neutral-800 via-neutral-900 to-black p-5">
              <p className="text-center text-xl leading-tight font-extrabold tracking-tight text-white uppercase sm:text-2xl">
                The Growth
                <span className="block text-[#EE2B2C]">Show</span>
                <span className="mt-1 block text-[10px] font-medium tracking-normal text-white/60 normal-case">
                  with Alex Martin
                </span>
              </p>
              <FiMic aria-hidden="true" className="absolute right-3 bottom-3 h-8 w-8 text-white/30" />
            </div>
          ),
        }}
      />
    </Section>

    {/* ── Repurposed content ── */}
    <Section labelledBy="podcast-assets-title">
      <SectionHeading
        id="podcast-assets-title"
        eyebrow="Content That Helps Your Podcast Grow"
        title="Turn One Episode Into Multiple Content Assets"
      />
      <FeatureGrid items={CONTENT_ASSETS} columns={3} className="mt-8" />
    </Section>

    {/* ── FAQ ── */}
    <Section labelledBy="podcast-faq-title">
      <SectionHeading id="podcast-faq-title" eyebrow="FAQs" title="Frequently Asked Questions" />
      <FaqAccordion items={FAQS} />
    </Section>

    <ClosingCta
      id="podcast-cta-title"
      title={
        <>
          Ready to Produce and Grow
          <span className="block">a Professional Podcast?</span>
        </>
      }
      description="Turn every recording into a polished podcast episode and a complete library of promotional content designed to reach more listeners."
      ctas={[
        { label: "Get Your Free Podcast Audit", href: "/contact-us" },
        { label: "Speak With a Podcast Growth Expert", href: "/ScheduleMeeting", variant: "outline" },
      ]}
      illustration={
        <div className="relative mx-auto flex aspect-[4/3] w-full max-w-md items-end justify-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-28 w-28 items-center justify-center rounded-full bg-white/15 sm:h-36 sm:w-36"
          >
            <FiMic className="h-14 w-14 text-white sm:h-20 sm:w-20" />
          </span>
          <span aria-hidden="true" className="flex items-end gap-2">
            <span className="h-12 w-6 rounded-t bg-white/25 sm:h-16 sm:w-8" />
            <span className="h-20 w-6 rounded-t bg-white/35 sm:h-28 sm:w-8" />
            <span className="h-28 w-6 rounded-t bg-white/50 sm:h-40 sm:w-8" />
          </span>
        </div>
      }
    />
  </div>
);

export default PodcastEditingPage;
