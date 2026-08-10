import type { Metadata } from "next";
import PodcastEditingPage from "@/src/views/GrowthServices/PodcastEditingPage";
import { buildMetadata } from "@/src/lib/seo";

/* Static route — a literal segment wins over /services/[slug],
   so the existing dynamic service route is left untouched. */

export const metadata: Metadata = buildMetadata({
  title: "Podcast Editing & Growth Services",
  description:
    "Professional podcast editing and growth services — audio editing, video podcast editing, mixing and mastering, podcast SEO, short-form clips, publishing and distribution.",
  path: "/services/podcast-editing-and-growth-services",
  category: "Services",
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
});

export default function PodcastEditingRoute() {
  return <PodcastEditingPage />;
}
