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
  keywords: string[];
}

export async function buildGrowthMetadata(
  slug: string,
  fallback: GrowthRouteFallback,
): Promise<Metadata> {
  const service = await getGrowthService(slug);

  return buildMetadata({
    title: service?.seo.title || fallback.title,
    description: service?.seo.description || fallback.description,
    path: `/services/${slug}`,
    category: "Services",
    keywords: service?.seo.keywords.length ? service.seo.keywords : fallback.keywords,
  });
}

export default async function GrowthServiceRoute({ slug }: { slug: string }) {
  const service = await getGrowthService(slug);
  /* An unpublished or deleted page 404s rather than rendering an empty shell —
     the route is only reachable from a link that promises real content. */
  if (!service) notFound();

  return <GrowthServicePage service={service} />;
}
