import {
  OG_ALT,
  OG_CONTENT_TYPE,
  OG_SIZE,
  podcastOgCard,
} from "@/src/views/Services/PodcastGrowth/podcastOgCard";

/* Open Graph card for Facebook, LinkedIn, Slack and the rest.

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
