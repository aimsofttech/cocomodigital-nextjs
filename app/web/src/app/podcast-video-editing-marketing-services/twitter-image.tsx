import {
  OG_ALT,
  OG_CONTENT_TYPE,
  OG_SIZE,
  podcastOgCard,
} from "@/src/views/Services/PodcastGrowth/podcastOgCard";

/* X/Twitter reads the same 1200x630 card as Open Graph — one design
   to keep current rather than two that drift apart.

   Route segment config must be declared with literal exports HERE — Next
   reads it at compile time and cannot follow a re-export. The card
   itself comes from the shared generator so the two never drift. */
export const runtime = "nodejs";
export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return podcastOgCard();
}
