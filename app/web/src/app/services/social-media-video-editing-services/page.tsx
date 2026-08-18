import type { Metadata } from "next";
import GrowthServiceRoute, { buildGrowthMetadata } from "@/src/views/GrowthServices/route";

/* Static route — a literal segment wins over /services/[slug],
   so the existing dynamic service route is left untouched.

   Content is served from the API (admin panel → Growth Services), so the route
   renders per-request rather than being baked in at build time. */

export const dynamic = "force-dynamic";

const SLUG = "social-media-video-editing-services";

/* Used only when the API is unreachable, so the page still carries sensible
   metadata instead of falling back to the site defaults. */
const FALLBACK = {
  title: "Social Media Video Editing Services",
  description:
    "Professional social media video editing — Instagram Reels, YouTube Shorts, TikTok clips, promotional videos, animated captions, motion graphics and multi-platform resizing.",
  keywords: [
    "social media video editing",
    "Instagram Reels editing",
    "YouTube Shorts editing",
    "TikTok video editing",
    "short-form video editing",
    "animated captions",
    "motion graphics",
    "video editing agency",
  ],
  secondaryKeywords: [
    "Reels editing services",
    "vertical video editing agency",
    "subtitle and caption editing",
    "video repurposing services",
    "brand video editing agency",
    "UGC video editing",
    "9:16 video resizing",
    "social media content editing India",
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  return buildGrowthMetadata(SLUG, FALLBACK);
}

export default function SocialVideoEditingRoute() {
  return <GrowthServiceRoute slug={SLUG} />;
}
