import SingleService from "@/src/views/Services/SingleService";
import type { Metadata } from "next";
import StructuredData from "@/src/components/common/StructuredData/StructuredData";
import {
  getGroupServiceItem,
  getService,
  getServices,
  imageUrl,
} from "@/src/lib/content";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  buildMetadata,
  stripHtml,
  truncate,
} from "@/src/lib/seo";

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

/* Adapter — the API ServiceItem → the legacy shape SingleService
   view expects ({title, slug, image, featured_description,
   title, description,
   group_top_banner, group_single_service_portfolio_category, content}).
   Field names match the new ServiceItems schema fields added in
   Phase 5b. */
const adaptService = (s: any): any => {
  if (!s) return null;
  return {
    id: s.id,
    title: s.title,
    slug: s.slug,
    image: imageUrl(s),
    description: s.description,
    short_description: s.short_description,
    content: s.content,
    featured_description: s.featured_description,
    description2: s.description2 ?? s.description,
    group_top_banner: Array.isArray(s.group_top_banner)
      ? s.group_top_banner.map((b: any) => ({
          heading: b.heading,
          subheading: b.subheading,
          image:
            (typeof b.image === "object" && b.image?.url) ||
            b.legacyImageUrl,
          cta_text: b.cta_text,
          cta_url: b.cta_url,
        }))
      : [],
    /* Service media slider + "Recently Worked With" strip — passed
       through as-is; content.ts already maps them to the legacy field
       shape the SingleServiceSlider / RecentWork components read. */
    group_single_service_image: Array.isArray(s.group_single_service_image)
      ? s.group_single_service_image
      : [],
    group_single_service_recent_work: Array.isArray(
      s.group_single_service_recent_work,
    )
      ? s.group_single_service_recent_work
      : [],
    group_single_service_portfolio_category: Array.isArray(
      s.group_single_service_portfolio_category,
    )
      ? s.group_single_service_portfolio_category.map((c: any) => ({
          id: c.id,
          category_name: c.category_name,
          groupServiceItemId: c.groupServiceItemId,
          items: Array.isArray(c.items)
            ? c.items.map((i: any) => ({
                id: i.id,
                title: i.title,
                slug: i.slug || "",
                image:
                  (typeof i.image === "object"
                    ? i.image?.url
                    : i.image) ||
                  i.legacyImageUrl ||
                  null,
                video_url: i.video_url,
                description: i.description,
              }))
            : [],
        }))
      : [],
    faqs: Array.isArray(s.faqs) ? s.faqs : [],
    meta_title: s.meta_title,
    meta_description: s.meta_description,
  };
};

/**
 * Fallback: when no top-level service matches the slug, search
 * every service's portfolio categories for an item whose slug
 * (or titleToSlug(title)) matches. Returns a service-like doc
 * built from the item + its parent service, or null if not found.
 */
const findDocByPortfolioItemSlug = async (slug: string): Promise<any | null> => {
  const all = await getServices({ depth: 2, limit: 200 });
  for (const svc of all.docs) {
    const cats: any[] = svc.group_single_service_portfolio_category ?? [];
    for (const cat of cats) {
      const items: any[] = cat.items ?? [];
      for (const item of items) {
        const itemSlug = item.slug || titleToSlug(item.title ?? "");
        if (itemSlug === slug) {
          // Build a the API-doc-like object the adapter can consume.
          // Use the parent service's banner + portfolio + faqs so the
          // detail page has rich content even before the admin has
          // created a dedicated service record for this sub-item.
          return {
            id: item.id,
            title: item.title,
            slug: itemSlug,
            image: item.image,
            legacyImageUrl: item.legacyImageUrl ?? "",
            description: item.description ?? "",
            featured_description: item.description ?? "",
            group_top_banner: svc.group_top_banner ?? [],
            group_single_service_portfolio_category:
              svc.group_single_service_portfolio_category ?? [],
            faqs: svc.faqs ?? [],
            category: svc.category,
            meta_title: null,
            meta_description: null,
          };
        }
      }
    }
  }
  return null;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  let doc = await getService(slug);
  if (!doc) doc = await getGroupServiceItem(slug);
  if (!doc) doc = await findDocByPortfolioItemSlug(slug);
  const service = adaptService(doc);
  const description = truncate(
    service?.featured_description ||
      service?.description2 ||
      service?.description ||
      "Explore Cocoma Digital service details, portfolio, process, FAQs, and booking options.",
  );

  return buildMetadata({
    title: service?.title || service?.title || "Service",
    description,
    path: `/service/${slug}`,
    image: service?.image,
    imageAlt: service?.title || "Cocoma Digital service",
    category: "Services",
    keywords: [
      service?.title || "",
      service?.title || "",
      "service",
      "creative services",
    ].filter(Boolean),
  });
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;

  // 1. Try direct top-level service lookup by slug.
  let doc = await getService(slug);

  // 2. Fallback: the slug may belong to a GroupServiceItem (a
  //    sub-service one tier below the top-level service) — these have
  //    their own slug and detail endpoint.
  if (!doc) {
    doc = await getGroupServiceItem(slug);
  }

  // 3. Last resort: search portfolio items inside every service.
  //    This handles slugs auto-generated from portfolio item titles
  //    that haven't yet been created as standalone service records.
  if (!doc) {
    doc = await findDocByPortfolioItemSlug(slug);
  }

  const service = adaptService(doc);

  const categoryId =
    typeof doc?.category === "object" ? doc.category?.id : doc?.category;
  const siblingsResult = categoryId
    ? await getServices({
        where: { category: { equals: categoryId } },
        limit: 12,
      })
    : { docs: [] };
  const otherServices = (siblingsResult.docs as any[])
    .filter((s: any) => s.id !== doc?.id)
    .slice(0, 6)
    .map(adaptService);

  const initialPortfolio =
    service?.group_single_service_portfolio_category?.[0]?.items ?? [];

  return (
    <>
      <StructuredData
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: service?.title || service?.title,
            description: stripHtml(
              service?.featured_description ||
                service?.description ||
                "",
            ),
            image: service?.image ? absoluteUrl(service.image) : undefined,
            url: absoluteUrl(`/service/${slug}`),
            provider: { "@id": "https://cocomadigital.com/#organization" },
            areaServed: [
              "India",
              "United States",
              "United Kingdom",
              "Singapore",
              "Australia",
            ],
          },
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Services", path: "/" },
            {
              name:
                service?.title ||
                service?.title ||
                slug,
              path: `/service/${slug}`,
            },
          ]),
        ]}
      />
      <SingleService
        slug={slug}
        initialService={service ?? null}
        initialOtherServices={otherServices}
        initialPortfolio={initialPortfolio}
      />
    </>
  );
}
