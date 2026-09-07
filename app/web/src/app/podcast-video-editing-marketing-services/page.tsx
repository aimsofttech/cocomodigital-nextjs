import type { Metadata } from "next";
import StructuredData from "@/src/components/common/StructuredData/StructuredData";
import PodcastGrowthPage from "@/src/views/Services/PodcastGrowth/PodcastGrowthPage";
import { PODCAST_FALLBACK } from "@/src/views/Services/PodcastGrowth/podcastFallback";
import { PODCAST_PAGE_SLUG, getPodcastPage } from "@/src/lib/podcast";
import type { PodcastPageData } from "@/src/lib/podcast";
import { SITE_URL, absoluteUrl, breadcrumbJsonLd, buildMetadata } from "@/src/lib/seo";

/**
 * /podcast-video-editing-marketing-services — canonical money page.
 *
 * This is a STATIC route segment that deliberately sits alongside the
 * dynamic /services/[slug] route. It sits OUTSIDE /services/ so it
 * cannot collide with the database-driven GrowthServices module.
 *
 * THE ONLY PODCAST PAGE (2026-09-07, Anil's call). There were three
 * URLs; there is now one. /solutions/podcasters and
 * /services/podcast-editing-and-growth-services both 308 here.
 *
 * The second of those was kept for a year on the theory that two pages
 * with different <title>s would not compete. That theory was never
 * tested against the page, which turned out to be empty — HTTP 200, no
 * <h1>, no <h2>, nav text only, and still `index, follow`. The lesson
 * worth keeping: a page only earns a URL when there is an offer behind
 * it. Cocoma sells one podcast engagement, so it gets one page. If
 * editing-only ever becomes a real product with its own price, that is
 * the moment a second page is justified — not before.
 *
 * Content, media and SEO all come from the API (admin panel → Podcast).
 * `getPodcastPage` resolves to null when the API is unreachable — including
 * during `next build`, where apiGet short-circuits by design — so the page
 * falls back to the copy it shipped with rather than rendering an empty shell.
 * On the site's single ranking target, stale beats blank.
 */

const PATH = `/${PODCAST_PAGE_SLUG}`;

/* Not force-static: the page body comes from the API, and the shared header
   and footer pull their nav from it too, so freezing this route would pin both
   to whatever the build saw and an editor's change would never reach it. Every
   other route on the site is dynamic for the same reason. */
export const dynamic = "force-dynamic";

/** The API payload, or the shipped copy when the API can't be reached. */
async function loadPage(): Promise<PodcastPageData> {
  return (await getPodcastPage()) ?? PODCAST_FALLBACK;
}

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await loadPage();

  return buildMetadata({
    title: seo.title,
    description: seo.description,
    path: PATH,
    category: "Services",
    canonical: seo.canonicalUrl || PATH,
    keywords: seo.keywords,
    secondaryKeywords: seo.secondaryKeywords.length
      ? seo.secondaryKeywords
      : undefined,
    noIndex: seo.noIndex,
    type: seo.openGraph.type,
    /* Every social override is passed only when the admin actually set it.
       buildMetadata owns the fallback chain — og:title inherits the
       site-suffixed page title, the X card inherits the OG title and image,
       and the image type is derived from the URL — so forwarding a resolved
       value here would override that chain with a subtly different answer. */
    ogTitle: seo.openGraph.title || undefined,
    ogDescription: seo.openGraph.description || undefined,
    /* buildMetadata always fills openGraph/twitter images from the site-wide
       default, which beats Next's file-based opengraph-image convention. Point
       it at the generated card explicitly so this page gets its own designed
       OG image rather than the generic cover. */
    image: seo.openGraph.image || `${PATH}/opengraph-image`,
    imageAlt: seo.openGraph.imageAlt || `${seo.title} - Cocoma Digital`,
    imageWidth: seo.openGraph.imageWidth,
    imageHeight: seo.openGraph.imageHeight,
    /* Only meaningful alongside a custom image. The generated card's URL has
       no file extension, and declaring a type that contradicts the bytes is
       worse than declaring none. */
    imageType: seo.openGraph.image ? seo.openGraph.imageType : undefined,
    twitterCard: seo.twitter.card,
    twitterTitle: seo.twitter.title || undefined,
    twitterDescription: seo.twitter.description || undefined,
    twitterImage: seo.twitter.image || undefined,
    twitterImageAlt: seo.twitter.imageAlt || undefined,
  });
}

export default async function Page() {
  const data = await loadPage();
  const { schema } = data.seo;

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${SITE_URL}${PATH}#service`,
    name: schema.name,
    serviceType: schema.serviceType,
    description: schema.description,
    url: absoluteUrl(PATH),
    provider: { "@id": `${SITE_URL}/#organization` },
    areaServed: schema.areaServed.map((name) => ({
      "@type": "Country",
      name,
    })),
    audience: {
      "@type": "Audience",
      audienceType: schema.audienceType,
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: schema.offerCatalogName,
      itemListElement: data.serviceCards.map((s) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: s.title,
          description: s.body,
        },
      })),
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE_URL}${PATH}#faq`,
    mainEntity: data.faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  /* No middle crumb: /service and /services both 404 — there is no
     services index page on this site — and a BreadcrumbList that emits a
     dead URL is worse than a two-level trail. */
  const breadcrumbSchema = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: schema.breadcrumbLabel, path: PATH },
  ]);

  return (
    <>
      <StructuredData data={[serviceSchema, faqSchema, breadcrumbSchema]} />
      <PodcastGrowthPage data={data} />
    </>
  );
}
