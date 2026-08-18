import type { Metadata } from "next";
import GrowthServiceRoute, { buildGrowthMetadata } from "@/src/views/GrowthServices/route";

/* Static route — a literal segment wins over /services/[slug],
   so the existing dynamic service route is left untouched.

   Content is served from the API (admin panel → Growth Services), so the route
   renders per-request rather than being baked in at build time. */

export const dynamic = "force-dynamic";

const SLUG = "end-to-end-youtube-growth-services";

/* Used only when the API is unreachable, so the page still carries sensible
   metadata instead of falling back to the site defaults. */
const FALLBACK = {
  title: "End-to-End YouTube Growth Services",
  description:
    "Full-service YouTube growth — channel audits, content strategy, production, thumbnail design, YouTube SEO, Shorts creation, analytics and channel management.",
  keywords: [
    "YouTube growth services",
    "YouTube channel management",
    "YouTube SEO",
    "YouTube channel audit",
    "thumbnail design",
    "YouTube Shorts creation",
    "grow YouTube subscribers",
    "YouTube growth agency",
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  return buildGrowthMetadata(SLUG, FALLBACK);
}

export default function YouTubeGrowthRoute() {
  return <GrowthServiceRoute slug={SLUG} />;
}
