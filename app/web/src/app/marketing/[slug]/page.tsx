import type { Metadata } from "next";
import WebSeriesIndividual from "@/src/views/AllWebSeries/WebSeriesIndividual";
import { getMarketingHouseItem, imageUrl } from "@/src/lib/content";
import { buildMetadata, truncate } from "@/src/lib/seo";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getMarketingHouseItem(slug);

  return buildMetadata({
    title: item?.title || "Marketing Campaign",
    description: truncate(
      item?.highlights_description ||
        (item?.title
          ? `${item.title} — Cocoma Digital marketing work.`
          : "Explore Cocoma Digital marketing campaign work, objectives, execution, and outcomes."),
    ),
    path: `/marketing/${slug}`,
    image: item
      ? imageUrl(item, "poster_image") || imageUrl(item)
      : undefined,
    category: "Marketing",
  });
}

export default function Page() {
  return <WebSeriesIndividual />;
}
