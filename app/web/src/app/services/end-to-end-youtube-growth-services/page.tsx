import type { Metadata } from "next";
import GrowthServiceRoute, { buildGrowthMetadata } from "@/src/views/GrowthServices/route";

export const dynamic = "force-dynamic";

const SLUG = "end-to-end-youtube-growth-services";

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
  secondaryKeywords: [
    "YouTube video editing services",
    "YouTube content strategy agency",
    "YouTube analytics and reporting",
    "YouTube channel optimization",
    "increase YouTube watch time",
    "YouTube thumbnail CTR optimization",
    "monetize a YouTube channel",
    "YouTube growth agency India",
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  return buildGrowthMetadata(SLUG, FALLBACK);
}

export default function YouTubeGrowthRoute() {
  return <GrowthServiceRoute slug={SLUG} />;
}
