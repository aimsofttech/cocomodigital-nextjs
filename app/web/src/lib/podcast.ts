import { apiGet } from "./apiClient";

/**
 * Data access for the podcast money page
 * (/podcast-video-editing-marketing-services).
 *
 * The API assembles the whole page in one response — parent record plus every
 * band's rows, already grouped — so the route needs exactly one fetch. `apiGet`
 * never throws: an unreachable API resolves to `null` and the route falls back
 * to the copy shipped in `podcastFallback.ts`, so the page can never go blank.
 */

export const PODCAST_PAGE_SLUG = "podcast-video-editing-marketing-services";

/* Every repeating row carries the id of the record it came from, so an editor
   viewing the page can be linked straight to that record's form in the admin.
   Content ids only — the admin's own auth still gates anything actionable.

   Optional because the shipped fallback copy in podcastFallback.ts has no
   database rows behind it; with no id there is nothing to link to, and the
   Edit pencil renders nothing. */
export interface PodcastStat {
  id?: string;
  value: string;
  label: string;
  /** Supporting line under the label. Empty on the trust strip. */
  description: string;
}

export interface PodcastCard {
  id?: string;
  /** Registry name from PodcastVisuals' icon map (e.g. "video", "mic"). */
  icon: string;
  /** Printed ordinal — process steps only. */
  step: string;
  title: string;
  body: string;
  /** Audience signal, step duration, or monthly volume. */
  meta: string;
  /** Service-card tags. */
  points: string[];
}

export interface PodcastStage {
  id?: string;
  /** Key into PodcastVisuals' diagram registry; "none" draws nothing. */
  diagramKey: string;
  step: string;
  name: string;
  promise: string;
  detail: string;
  capabilities: string[];
}

export interface PodcastShot {
  id?: string;
  image: string;
  alt: string;
  caption: string;
  /** Spans two grid columns. */
  wide: boolean;
}

export interface PodcastFaqItem {
  id?: string;
  question: string;
  answer: string;
}

export interface PodcastCta {
  id?: string;
  label: string;
  href: string;
  variant: "primary" | "secondary";
}

export interface PodcastHeroMediaData {
  /** Null renders the poster as a plain photograph, with no play button. */
  videoId: string | null;
  poster: string;
  alt: string;
  playLabel: string;
}

export interface PodcastAuditFormCopy {
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  showLabel: string;
  showPlaceholder: string;
  submitLabel: string;
  submittingLabel: string;
  note: string;
  doneTitle: string;
  doneBody: string;
  contactEmail: string;
  errorFallback: string;
  /** Folded into the lead message as "[Type: …]" so leads stay filterable. */
  leadTag: string;
}

export interface PodcastSeo {
  title: string;
  description: string;
  keywords: string[];
  secondaryKeywords: string[];
  /** Absolute or root-relative; "" means "derive it from the path". */
  canonicalUrl: string;
  noIndex: boolean;
  schema: {
    name: string;
    serviceType: string;
    description: string;
    areaServed: string[];
    audienceType: string;
    offerCatalogName: string;
    breadcrumbLabel: string;
  };
  /* Overrides only: each is "" unless an editor filled it in, and the route
     forwards it to buildMetadata only when set, so the site's own fallback
     chain still decides everything left blank. */
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
    /** "" falls back to the Open Graph image. */
    image: string;
    imageAlt: string;
  };
}

export interface PodcastPageData {
  id: string;
  slug: string;
  name: string;
  path: string;
  pageUrl: string;
  hero: {
    eyebrow: string;
    title: string;
    sub: string;
    priceBadge: string;
    priceBadgeIcon: string;
    hoursBadge: string;
    hoursBadgeIcon: string;
    media: PodcastHeroMediaData;
  };
  credentials: { signature: string; caption: string };
  problem: { title: string; lead: string; backgroundImage: string };
  method: { eyebrow: string; title: string; lead: string };
  services: { eyebrow: string; title: string; lead: string };
  audience: { eyebrow: string; title: string };
  pricing: {
    eyebrow: string;
    heading: string;
    prefix: string;
    floor: string;
    unit: string;
    lead: string;
    includedTitle: string;
    included: string[];
    scalesTitle: string;
    scales: string[];
    note: string;
  };
  month: {
    eyebrow: string;
    title: string;
    lead: string;
    tableNote: string;
    columns: { deliverable: string; volume: string; detail: string };
  };
  notFor: {
    eyebrow: string;
    heading: string;
    lead: string;
    items: string[];
    footnote: string;
  };
  founder: {
    eyebrow: string;
    name: string;
    role: string;
    portrait: string;
    portraitAlt: string;
    lines: string[];
  };
  operations: { eyebrow: string; title: string };
  studio: { eyebrow: string; heading: string; body: string; scaleNote: string };
  process: { eyebrow: string; title: string };
  proof: { eyebrow: string; title: string; paragraphs: string[] };
  faq: { eyebrow: string; title: string };
  final: { title: string; lead: string; points: string[] };
  auditForm: PodcastAuditFormCopy;
  seo: PodcastSeo;
  /** Copy printed onto the generated share card. */
  ogCard: {
    eyebrow: string;
    title: string;
    description: string;
    badgeOne: string;
    badgeTwo: string;
  };
  displayOrder: number;

  trustStats: PodcastStat[];
  problemStats: PodcastStat[];
  scaleStats: PodcastStat[];
  serviceCards: PodcastCard[];
  audienceCards: PodcastCard[];
  operationCards: PodcastCard[];
  processSteps: PodcastCard[];
  monthRows: PodcastCard[];
  stages: PodcastStage[];
  studioShots: PodcastShot[];
  faqs: PodcastFaqItem[];
  ctas: {
    hero: PodcastCta[];
    pricing: PodcastCta[];
    founder: PodcastCta[];
    proof: PodcastCta[];
  };
}

export interface PodcastPageSummary {
  id: string;
  slug: string;
  name: string;
  path: string;
  pageUrl: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  updatedAt: string | null;
  displayOrder: number;
}

/** Every published podcast page — for sitemaps and nav links. */
export async function getPodcastPages(): Promise<PodcastPageSummary[]> {
  return (await apiGet<PodcastPageSummary[]>("/podcast-pages")) ?? [];
}

/** One fully-assembled podcast page, or `null` if it is missing or unpublished. */
export async function getPodcastPage(
  slug: string = PODCAST_PAGE_SLUG,
): Promise<PodcastPageData | null> {
  return apiGet<PodcastPageData>(`/podcast-pages/${encodeURIComponent(slug)}`);
}
