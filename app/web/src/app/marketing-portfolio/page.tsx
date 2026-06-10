import { buildMetadata, getStaticSeo } from "@/src/lib/seo";
import MarketingCampaigns from "@/src/views/MarketingCampaigns/MarketingCampaigns";
import {
  getMarketingCategories,
  getMarketingHouseItems,
  imageUrl,
} from "@/src/lib/content";

export const metadata = buildMetadata(getStaticSeo("/marketing-portfolio"));

/* Adapter: the API MarketingHouseItem → legacy shape AllSeriesData
   uses ({id, slug, title, poster_image}). */
const adaptItem = (i: any) => ({
  id: i.id,
  slug: i.slug,
  title: i.title,
  poster_image: imageUrl(i, "poster_image") || imageUrl(i),
  display_order: i.order,
  category_id: typeof i.category === "object" ? i.category?.id : i.category,
});

/* Adapter: the API MarketingCategory → dropdown shape. */
const adaptCategory = (c: any) => ({
  id: c.id,
  category_name: c.name,
  slug: c.slug,
});

export default async function Page() {
  /* Parallel fetch — 32 items matches AllSeriesData's page window.
     Categories from the API. Year filter dropdown is empty for v1
     (the API MarketingHouseItem has no dedicated `year` field —
     Phase 6 may add one). */
  const [itemsResult, categoriesResult] = await Promise.all([
    getMarketingHouseItems({ limit: 32, depth: 1 }),
    getMarketingCategories({ limit: 50 }),
  ]);

  const initialItems = itemsResult.docs.map(adaptItem);
  const initialMarketingCategory = categoriesResult.docs.map(adaptCategory);
  const initialMarketingYear: any[] = [];

  return (
    <MarketingCampaigns
      initialMarketingCategory={initialMarketingCategory}
      initialMarketingYear={initialMarketingYear}
      initialItems={initialItems}
      initialTotalItemCount={itemsResult.totalDocs}
    />
  );
}
