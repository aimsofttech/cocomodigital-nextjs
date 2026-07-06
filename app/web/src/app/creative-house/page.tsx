import { buildMetadata, getStaticSeo } from "@/src/lib/seo";
import ContentCreated from "@/src/views/ContentCreated/ContentCreated";
import {
  getCreativeHouseItems,
  getCreativeCategories,
  imageUrl,
} from "@/src/lib/content";

export const metadata = buildMetadata(getStaticSeo("/creative-house"));

/* Adapter: the API CreativeHouseItem → the legacy shape the
   CreativeHouseProject component uses (videoTitle,
   thumbnail, videoUrl, slug, id). */
const adaptItem = (i: any) => ({
  id: i.id,
  slug: i.slug,
  videoTitle: i.title,
  thumbnail: imageUrl(i),
  videoUrl: i.video_url,
  uploadVideoUrl: i.upload_video,
  youtubeId: i.youtube_id,
  display_order: i.order,
  category_id: typeof i.category === "object" ? i.category?.id : i.category,
  name:
    typeof i.category === "object" ? i.category?.category_name : undefined,
});

/* Adapter: the API CreativeHouseCategory → filter-panel shape. */
const adaptCategory = (c: any) => ({
  id: c.id,
  name: c.name,
  slug: c.slug,
});

export default async function Page() {
  /* Parallel fetch — first 20 items match the page's pagination
     window. Categories + items both SSR'd. */
  const [itemsResult, categoriesResult] = await Promise.all([
    getCreativeHouseItems({ limit: 20, depth: 1 }),
    getCreativeCategories({ limit: 50 }),
  ]);

  const initialItems = itemsResult.docs.map(adaptItem);
  const initialItemCount = itemsResult.totalDocs;
  const initialCreativeCategory = categoriesResult.docs.map(adaptCategory);

  return (
    <ContentCreated
      initialCreativeCategory={initialCreativeCategory}
      initialItems={initialItems}
      initialItemCount={initialItemCount}
    />
  );
}
