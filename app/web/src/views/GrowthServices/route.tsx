import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildMetadata } from "@/src/lib/seo";
import { getGrowthService } from "@/src/lib/growthServices";
import GrowthServicePage from "./GrowthServicePage";

/**
 * Shared plumbing for the three /services/<growth-page> routes.
 *
 * Each route file stays a thin shell: it names its slug and its fallback SEO
 * copy, and everything else — fetching, metadata, not-found handling — happens
 * here so the three pages can't drift apart.
 *
 * The fallback matters because `apiGet` resolves to `null` whenever the API is
 * unreachable (and during `next build` by design). Metadata then falls back to
 * the copy shipped with the route rather than emitting an untitled page.
 */

export interface GrowthRouteFallback {
  title: string;
  description: string;
  /** The terms the page is written to rank for. */
  keywords: string[];
  /** Supporting terms, listed after the focus keywords. */
  secondaryKeywords?: string[];
}

export async function buildGrowthMetadata(
  slug: string,
  fallback: GrowthRouteFallback,
): Promise<Metadata> {
  const service = await getGrowthService(slug);
  const seo = service?.seo;
  const path = `/services/${slug}`;

  const title = seo?.title || fallback.title;
  const description = seo?.description || fallback.description;

  return buildMetadata({
    title,
    description,
    path,
    category: "Services",
    /* The admin panel's canonical field wins, but a blank one must not produce
       a canonical pointing at the site root — hence the path fallback. */
    canonical: seo?.canonicalUrl || path,
    keywords: seo?.keywords.length ? seo.keywords : fallback.keywords,
    secondaryKeywords: seo?.secondaryKeywords.length
      ? seo.secondaryKeywords
      : fallback.secondaryKeywords,
    noIndex: seo?.noIndex,
    type: seo?.openGraph.type,
    ogTitle: seo?.openGraph.title,
    ogDescription: seo?.openGraph.description,
    twitterCard: seo?.twitter.card,
    twitterTitle: seo?.twitter.title,
    twitterDescription: seo?.twitter.description,
    twitterImage: seo?.twitter.image || `${path}/twitter-image`,
    twitterImageAlt: seo?.twitter.imageAlt || undefined,
    /* Point at this route's own generated card unless the panel names a
       custom image. The URL is written out rather than left to Next's
       file-convention resolution so it is unambiguously absolute against the
       production host: the scrapers fetch it from outside, and a localhost or
       protocol-relative URL renders as a blank preview. */
    image: seo?.openGraph.image || `${path}/opengraph-image`,
    imageAlt: seo?.openGraph.imageAlt || `${title} - Cocoma Digital`,
    imageWidth: seo?.openGraph.imageWidth,
    imageHeight: seo?.openGraph.imageHeight,
    imageType: seo?.openGraph.imageType,
  });
}

export default async function GrowthServiceRoute({ slug }: { slug: string }) {
  const service = await getGrowthService(slug);
  /* An unpublished or deleted page 404s rather than rendering an empty shell —
     the route is only reachable from a link that promises real content. */
  if (!service) notFound();

  return <GrowthServicePage service={service} />;
}
