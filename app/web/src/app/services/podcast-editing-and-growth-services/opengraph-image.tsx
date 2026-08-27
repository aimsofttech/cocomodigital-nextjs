import { growthOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/src/lib/ogImage";

/* The share card for this page — served at
   /services/podcast-editing-and-growth-services/opengraph-image and injected into the head by Next, so
   Facebook, LinkedIn and WhatsApp all resolve a real absolute PNG.

   Rendered per request rather than at build time for the same reason the page
   is: the copy lives in the admin panel, and the API is not reachable during
   `next build`. */

export const dynamic = "force-dynamic";
export const alt = "Podcast Editing & Growth Services - Cocoma Digital";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return growthOgImage("podcast-editing-and-growth-services", {
    title: "Podcast Editing & Growth Services",
    description: "Audio and video podcast editing, mixing, podcast SEO, clips, publishing and distribution.",
    eyebrow: "Podcast Editing",
  });
}
