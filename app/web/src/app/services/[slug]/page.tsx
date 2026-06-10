import type { Metadata } from "next";
import Services from "@/src/views/Service/Services";
import { getService, getServices, imageUrl } from "@/src/lib/content";
import { buildMetadata, truncate } from "@/src/lib/seo";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const titleToSlug = (title: string): string =>
  String(title ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

/* /services/[slug] is the legacy "group services" page — a single
   parent service that has child services (via the
   group_single_service_portfolio_category nesting in ServiceItems).
   The Services view consumes a `initialGroupService` object with:
   {
     title / service_title / group_service_title,
     description / featured_description,
     image, group_top_banner[], group_service_category[],
     ...
   }
   Phase 5b/5c: read the parent service from the API, build that
   shape from the new nested fields. */
const adaptGroupService = (parent: any, children: any[]): any => {
  if (!parent) return null;
  return {
    services: {
      title: parent.title,
      service_title: parent.title,
      group_service_title: parent.group_service_item_title || parent.title,
      heading: parent.title,
      description: parent.description,
      featured_description: parent.featured_description,
      image: imageUrl(parent),
      slug: parent.slug,
      group_top_banner: Array.isArray(parent.group_top_banner)
        ? parent.group_top_banner.map((b: any) => ({
          heading: b.heading,
          subheading: b.subheading,
          image:
            (typeof b.image === "object" && b.image?.url) ||
            b.legacyImageUrl,
          /* Phase 5+ 2026-05-22: pass video_url + CTA fields
             through so HeroBanner can render the YouTube embed
             (ServiceCategoryHero reads banner?.video || video_url)
             and the CTA button. */
          video_url: b.video_url,
          button_text: b.cta_text,
          cta_url: b.cta_url,
        }))
        : [],
      /* Children category from the portfolio_category groups +
         direct sibling services in the same the API category.
         Phase 5+ 2026-05-22: the rendering code in Services.tsx
         reads `api_group_service_items` (legacy field name) but
         our the API schema stores items under `items`. Same for
         per-item `thumbnail` (legacy) vs `image` (Media ref).
         Adapt here so the renderer stays compatible. */
      group_service_category: [
        ...(Array.isArray(parent.group_single_service_portfolio_category)
          ? parent.group_single_service_portfolio_category.map((cat: any) => ({
            ...cat,
            api_group_service_items: (Array.isArray(cat.items) ? cat.items : []).map(
              (it: any) => ({
                ...it,
                slug: it.slug || titleToSlug(it.title),
                thumbnail:
                  (typeof it.image === "object" && it.image?.url) ||
                  it.legacyImageUrl ||
                  "",
              }),
            ),
          }))
          : []),
        ...(children || []).map((c: any) => ({
          category_name: c.title,
          slug: c.slug,
          image: imageUrl(c),
          items: [],
          api_group_service_items: [],
        })),
      ],
    },
  };
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const parent = await getService(slug);
  const firstBanner = parent?.group_top_banner?.[0];

  return buildMetadata({
    title:
      parent?.title ||
      parent?.group_service_item_title ||
      firstBanner?.heading ||
      "Service Category",
    description: truncate(
      parent?.description ||
      parent?.featured_description ||
      firstBanner?.subheading ||
      "Explore Cocoma Digital service categories, included services, process, and booking options.",
    ),
    path: `/services/${slug}`,
    image: parent ? imageUrl(parent) : undefined,
    category: "Services",
  });
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;

  const parent = await getService(slug);
  const categoryId =
    typeof parent?.category === "object" ? parent.category?.id : parent?.category;
  const siblingsResult = categoryId
    ? await getServices({
      where: { category: { equals: categoryId } },
      limit: 12,
    })
    : { docs: [] };
  const children = (siblingsResult.docs || []).filter(
    (s: any) => s.id !== parent?.id,
  );

  const groupServiceData = adaptGroupService(parent, children);

  return <Services slug={slug} initialGroupService={groupServiceData} />;
}
