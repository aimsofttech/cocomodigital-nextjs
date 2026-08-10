import type { Metadata } from "next";
import SocialVideoEditingPage from "@/src/views/GrowthServices/SocialVideoEditingPage";
import { buildMetadata } from "@/src/lib/seo";

/* Static route — a literal segment wins over /services/[slug],
   so the existing dynamic service route is left untouched. */

export const metadata: Metadata = buildMetadata({
  title: "Social Media Video Editing Services",
  description:
    "Professional social media video editing — Instagram Reels, YouTube Shorts, TikTok clips, promo videos, animated captions, motion graphics and multi-platform resizing.",
  path: "/services/social-media-video-editing-services",
  category: "Services",
  keywords: [
    "social media video editing",
    "Instagram Reels editing",
    "YouTube Shorts editing",
    "TikTok video editing",
    "short form video editing",
    "animated captions",
    "promotional video editing",
    "video editing agency",
  ],
});

export default function SocialMediaVideoEditingRoute() {
  return <SocialVideoEditingPage />;
}
