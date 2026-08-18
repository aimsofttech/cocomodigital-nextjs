import { apiGet } from "./apiClient";

/**
 * Data access for the growth landing pages (YouTube growth, social media video
 * editing, podcast editing).
 *
 * The API assembles a whole page in one response — parent record, section
 * definitions, and every item grouped by section — so a route needs exactly one
 * fetch. `apiGet` never throws: a missing or unreachable page resolves to
 * `null`, and the route renders its not-found path rather than failing.
 */

export interface GrowthHeadlineLine {
  text: string;
  /** Rendered with the brand marker highlight. */
  accent: boolean;
}

export interface GrowthCta {
  label: string;
  href: string;
  variant: "solid" | "outline";
  icon?: string;
}

export interface GrowthFeature {
  title: string;
  description: string;
  icon?: string;
}

export interface GrowthShowcase {
  title: string;
  caption?: string;
  metric?: string;
  icon?: string;
  watermarkIcon?: string;
  mediaBadge: "ratio" | "play" | "video" | "none";
  tone: "brand" | "soft" | "page";
  points: string[];
}

export interface GrowthStat {
  icon?: string;
  value: string;
  label: string;
}

export interface GrowthCaseMetric {
  label: string;
  icon?: string;
  before: string;
  after: string;
  growth: string;
}

export interface GrowthFaq {
  question: string;
  answer: string;
}

export interface GrowthContentBlock {
  /** Heading level this block renders at — 3 to 6, nested under the H2. */
  level: 3 | 4 | 5 | 6;
  heading: string;
  body: string[];
  bullets: string[];
}

export type GrowthRenderer =
  | "grid"
  | "timeline"
  | "showcase"
  | "format-panels"
  | "case-study"
  | "faq"
  | "article";

export interface GrowthSection {
  key: string;
  renderer: GrowthRenderer;
  eyebrow: string;
  title: string;
  description: string;
  tone: "page" | "tint";
  columns: 2 | 3 | 4 | 6;
  layout: "row" | "stack";
  compact: boolean;
  faqVariant: "plain" | "marked";
}

export interface GrowthService {
  id: string;
  slug: string;
  name: string;
  pageUrl: string;
  hero: {
    badge: { icon: string; label: string };
    headline: GrowthHeadlineLine[];
    paragraphs: string[];
    trust: { initials: string[]; label: string };
    dashboardKey: "channel" | "social" | "podcast" | "none";
  };
  statsLabel: string;
  caseStudy: {
    title: string;
    subtitle: string;
    paragraphs: string[];
    media: {
      lineOne: string;
      lineTwo: string;
      accentLine: "one" | "two" | "none";
      subtitle: string;
      badge: "youtube" | "play" | "mic" | "none";
    };
  };
  closing: {
    title: string[];
    description: string;
    illustrationKey: "youtube" | "social" | "podcast" | "none";
  };
  /** Accessible names for the three illustrated blocks; "" = decorative. */
  mediaAlt: { hero: string; caseStudy: string; closing: string };
  seo: {
    title: string;
    description: string;
    keywords: string[];
    secondaryKeywords: string[];
    /** Absolute URL; "" means "derive it from the slug". */
    canonicalUrl: string;
    noIndex: boolean;
    serviceType: string;
    schemaDescription: string;
    openGraph: {
      title: string;
      description: string;
      type: "website" | "article";
      /** "" falls back to the route's generated opengraph-image. */
      image: string;
      imageAlt: string;
      imageWidth: number;
      imageHeight: number;
      imageType: string;
    };
    twitter: {
      card: "summary_large_image" | "summary";
      title: string;
      description: string;
      image: string;
      imageAlt: string;
    };
  };
  displayOrder: number;
  sections: GrowthSection[];
  /** Features keyed by the section they belong to. */
  features: Record<string, GrowthFeature[]>;
  /** Showcase panels keyed by the section they belong to. */
  showcases: Record<string, GrowthShowcase[]>;
  /** Long-form SEO copy blocks keyed by the section they belong to. */
  contents: Record<string, GrowthContentBlock[]>;
  stats: GrowthStat[];
  caseMetrics: GrowthCaseMetric[];
  faqs: GrowthFaq[];
  ctas: { hero: GrowthCta[]; closing: GrowthCta[] };
}

export interface GrowthServiceSummary {
  id: string;
  slug: string;
  name: string;
  pageUrl: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  updatedAt: string | null;
  displayOrder: number;
}

/** Every published growth page — for nav links, sitemaps and static params. */
export async function getGrowthServices(): Promise<GrowthServiceSummary[]> {
  return (await apiGet<GrowthServiceSummary[]>("/growth-services")) ?? [];
}

/** One fully-assembled growth page, or `null` if it is missing or unpublished. */
export async function getGrowthService(
  slug: string,
): Promise<GrowthService | null> {
  return apiGet<GrowthService>(`/growth-services/${encodeURIComponent(slug)}`);
}

/** Items for a section, resolved from whichever collection its renderer uses. */
export const sectionFeatures = (
  service: GrowthService,
  section: GrowthSection,
): GrowthFeature[] => service.features?.[section.key] ?? [];

export const sectionShowcases = (
  service: GrowthService,
  section: GrowthSection,
): GrowthShowcase[] => service.showcases?.[section.key] ?? [];

export const sectionContents = (
  service: GrowthService,
  section: GrowthSection,
): GrowthContentBlock[] => service.contents?.[section.key] ?? [];
