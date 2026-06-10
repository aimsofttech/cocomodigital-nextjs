import { buildMetadata, getStaticSeo } from "@/src/lib/seo";
import ContentCreated from "@/src/views/ContentCreated/ContentCreated";
import {
  getCreativeHouseItems,
  getServiceCategories,
  imageUrl,
} from "@/src/lib/content";

export const metadata = buildMetadata(getStaticSeo("/creative-house"));

/* Adapter: the API CreativeHouseItem → the legacy shape the
   CreativeHouseProject component uses (creative_house_video_title,
   creative_house_thumbnail, creative_house_video_url, slug, id). */
const adaptItem = (i: any) => ({
  id: i.id,
  slug: i.slug,
  creative_house_video_title: i.title,
  creative_house_thumbnail: imageUrl(i),
  creative_house_video_url: i.video_url,
  display_order: i.order,
  category_id: typeof i.category === "object" ? i.category?.id : i.category,
  creative_house_category_name:
    typeof i.category === "object" ? i.category?.category_name : undefined,
});

/* Adapter: the API ServiceCategory → filter-panel shape. */
const adaptCategory = (c: any) => ({
  id: c.id,
  creative_house_category_name: c.category_name,
  creative_house_category_slug: c.slug,
  slug: c.slug,
});

export default async function Page() {
  /* Parallel fetch — first 20 items match the page's pagination
     window. Categories + items both SSR'd. */
  const [itemsResult, categoriesResult] = await Promise.all([
    getCreativeHouseItems({ limit: 20, depth: 1 }),
    getServiceCategories({ limit: 50 }),
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
