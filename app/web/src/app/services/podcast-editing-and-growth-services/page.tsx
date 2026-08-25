import type { Metadata } from "next";
import StructuredData from "@/src/components/common/StructuredData/StructuredData";
import PodcastGrowthPage from "@/src/views/Services/PodcastGrowth/PodcastGrowthPage";
import { FAQS, SERVICES } from "@/src/views/Services/PodcastGrowth/podcastGrowthData";
import {
  SITE_URL,
  absoluteUrl,
  breadcrumbJsonLd,
  buildMetadata,
  getStaticSeo,
} from "@/src/lib/seo";

/**
 * /services/podcast-editing-and-growth-services — canonical money page.
 *
 * This is a STATIC route segment that deliberately sits alongside the
 * dynamic /services/[slug] route. Next.js resolves static segments
 * before dynamic ones, so this file takes over the URL that was
 * previously rendered from the database `services` collection.
 *
 * That is intentional: this page is the single ranking target for
 * podcast queries, so its copy, schema and internal linking are
 * version-controlled and reviewed rather than editable from the admin.
 *
 * FOLLOW-UP FOR ANSHU: the old database record for this slug is now
 * unreachable but still exists. It should be deactivated so editors
 * don't change content that no longer renders — and because it carries
 * placeholder analytics figures that were never real.
 */

const PATH = "/services/podcast-editing-and-growth-services";

/* buildMetadata always fills openGraph/twitter images from the
   site-wide default, which beats Next's file-based opengraph-image
   convention. Point it at the generated card explicitly so this page
   gets its own designed OG image rather than the generic cover. */
export const metadata: Metadata = buildMetadata({
  ...getStaticSeo(PATH),
  image: `${PATH}/opengraph-image`,
  imageAlt:
    "Cocoma Digital — Podcast Editing & Growth Services: one recording becomes a multi-platform growth engine.",
});

/* Deliberately NOT force-static. The page body is a module constant so
   it costs nothing to render, but the shared header and footer pull
   their nav from the API — freezing this route would pin that nav to
   whatever the build saw, so an editor's change in the admin would
   never reach this page. Every other route on the site is dynamic for
   the same reason. */

export default function Page() {
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${SITE_URL}${PATH}#service`,
    name: "Podcast Editing & Growth Services",
    serviceType: "Podcast production, editing and growth",
    description:
      "Full-stack podcast production and growth: video and audio editing, short-form clipping, thumbnails and packaging, show notes and SEO, publishing, dubbing and localization, and analytics — operated as one system.",
    url: absoluteUrl(PATH),
    provider: { "@id": `${SITE_URL}/#organization` },
    areaServed: [
      { "@type": "Country", name: "India" },
      { "@type": "Country", name: "United States" },
      { "@type": "Country", name: "United Kingdom" },
      { "@type": "Country", name: "Canada" },
      { "@type": "Country", name: "Singapore" },
      { "@type": "Country", name: "Australia" },
    ],
    audience: {
      "@type": "Audience",
      audienceType:
        "Podcasters, founders and creators, brands running podcasts, OTT platforms and media networks in the United States, Canada and the United Kingdom",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Podcast production and growth services",
      itemListElement: SERVICES.map((s) => ({
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
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  /* No middle crumb: /service and /services both 404 — there is no
     services index page on this site — and a BreadcrumbList that emits a
     dead URL is worse than a two-level trail. */
  const breadcrumbSchema = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Podcast Editing & Growth Services", path: PATH },
  ]);

  return (
    <>
      <StructuredData data={[serviceSchema, faqSchema, breadcrumbSchema]} />
      <PodcastGrowthPage />
    </>
  );
}
