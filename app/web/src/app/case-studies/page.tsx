import { buildMetadata, getStaticSeo } from "@/src/lib/seo";
import SuccessStoryViewAll from "@/src/views/SuccessStoryViewAll/SuccessStoryViewAll";
import { getSuccessStories, imageUrl } from "@/src/lib/content";

export const metadata = buildMetadata(getStaticSeo("/case-studies"));

/* Adapter: the API SuccessStory → legacy shape the SuccessStoriesViewAll
   component uses (client_title / client_img / display_order). */
const adaptStory = (s: any) => ({
  id: s.id,
  slug: s.slug,
  client_title: s.title || s.client_name,
  client_img: imageUrl(s),
  client_description: undefined,
  short_description: undefined,
  display_order: s.order,
});

export default async function Page() {
  /* All public success stories — limit:100 covers current + foreseeable.
     We trim incomplete entries (no slug = unlinkable) so the SSR'd
     payload is tighter. */
  const { docs } = await getSuccessStories({ limit: 100 });
  const initialStories = docs
    .filter((s: any) => s.id && s.slug)
    .map(adaptStory);

  return <SuccessStoryViewAll initialStories={initialStories} />;
}
