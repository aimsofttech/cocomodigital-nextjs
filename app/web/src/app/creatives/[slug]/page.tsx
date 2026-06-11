import type { Metadata } from "next";
import SingleVideo from "@/src/views/SingleVideo/SingleVideo";
import { getCreativeHouseItem, imageUrl } from "@/src/lib/content";
import { buildMetadata, truncate } from "@/src/lib/seo";
interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getCreativeHouseItem(slug);

  return buildMetadata({
    title: item?.title || "Creative Work",
    description: truncate(
      item?.title
        ? `${item.title} — Cocoma Digital creative work.`
        : "Explore Cocoma Digital creative work, video production, editing, design, and campaign assets.",
    ),
    path: `/creatives/${slug}`,
    image: item ? imageUrl(item) : undefined,
    category: "Creative",
  });
}

export default function Page() {
  return <SingleVideo />;
}
