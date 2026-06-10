import type { Metadata } from "next";
import ClientPage from "@/src/views/SucessStories/clientSucess";
import { findBySlug, imageUrl } from "@/src/lib/content";
import { buildMetadata, truncate } from "@/src/lib/seo";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const story = await findBySlug<any>("success-stories", slug);

  return buildMetadata({
    title:
      story?.title ||
      story?.client_name ||
      "Case Study",
    description: truncate(
      story?.title && story?.client_name
        ? `${story.title} — case study with ${story.client_name}.`
        : "Read a Cocoma Digital case study on content, creative, marketing, and audience growth.",
    ),
    path: `/case-studies/${slug}`,
    image: story ? imageUrl(story) : undefined,
    type: "article",
    category: "Case Studies",
  });
}

export default function Page() {
  return <ClientPage />;
}
