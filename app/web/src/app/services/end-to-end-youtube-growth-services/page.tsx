import type { Metadata } from "next";
import YouTubeGrowthPage from "@/src/views/GrowthServices/YouTubeGrowthPage";
import { buildMetadata } from "@/src/lib/seo";

/* Static route — a literal segment wins over /services/[slug],
   so the existing dynamic service route is left untouched. */

export const metadata: Metadata = buildMetadata({
  title: "End-to-End YouTube Growth Services",
  description:
    "Full-service YouTube growth — channel audits, content strategy, production, thumbnail design, YouTube SEO, Shorts creation, analytics and channel management.",
  path: "/services/end-to-end-youtube-growth-services",
  category: "Services",
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
});

export default function YouTubeGrowthRoute() {
  return <YouTubeGrowthPage />;
}
