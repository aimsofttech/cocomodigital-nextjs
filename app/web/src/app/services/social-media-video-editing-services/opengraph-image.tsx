import { growthOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/src/lib/ogImage";

/* The share card for this page — served at
   /services/social-media-video-editing-services/opengraph-image and injected into the head by Next, so
   Facebook, LinkedIn and WhatsApp all resolve a real absolute PNG.

   Rendered per request rather than at build time for the same reason the page
   is: the copy lives in the admin panel, and the API is not reachable during
   `next build`. */

export const dynamic = "force-dynamic";
export const alt = "Social Media Video Editing Services - Cocoma Digital";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return growthOgImage("social-media-video-editing-services", {
    title: "Social Media Video Editing Services",
    description: "Reels, Shorts and TikTok edits with captions, motion graphics and multi-platform resizing.",
    eyebrow: "Social Video Editing",
  });
}
