import type { Metadata } from "next";
import GrowthServiceRoute, { buildGrowthMetadata } from "@/src/views/GrowthServices/route";

/* Static route — a literal segment wins over /services/[slug],
   so the existing dynamic service route is left untouched.

   Content is served from the API (admin panel → Growth Services), so the route
   renders per-request rather than being baked in at build time. */

export const dynamic = "force-dynamic";

const SLUG = "podcast-editing-and-growth-services";

/* Used only when the API is unreachable, so the page still carries sensible
   metadata instead of falling back to the site defaults. */
const FALLBACK = {
  title: "Podcast Editing & Growth Services",
  description:
    "Professional podcast editing and growth services — audio editing, video podcast editing, mixing and mastering, podcast SEO, short-form clips, publishing and distribution.",
  keywords: [
    "podcast editing services",
    "podcast editing agency",
    "video podcast editing",
    "podcast audio mixing",
    "podcast SEO",
    "podcast shorts and reels",
    "podcast publishing and distribution",
    "podcast growth services",
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  return buildGrowthMetadata(SLUG, FALLBACK);
}

export default function PodcastEditingRoute() {
  return <GrowthServiceRoute slug={SLUG} />;
}
