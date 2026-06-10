import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ContentCreated from "@/src/views/ContentCreated/ContentCreated";
import { buildMetadata } from "@/src/lib/seo";
import { getCreativeHouseItem, getServiceCategories } from "@/src/lib/content";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/* Phase 5+ 2026-05-23: dispatch /creative-house/<slug> by slug type.
   - If <slug> matches a service-category → render the hub +
     filtered creative grid for that category (existing behaviour).
   - If <slug> matches a creative-house ITEM → server-redirect to
     /creatives/<slug>, which owns the SingleVideo detail page.
   Without the redirect, item URLs typed (or copied from search)
   landed on the generic hub with an empty grid. Live serves both
   URL families separately, and we now do too. */
const isCategorySlug = async (slug: string): Promise<boolean> => {
  const res = await getServiceCategories({
    where: { slug: { equals: slug } },
    limit: 1,
  }).catch(() => ({ docs: [] }));
  return Boolean(res.docs?.length);
};

const isItemSlug = async (slug: string): Promise<boolean> => {
  const item = await getCreativeHouseItem(slug).catch(() => null);
  return Boolean(item?.id);
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildMetadata({
    title: "Creative House",
    description:
      "Explore Cocoma Digital creative house work, production formats, and content created by the team.",
    path: `/creative-house/${slug}`,
    category: "Creative",
  });
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;

  /* Category match first — that's the primary intended use of this
     route (filter the hub grid). Item-slug match second — these
     redirect to the canonical detail URL. Anything that matches
     neither falls through to the hub with no filter (matches what
     live does for unknown slugs: just render the editorial copy). */
  if (await isCategorySlug(slug)) {
    return <ContentCreated />;
  }
  if (await isItemSlug(slug)) {
    redirect(`/creatives/${slug}`);
  }
  return <ContentCreated />;
}
