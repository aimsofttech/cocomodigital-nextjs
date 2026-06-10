import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildMetadata, getStaticSeo, truncate } from "@/src/lib/seo";
import ProspectPage from "@/src/views/Solutions/_shared/ProspectPage";
import { SOLUTIONS_DATA } from "@/src/views/Solutions/_shared/solutionsData";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/* ProspectPage is a client component that uses usePathname(), which is
   request-context — keep this route dynamic to avoid the static-
   generation conflict (DYNAMIC_SERVER_USAGE). */
export const dynamic = "force-dynamic";

/**
 * /solutions/[slug] — audience solution pages.
 *
 * Content is the static, hand-authored per-audience copy ported from
 * the original Solutions pages (see solutionsData.ts). The data is
 * already in the ProspectPage shape, so no API/transform is needed.
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const staticSeo = getStaticSeo(`/solutions/${slug}`);
  const data = SOLUTIONS_DATA[slug];
  return buildMetadata({
    ...staticSeo,
    title: data?.hero?.headline || staticSeo.title,
    description: data?.hero?.sub
      ? truncate(data.hero.sub, 160)
      : staticSeo.description,
    path: `/solutions/${slug}`,
    category: "Solutions",
  });
}

export default async function SolutionsDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const data = SOLUTIONS_DATA[slug];
  if (!data) notFound();
  return <ProspectPage data={data} />;
}
