import { buildMetadata, getStaticSeo } from "@/src/lib/seo";
import MarketingCampaigns from "@/src/views/MarketingCampaigns/MarketingCampaigns";
import {
  getMarketingCategories,
  getMarketingHouseItems,
  imageUrl,
} from "@/src/lib/content";

export const metadata = buildMetadata(getStaticSeo("/work/marketing-campaigns"));

/* Adapter: the API MarketingHouseItem → legacy shape AllSeriesData
   uses ({id, slug, title, poster_image}). At depth=1 the API returns
   poster_image as a Media doc object — flatten to URL string here so
   <Image src=...> renders. Falls back to legacyImageUrl when the
   Media relationship is empty (some legacy rows still point at the
   S3 path verbatim via legacyImageUrl). */
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
  /* SSR seeding mirrors /marketing-portfolio. Without this the
     client-side fetcher in AllSeriesData runs after hydration but
     hands Media doc objects to <Image src=…> → empty white cards.
     Phase 5+ 2026-05-22: route was a bare client-only render,
     causing the "empty cards on /work/marketing-campaigns" report. */
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
