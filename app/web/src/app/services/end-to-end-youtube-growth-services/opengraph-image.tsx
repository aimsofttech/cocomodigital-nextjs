import { growthOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/src/lib/ogImage";

/* The share card for this page — served at
   /services/end-to-end-youtube-growth-services/opengraph-image and injected into the head by Next, so
   Facebook, LinkedIn and WhatsApp all resolve a real absolute PNG.

   Rendered per request rather than at build time for the same reason the page
   is: the copy lives in the admin panel, and the API is not reachable during
   `next build`. */

export const dynamic = "force-dynamic";
export const alt = "End-to-End YouTube Growth Services - Cocoma Digital";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return growthOgImage("end-to-end-youtube-growth-services", {
    title: "End-to-End YouTube Growth Services",
    description: "Channel audits, YouTube SEO, thumbnails, Shorts and full channel management from Cocoma Digital.",
    eyebrow: "YouTube Growth",
  });
}
