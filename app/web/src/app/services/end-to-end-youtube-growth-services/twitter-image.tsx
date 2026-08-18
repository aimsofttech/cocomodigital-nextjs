import { growthOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/src/lib/ogImage";

/* X/Twitter reads the same 1200x630 card as Open Graph — one design to keep
   current rather than two that drift apart.

   The card is shared by calling the same generator, not by re-exporting from
   ./opengraph-image. Route segment config (`dynamic` especially) is read by
   Next at compile time from the literal export in this file; a re-export is
   not statically analysable and fails the build. */

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
